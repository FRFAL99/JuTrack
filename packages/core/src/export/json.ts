/**
 * Export in JSON — la copia integrale, senza perdite.
 *
 * Il CSV serve a leggere i dati altrove; questo serve a **non perderli**. Contiene tutto
 * ciò che il vault sa, tombstone compresi, nella stessa forma che ha in memoria: importi
 * in centesimi interi, date ISO, id originali.
 *
 * Attenzione a cosa **non** c'è: la chiave del vault. Questo file è in chiaro, e mescolarci
 * la chiave significherebbe che chiunque lo riceva può leggere anche tutto il resto, per
 * sempre. Il backup della chiave è un'altra cosa, sta in `crypto/backup.ts` ed è cifrato
 * con una passphrase.
 */
import type { VaultSnapshot } from '../model/types';

/**
 * Versione del formato d'export.
 *
 * Va alzata quando cambia la forma dei record. Un domani il reimport dovrà saper leggere
 * anche i file vecchi, ed è il campo che glielo permette.
 *
 * - **2** — le spese hanno `store` e `tags`. Un file di versione 1 resta leggibile: i due
 *   campi vanno letti come `''` e `[]`, come già fa `readExpense` sui record vecchi.
 * - **1** — la forma iniziale.
 */
export const EXPORT_FORMAT_VERSION = 2;

export const EXPORT_FORMAT_NAME = 'jutrack-export';

export interface VaultExport extends VaultSnapshot {
  format: typeof EXPORT_FORMAT_NAME;
  version: number;
  /** Istante ISO 8601 in cui il file è stato prodotto. */
  exportedAt: string;
}

export interface JsonExportOptions {
  /** Istante da registrare nel file. Iniettabile per rendere i test deterministici. */
  now?: () => Date;
  /** Indentazione. `0` per il file più compatto. Default: `2`. */
  indent?: number;
}

/** Costruisce l'oggetto d'export, senza serializzarlo. */
export function buildVaultExport(
  snapshot: VaultSnapshot,
  options: JsonExportOptions = {},
): VaultExport {
  const now = options.now ?? ((): Date => new Date());
  return {
    format: EXPORT_FORMAT_NAME,
    version: EXPORT_FORMAT_VERSION,
    exportedAt: now().toISOString(),
    expenses: snapshot.expenses,
    categories: snapshot.categories,
    members: snapshot.members,
    budgets: snapshot.budgets,
    settlements: snapshot.settlements,
  };
}

/**
 * Serializza il vault in JSON.
 *
 * Indentato di default: il file lo apre una persona, non un servizio, e la differenza di
 * dimensione su qualche migliaio di spese è irrilevante rispetto al poterlo leggere.
 */
export function toJsonExport(snapshot: VaultSnapshot, options: JsonExportOptions = {}): string {
  return JSON.stringify(buildVaultExport(snapshot, options), null, options.indent ?? 2) + '\n';
}
