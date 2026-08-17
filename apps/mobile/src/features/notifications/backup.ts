/**
 * Quando una chiave mai salvata merita un avviso, e cosa dice.
 *
 * **È il quarto avviso, e ha una forma che gli altri tre non hanno.** Il promemoria (31) è
 * una **scadenza**, il budget (32) una **condizione**, la sincronizzazione ferma (33) una
 * condizione **su una scadenza**. Questo è una condizione **che non torna più indietro**, e
 * la differenza viene da un fatto crittografico: la `vaultKey` è generata una volta sola
 * quando il gruppo nasce e **non cambia mai**. Un backup fatto oggi vale per sempre.
 *
 * Ne discendono le due regole che rendono questo file più corto degli altri tre:
 *
 * - **Non c'è niente da riarmare.** Salvata la chiave, il gruppo esce dal giro e non ci
 *   rientra: non esiste un «il backup è scaduto», perché la cosa salvata non invecchia. È
 *   l'opposto del promemoria spese, che si riprogramma a ogni apertura.
 * - **Non c'è un livello che sale.** Budget e sync hanno due gradini (`near`/`over`,
 *   `stalled`/`stopped`); qui lo stato è binario — o la chiave è al sicuro, o non lo è.
 *
 * **Perché è il rischio peggiore dell'app, e per questo esiste.** Perdere il telefono senza
 * la chiave non è come perdere un file: non c'è un «password dimenticata» da nessuna parte,
 * il relay conserva blob che non sa leggere, e nessuno — noi compresi — può recuperare
 * niente. È scritto in cima a `/backup`, ma **lo legge solo chi apre `/backup`**, cioè
 * esattamente chi il backup lo sta già facendo. Questo avviso serve a raggiungere gli altri.
 *
 * **La soglia è in spese, non in giorni.** Un gruppo creato ieri e ancora vuoto non ha
 * niente da perdere, e avvisare subito insegnerebbe a ignorare l'avviso proprio prima che
 * diventi vero. Quello che si rischia si misura in quanto c'è dentro.
 *
 * **Il limite onesto, che va detto qui perché non si scopra dopo.** L'app sa dei backup che
 * ha visto fare: `/backup` scrive un segno quando la cifratura riesce, e prima dello Step 43
 * quel segno non lo scriveva nessuno. Un gruppo salvato l'anno scorso, su una versione che
 * non teneva il conto, risulta «mai salvato» — e l'avviso lo dirà. È il motivo per cui il
 * testo dice «su questo telefono non risulta», che è vero in entrambi i casi, invece di
 * «non hai mai salvato», che sarebbe falso in uno dei due. L'errore va in questa direzione
 * di proposito: un avviso di troppo fa controllare, uno mancante fa perdere dei dati.
 */
import type { KeyValueStore } from '@/platform/app-meta';
import type { AlertContent } from './content';

/** La chiave in `app_meta`. Una sola per tutti i gruppi. */
export const BACKUP_MARKS_KEY = 'backup_alerts';

/**
 * Da quante spese in su un gruppo ha qualcosa da perdere.
 *
 * Cinque: abbastanza da essere una serata di conti che nessuno ha voglia di riscrivere, e
 * poche abbastanza da arrivare mentre il gruppo è ancora giovane — cioè quando salvare la
 * chiave costa un minuto e non si è ancora accumulato niente di irreparabile. La legge anche
 * la riga sotto l'interruttore in Tu, invece di riscriverla a mano lì.
 */
export const BACKUP_MIN_EXPENSES = 5;

/** Cosa si sa del backup di un gruppo. Assente = mai visto salvare, mai avvisato. */
export interface BackupMark {
  /**
   * Quando `/backup` ha cifrato la chiave con successo, in millisecondi. `null` = mai visto.
   *
   * Si conserva l'istante e non un booleano perché è l'unica cosa che permette di dire, un
   * giorno, «salvata a marzo» in una schermata — e costa gli stessi byte.
   */
  savedAt: number | null;
  /** Se l'avviso per questo gruppo è già partito. Uno per gruppo, non uno al giorno. */
  notified: boolean;
}

/** Per `vaultId`: ogni gruppo ha la sua chiave, quindi il suo backup. */
export type BackupMarks = Record<string, BackupMark>;

/**
 * Rilegge i segni, **scartando uno per uno quelli che non si capiscono**.
 *
 * Stesso criterio di `parseSyncMarks` e `parseMarks`, ma con la direzione dell'errore
 * rovesciata, ed è deliberato: là un segno illeggibile vale «episodio mai visto» perché
 * sbagliare di là produrrebbe un avviso su un guasto finito; qui un segno illeggibile vale
 * «chiave mai salvata», perché sbagliare di là produrrebbe **silenzio su una chiave a
 * rischio**. Fra un avviso di troppo e dei dati persi non c'è partita.
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
  const { savedAt, notified } = value as Record<string, unknown>;
  const saved =
    typeof savedAt === 'number' && Number.isFinite(savedAt) && savedAt > 0 ? savedAt : null;
  return { savedAt: saved, notified: notified === true };
}

export function serializeBackupMarks(marks: BackupMarks): string {
  return JSON.stringify(marks);
}

/**
 * Butta via i segni dei gruppi che non ci sono più.
 *
 * Come `pruneSyncMarks`: uscire da un gruppo lascerebbe una riga per sempre dentro una
 * tabella che nessuno guarda. Qui c'è una ragione in più — un `vaultId` che torna (si esce
 * da un gruppo e si rientra con lo stesso invito) deve ripartire da «mai salvato», perché
 * dopo `forget` la chiave su questo telefono è stata cancellata davvero.
 */
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

/** Un gruppo che ha superato la soglia senza che la sua chiave sia mai stata salvata. */
export interface BackupAlert {
  vaultId: string;
  /** Quante spese ci sono dentro: è la misura di ciò che si perderebbe. */
  expenseCount: number;
}

export interface BackupReview {
  /** `null` nel caso normale, che è quasi sempre. */
  alert: BackupAlert | null;
  marks: BackupMarks;
  /** Falso quando i segni sono identici a prima: evita di riscrivere `app_meta` a vuoto. */
  changed: boolean;
}

/**
 * Il gruppo aperto ha una chiave a rischio?
 *
 * Le regole, e il modo di sbagliare che ciascuna chiude:
 *
 * - **Una chiave salvata esce dal giro per sempre.** Non c'è scadenza da riarmare: la
 *   `vaultKey` non cambia, quindi il backup non invecchia.
 * - **Sotto soglia non si dice niente**, e non si registra niente: un gruppo appena creato
 *   non deve consumare l'unico avviso che ha a disposizione.
 * - **Un avviso per gruppo.** Ripetere «non hai salvato la chiave» a ogni apertura è il modo
 *   più rapido di far spegnere l'interruttore, e la stessa frase resta comunque leggibile in
 *   `/backup` per chi ci torna.
 *
 * **La funzione non sa se l'interruttore è acceso, ed è voluto**, come per budget e sync: i
 * segni si tengono aggiornati comunque, o riaccenderlo racconterebbe da capo una cosa che si
 * era scelto di non farsi raccontare. A decidere se l'`alert` diventa una notifica è chi
 * chiama.
 */
export function reviewBackup(args: {
  vaultId: string;
  expenseCount: number;
  marks: BackupMarks;
  /** I gruppi che esistono ancora su questo telefono: tutto il resto si pota. */
  knownVaultIds: readonly string[];
}): BackupReview {
  const { vaultId, expenseCount, marks, knownVaultIds } = args;

  const pruned = pruneBackupMarks(marks, knownVaultIds);
  const mark = pruned[vaultId] ?? { savedAt: null, notified: false };

  const quiet = (): BackupReview => settle(marks, pruned, null);

  if (mark.savedAt !== null) return quiet();
  if (expenseCount < BACKUP_MIN_EXPENSES) return quiet();
  if (mark.notified) return quiet();

  return settle(
    marks,
    { ...pruned, [vaultId]: { ...mark, notified: true } },
    { vaultId, expenseCount },
  );
}

/**
 * Registra che la chiave di un gruppo è stata salvata davvero.
 *
 * La chiama `/backup` **solo quando la cifratura è riuscita**, non quando la schermata si
 * apre: un backup cominciato e abbandonato a metà non è un backup, e segnarlo qui
 * spegnerebbe l'avviso su una chiave che è ancora solo dentro questo telefono.
 */
export function markBackedUp(marks: BackupMarks, vaultId: string, nowMs: number): BackupMarks {
  const mark = marks[vaultId] ?? { savedAt: null, notified: false };
  return { ...marks, [vaultId]: { ...mark, savedAt: nowMs } };
}

/**
 * Scrive il segno su disco. Un unico punto, così `/backup` non conosce la forma dei dati.
 *
 * Non attende e non fallisce a vista da chi chiama: se la scrittura non riuscisse, l'avviso
 * potrebbe ripartire una volta di troppo — un fastidio, non un dato perso — e non vale
 * bloccare il messaggio di «backup creato» per questo.
 */
export async function recordBackup(
  meta: KeyValueStore,
  vaultId: string,
  nowMs: number = Date.now(),
): Promise<void> {
  const marks = parseBackupMarks(await meta.get(BACKUP_MARKS_KEY));
  await meta.set(BACKUP_MARKS_KEY, serializeBackupMarks(markBackedUp(marks, vaultId, nowMs)));
}

function settle(before: BackupMarks, after: BackupMarks, alert: BackupAlert | null): BackupReview {
  return {
    alert,
    marks: after,
    changed: serializeBackupMarks(before) !== serializeBackupMarks(after),
  };
}

/**
 * Cosa c'è scritto nella tendina.
 *
 * **Il nome del gruppo c'è sempre**, come nell'avviso di sincronizzazione: con più gruppi sul
 * telefono, «la chiave non è salvata» senza dire *quale* obbliga ad aprire l'app per
 * scoprirlo — e qui il rimedio è per gruppo, perché ogni gruppo ha la sua chiave.
 *
 * **«Non risulta» e non «non hai salvato»**, per la ragione scritta in cima a questo file:
 * l'app conosce i backup che ha visto fare, e su un gruppo salvato prima che esistesse
 * questo conto la seconda frase sarebbe falsa. Il numero di spese c'è perché è la
 * differenza fra un avviso e un rimprovero: dice **cosa** si perderebbe.
 */
export function backupContent(alert: BackupAlert, groupName: string): AlertContent {
  return {
    title: 'Chiave non salvata',
    body:
      `«${groupName}» ha ${alert.expenseCount} spese e su questo telefono non risulta un ` +
      'backup della sua chiave. Senza, se perdi il telefono non tornano: nessuno può recuperarle.',
  };
}
