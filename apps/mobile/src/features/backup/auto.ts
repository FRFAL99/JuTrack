/**
 * Quando è ora di rifare il backup dei dati, e come si chiamano i file.
 *
 * **Tutto qui dentro è puro**: decide, non scrive. La scrittura vera sta in `folder.ts`,
 * che parla col modulo nativo e che su Node non si può provare. È la stessa divisione di
 * `notifications/backup.ts`, da cui questo file ricalca la forma dei segni — e per la
 * stessa ragione: quello che decide è quello che si può sbagliare in silenzio.
 *
 * **Non è il backup della chiave, ed è la distinzione che governa tutto il resto.** Quello
 * (Step 43) è una condizione che non torna più indietro: la `vaultKey` è generata una volta
 * e non cambia, quindi un backup fatto oggi vale per sempre. **Per i dati è falso**: un
 * backup di ieri invecchia a ogni spesa nuova. Ne discende che qui, a differenza di là, si
 * **riarma**: un gruppo che è stato salvato ci rientra appena passa la soglia.
 */

/** La chiave in `app_meta`. Una sola per tutti i gruppi, come per gli avvisi. */
export const AUTO_BACKUP_KEY = 'auto_backup';

/**
 * Ogni quanto riscrivere il file, in giorni.
 *
 * Sette: abbastanza raro da non far lavorare l'app a ogni apertura, abbastanza fitto da
 * non perdere più di una settimana di spese se il telefono sparisce. Non è una scadenza da
 * rispettare al minuto — il backup si scrive alla **prima apertura utile** dopo la soglia,
 * e le schermate devono dirlo con queste parole invece che con «automatico» e basta.
 */
export const BACKUP_EVERY_DAYS = 7;

/**
 * Quante copie tenere per gruppo.
 *
 * Tre, e non una: un file scritto sopra un altro è un file solo, e se la copia di oggi
 * fosse difettosa — un vault mezzo sincronizzato, un guasto a metà scrittura — sarebbe
 * l'unica rimasta. Tre coprono tre settimane e costano pochi megabyte.
 */
export const BACKUP_KEEP = 3;

/** Cosa si sa dell'ultimo backup di un gruppo. Assente = mai fatto. */
export interface BackupMark {
  /** Quando il file è stato scritto, in millisecondi. */
  lastBackupAt: number;
  /**
   * Quante spese c'erano dentro in quel momento.
   *
   * Non serve a questo file, serve all'avviso dello Step 66: la soglia di quello si misura
   * in **spese entrate dopo l'ultimo backup**, non in giorni, e senza questo numero non si
   * potrebbe calcolare. Si registra adesso perché registrarlo dopo vorrebbe dire non averlo
   * per i backup già fatti.
   */
  expenseCount: number;
}

export type BackupMarks = Record<string, BackupMark>;

/**
 * Rilegge i segni, **scartando uno per uno quelli che non si capiscono**.
 *
 * Stesso criterio di `parseBackupMarks` in `notifications/`, e con la stessa direzione
 * dell'errore: un segno illeggibile vale «mai fatto», perché sbagliare dall'altra parte
 * produrrebbe **silenzio su dei dati a rischio**. Un backup di troppo costa qualche
 * centinaio di kilobyte; uno mancante costa i dati.
 */
export function parseBackupMarks(raw: string | null): BackupMarks {
  if (raw === null) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};

  const clean: BackupMarks = {};
  for (const [vaultId, value] of Object.entries(parsed as Record<string, unknown>)) {
    const mark = readMark(value);
    if (mark !== null) clean[vaultId] = mark;
  }
  return clean;
}

function readMark(value: unknown): BackupMark | null {
  if (typeof value !== 'object' || value === null) return null;
  const { lastBackupAt, expenseCount } = value as Record<string, unknown>;
  if (typeof lastBackupAt !== 'number' || !Number.isFinite(lastBackupAt) || lastBackupAt <= 0) {
    return null;
  }
  const count = typeof expenseCount === 'number' && expenseCount >= 0 ? expenseCount : 0;
  return { lastBackupAt, expenseCount: count };
}

export function serializeBackupMarks(marks: BackupMarks): string {
  return JSON.stringify(marks);
}

/** Butta via i segni dei gruppi che non ci sono più, come `pruneBackupMarks` degli avvisi. */
export function pruneBackupMarks(
  marks: BackupMarks,
  knownVaultIds: readonly string[],
): BackupMarks {
  const known = new Set(knownVaultIds);
  const kept: BackupMarks = {};
  for (const [vaultId, mark] of Object.entries(marks)) {
    if (known.has(vaultId)) kept[vaultId] = mark;
  }
  return kept;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export interface AutoBackupReview {
  /** I gruppi da salvare adesso, nell'ordine in cui sono stati passati. */
  due: string[];
  /** I segni già potati dei gruppi spariti: si riscrivono anche senza un backup da fare. */
  marks: BackupMarks;
  /** Falso quando i segni sono identici a prima: evita di riscrivere `app_meta` a vuoto. */
  changed: boolean;
}

/**
 * Quali gruppi hanno bisogno di un backup adesso.
 *
 * **Non aggiorna i segni dei gruppi che restituisce**, e non è una dimenticanza: il segno
 * va scritto quando il file è **finito sul disco**, non quando si è deciso di scriverlo.
 * Segnarlo qui vorrebbe dire che una scrittura fallita — cartella revocata, spazio finito —
 * spegnerebbe il backup per altri sette giorni, in silenzio, proprio dopo aver fallito. È
 * lo stesso criterio per cui `/backup` chiama `recordBackup` solo a cifratura riuscita.
 *
 * L'unica cosa che cambia qui è la **potatura**: un gruppo che non esiste più non tornerà, e
 * il suo segno resterebbe per sempre in una tabella che nessuno guarda.
 */
export function reviewAutoBackup(args: {
  /** I gruppi sul telefono, nell'ordine in cui vanno salvati. */
  vaultIds: readonly string[];
  marks: BackupMarks;
  nowMs: number;
  /** Ogni quanti giorni. Iniettabile per i test e per un domani in cui si scegliesse. */
  everyDays?: number;
}): AutoBackupReview {
  const { vaultIds, marks, nowMs } = args;
  const everyDays = args.everyDays ?? BACKUP_EVERY_DAYS;

  const pruned = pruneBackupMarks(marks, vaultIds);
  const due = vaultIds.filter((vaultId) => {
    const mark = pruned[vaultId];
    // Mai salvato: si salva subito. Un gruppo nuovo è anche quello che si perderebbe più
    // facilmente, perché nessuno ha ancora pensato a metterlo al sicuro.
    if (mark === undefined) return true;
    // Un segno nel futuro — orologio spostato all'indietro — non deve bloccare il backup
    // per anni: `>=` non basterebbe, quindi si guarda il valore assoluto dello scarto.
    return Math.abs(nowMs - mark.lastBackupAt) >= everyDays * DAY_MS;
  });

  return {
    due: [...due],
    marks: pruned,
    changed: serializeBackupMarks(marks) !== serializeBackupMarks(pruned),
  };
}

/** Registra che il file di un gruppo è stato scritto davvero. */
export function markBackedUp(
  marks: BackupMarks,
  vaultId: string,
  nowMs: number,
  expenseCount: number,
): BackupMarks {
  return { ...marks, [vaultId]: { lastBackupAt: nowMs, expenseCount } };
}

/* -------------------------------------------------------------------------- */
/* I nomi dei file                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Il nome di un gruppo, ridotto a qualcosa che si può usare come nome di file.
 *
 * **Serve perché un nome di gruppo è testo libero, e un nome di file no.** Il modulo nativo
 * rifiuta `/` e `\` (`validateFileSystemChildName`), e i filesystem che stanno sotto a una
 * cartella SAF — una scheda SD in FAT32, una cartella sincronizzata da Windows — rifiutano
 * anche `: * ? " < > |`. Un gruppo chiamato «Casa/Ufficio» farebbe altrimenti fallire il
 * backup **in silenzio**, e proprio quello: gli altri gruppi continuerebbero a salvarsi.
 *
 * Quello che resta è ASCII minuscolo, cifre e trattini. Le accentate si perdono — «Perù»
 * diventa «per» — ed è accettabile: il nome vero è **dentro** il file dallo Step 63, e
 * questo serve solo a distinguere i file in una cartella.
 */
export function fileSlug(name: string): string {
  const stripped = name
    .normalize('NFD')
    // Via i segni diacritici: `Perù` → `Peru`, invece di perdere la lettera intera.
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Un nome fatto solo di emoji o di ideogrammi si riduce a niente: meglio troncare a una
  // lunghezza ragionevole che produrre nomi lunghissimi, e meglio vuoto che inventato.
  return stripped.slice(0, 40);
}

/**
 * `jutrack-<gruppo>-<AAAA-MM-GG>.json`, con l'id come ripiego.
 *
 * L'id compare quando lo slug resta vuoto — un gruppo chiamato solo con emoji — perché due
 * file che si chiamassero entrambi `jutrack--2026-09-13.json` sarebbero indistinguibili, e
 * la potatura ne cancellerebbe uno credendo di cancellare una copia vecchia dell'altro.
 */
export function backupFileName(groupName: string, vaultId: string, now: Date): string {
  const slug = fileSlug(groupName);
  const label = slug === '' ? vaultId.slice(0, 8) : slug;
  const pad = (value: number): string => String(value).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return `jutrack-${label}-${stamp}.json`;
}

/** Il prefisso che accomuna tutte le copie di un gruppo, per riconoscerle nella cartella. */
export function backupFilePrefix(groupName: string, vaultId: string): string {
  const slug = fileSlug(groupName);
  return `jutrack-${slug === '' ? vaultId.slice(0, 8) : slug}-`;
}

/**
 * Quali file cancellare per tenerne solo gli ultimi `keep`.
 *
 * **Ordina per nome e non per data di modifica**, ed è deliberato: il nome porta la data
 * civile nel formato che si ordina da solo, mentre la data di modifica di un file dentro
 * una cartella SAF la decide il fornitore di documenti — e una cartella sincronizzata da
 * Drive o da Nextcloud la riscrive quando le pare. Il nome invece lo abbiamo scritto noi.
 *
 * Un file che porta il prefisso giusto ma una coda che non è una data resta **fuori
 * dall'elenco dei candidati**: è roba di qualcun altro, e questa funzione non cancella
 * quello che non ha scritto.
 */
export function filesToPrune(names: readonly string[], prefix: string, keep: number): string[] {
  const mine = names
    .filter(
      (name) =>
        name.startsWith(prefix) && /^\d{4}-\d{2}-\d{2}\.json$/.test(name.slice(prefix.length)),
    )
    .sort();

  return mine.slice(0, Math.max(0, mine.length - keep));
}
