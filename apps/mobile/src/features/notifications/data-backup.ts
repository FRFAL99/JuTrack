/**
 * Quando il backup dei **dati** merita un avviso, e cosa dice.
 *
 * **È il quinto avviso, ed è di una forma che i primi quattro non hanno.** Il commento in
 * cima a `backup.ts` classifica gli altri: il promemoria (31) è una **scadenza**, il budget
 * (32) una **condizione**, la sincronizzazione ferma (33) una condizione **su una
 * scadenza**, la chiave non salvata (43) una condizione **che non torna più indietro** —
 * «un backup fatto oggi vale per sempre», perché la `vaultKey` è generata una volta e non
 * cambia mai.
 *
 * **Per i dati quella frase è falsa**, ed è tutto ciò che distingue questo file da quello.
 * Un backup di ieri invecchia a ogni spesa nuova, quindi:
 *
 * - **si riarma.** Fatto un backup, il gruppo esce dal giro; alla soglia successiva ci
 *   rientra. Copiare `backup.ts` avrebbe importato la regola «salvato una volta, fuori dal
 *   giro per sempre», che qui è esattamente il difetto da evitare.
 * - **la soglia è in spese entrate dopo l'ultimo backup, non in giorni.** Un gruppo fermo da
 *   due mesi non ha niente da salvare, e avvisarlo insegnerebbe a ignorare l'avviso proprio
 *   prima che diventi vero. È lo stesso criterio dello Step 43 — «quello che si rischia si
 *   misura in quanto c'è dentro» — applicato a un bersaglio che si muove.
 *
 * **I segni li scrive il backup, non questo file.** `features/backup/auto.ts` registra
 * `lastBackupAt` e `expenseCount` a ogni file finito sul disco: `expenseCount` è lì proprio
 * per questo avviso, ed è il motivo per cui è stato registrato fin dallo Step 65 invece che
 * adesso. Qui si tiene solo il proprio segno di «già avvisato», che è una cosa diversa e
 * che non deve sopravvivere a un backup nuovo.
 */
import { plural, t } from '@/i18n/translate';
import type { BackupMarks } from '@/features/backup/auto';
import type { AlertContent } from './content';

/** La chiave in `app_meta`. Separata da quella dei backup, che la scrive un altro modulo. */
export const DATA_BACKUP_ALERTS_KEY = 'data_backup_alerts';

/**
 * Quante spese non salvate bastano a meritare un avviso.
 *
 * Venti, contro le cinque dello Step 43, e la differenza è voluta. Là la soglia era «questo
 * gruppo ha qualcosa da perdere», e si attraversa una volta sola nella vita del gruppo. Qui
 * si riattraversa in continuazione, e una soglia bassa produrrebbe un avviso ogni pochi
 * giorni — cioè il modo più rapido di far spegnere l'interruttore, che è il solo esito
 * peggiore del non avvisare affatto.
 */
export const DATA_BACKUP_MIN_NEW = 20;

/** Se di un gruppo è già stato dato l'avviso, e per quale backup. */
export interface DataBackupMark {
  /**
   * Il `lastBackupAt` che valeva quando si è avvisato. `0` = non si era mai fatto un backup.
   *
   * **È questo campo a far riarmare l'avviso**, ed è il motivo per cui non è un booleano:
   * un backup nuovo cambia `lastBackupAt`, quindi il confronto non torna più e il gruppo
   * rientra nel giro. Un `notified: true` avrebbe silenziato il gruppo per sempre.
   */
  warnedFor: number;
}

export type DataBackupMarks = Record<string, DataBackupMark>;

/**
 * Rilegge i segni, scartando uno per uno quelli illeggibili.
 *
 * **La direzione dell'errore è l'opposta di `backup.ts`, ed è deliberato.** Là un segno
 * illeggibile vale «chiave mai salvata», perché sbagliare dall'altra parte produrrebbe
 * silenzio su una chiave a rischio. Qui vale «mai avvisato», che porta al massimo a un
 * avviso ripetuto una volta: il dato non è a rischio — il backup lo fa `auto.ts`, non
 * questo file — e il solo danno possibile è il fastidio.
 */
export function parseDataBackupMarks(raw: string | null): DataBackupMarks {
  if (raw === null) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};

  const clean: DataBackupMarks = {};
  for (const [vaultId, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value !== 'object' || value === null) continue;
    const { warnedFor } = value as Record<string, unknown>;
    if (typeof warnedFor !== 'number' || !Number.isFinite(warnedFor) || warnedFor < 0) continue;
    clean[vaultId] = { warnedFor };
  }
  return clean;
}

export function serializeDataBackupMarks(marks: DataBackupMarks): string {
  return JSON.stringify(marks);
}

/** Butta via i segni dei gruppi che non ci sono più, come gli altri avvisi. */
export function pruneDataBackupMarks(
  marks: DataBackupMarks,
  knownVaultIds: readonly string[],
): DataBackupMarks {
  const known = new Set(knownVaultIds);
  const kept: DataBackupMarks = {};
  for (const [vaultId, mark] of Object.entries(marks)) {
    if (known.has(vaultId)) kept[vaultId] = mark;
  }
  return kept;
}

export interface DataBackupAlert {
  vaultId: string;
  /** Quante spese non sono nel backup: è la misura di ciò che si perderebbe. */
  newExpenses: number;
  /** `true` quando di quel gruppo non risulta nessun backup. Cambia la frase, non la soglia. */
  never: boolean;
}

export interface DataBackupReview {
  alert: DataBackupAlert | null;
  marks: DataBackupMarks;
  changed: boolean;
}

/**
 * Il gruppo aperto ha troppe spese fuori dal backup?
 *
 * Le regole, e il modo di sbagliare che ciascuna chiude:
 *
 * - **Sotto soglia non si dice niente, e non si registra niente.** Un gruppo appena
 *   salvato non deve consumare il proprio avviso.
 * - **Un avviso per backup, non uno al giorno.** Ripetere la stessa frase a ogni apertura è
 *   il modo più rapido di far spegnere l'interruttore.
 * - **Un backup nuovo riarma.** È la sola differenza con lo Step 43, e sta tutta nel
 *   confronto fra `warnedFor` e `lastBackupAt`.
 *
 * **Non sa se l'interruttore è acceso, ed è voluto**, come per gli altri quattro: i segni si
 * tengono aggiornati comunque, o riaccenderlo racconterebbe da capo una cosa che si era
 * scelto di non farsi raccontare. A decidere se l'`alert` diventa una notifica è chi chiama.
 */
export function reviewDataBackup(args: {
  vaultId: string;
  /** Le spese vive del gruppo aperto, adesso. */
  expenseCount: number;
  /** I segni scritti dal backup automatico: `lastBackupAt` e il conteggio di allora. */
  backupMarks: BackupMarks;
  marks: DataBackupMarks;
  knownVaultIds: readonly string[];
  minNew?: number;
}): DataBackupReview {
  const { vaultId, expenseCount, backupMarks, marks, knownVaultIds } = args;
  const minNew = args.minNew ?? DATA_BACKUP_MIN_NEW;

  const pruned = pruneDataBackupMarks(marks, knownVaultIds);
  const quiet = (): DataBackupReview => settle(marks, pruned, null);

  const backup = backupMarks[vaultId];
  const lastBackupAt = backup?.lastBackupAt ?? 0;

  // Quante spese sono entrate dopo l'ultimo backup. Senza backup, tutte.
  //
  // Il `Math.max` non è prudenza generica: se da allora se ne fossero **cancellate** più di
  // quante ne sono entrate, la differenza sarebbe negativa — e un numero negativo qui
  // finirebbe dritto dentro la frase dell'avviso.
  const newExpenses = Math.max(0, expenseCount - (backup?.expenseCount ?? 0));

  if (newExpenses < minNew) return quiet();

  // Già avvisato **per questo backup**. Un backup nuovo cambia `lastBackupAt` e riapre.
  if (pruned[vaultId]?.warnedFor === lastBackupAt) return quiet();

  return settle(
    marks,
    { ...pruned, [vaultId]: { warnedFor: lastBackupAt } },
    { vaultId, newExpenses, never: backup === undefined },
  );
}

function settle(
  before: DataBackupMarks,
  after: DataBackupMarks,
  alert: DataBackupAlert | null,
): DataBackupReview {
  return {
    alert,
    marks: after,
    changed: serializeDataBackupMarks(before) !== serializeDataBackupMarks(after),
  };
}

/**
 * Cosa c'è scritto nella tendina.
 *
 * **Il nome del gruppo c'è sempre**, come negli avvisi di sync e di chiave: con più gruppi
 * sul telefono, «il backup sta invecchiando» senza dire *quale* obbliga ad aprire l'app per
 * scoprirlo.
 *
 * **Due frasi diverse per due situazioni diverse.** «Non risulta nessun backup» è un invito
 * a sceglierne la cartella; «venti spese non sono nel backup» è un invito a farne uno
 * adesso. Dirle con la stessa frase manderebbe chi non ha ancora scelto una cartella a
 * cercare un bottone che per lui non esiste.
 */
export function dataBackupContent(alert: DataBackupAlert, groupName: string): AlertContent {
  return {
    title: t('notifications.dataBackup.title'),
    body: alert.never
      ? t('notifications.dataBackup.never', {
          name: groupName,
          count: plural('groups.expenseCount', alert.newExpenses),
        })
      : t('notifications.dataBackup.stale', {
          name: groupName,
          count: plural('groups.expenseCount', alert.newExpenses),
        }),
  };
}
