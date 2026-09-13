/**
 * Export in JSON — la copia integrale, senza perdite.
 *
 * Il `.xlsx` serve a leggere i dati altrove; questo serve a **non perderli**. Contiene
 * tutto ciò che il vault sa, tombstone compresi, nella stessa forma che ha in memoria:
 * importi in centesimi interi, date ISO, id originali. **È l'unico dei due che rientra.**
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
 * - **4** — ci sono `groupName` e `app`. Sono **metadati, non record**: un file di versione
 *   3 resta leggibile e vale come `null` per entrambi, esattamente come un file v1 vale
 *   `''` e `[]` per `store` e `tags`.
 * - **3** — c'è il `vocabulary` del gruppo: l'elenco di tag e negozi proponibili. Un file
 *   di versione 2 resta leggibile e vale come elenco vuoto — le spese portano comunque le
 *   loro parole, quindi non si perde nulla se non i suggerimenti, che si riadottano dal
 *   blocco «già usati» della schermata di gestione.
 * - **2** — le spese hanno `store` e `tags`. Un file di versione 1 resta leggibile: i due
 *   campi vanno letti come `''` e `[]`, come già fa `readExpense` sui record vecchi.
 * - **1** — la forma iniziale.
 */
export const EXPORT_FORMAT_VERSION = 4;

export const EXPORT_FORMAT_NAME = 'jutrack-export';

export interface VaultExport extends VaultSnapshot {
  format: typeof EXPORT_FORMAT_NAME;
  version: number;
  /** Istante ISO 8601 in cui il file è stato prodotto. */
  exportedAt: string;
  /**
   * Il nome del gruppo, `null` se non gliene è stato dato uno.
   *
   * **Arriva come parametro e non dallo snapshot**, ed è deliberato: il nome sta in `meta`
   * dentro il documento Yjs, mentre `VaultSnapshot` è la fotografia dei soli record.
   * Metterlo dentro la fotografia farebbe dipendere il modello dall'export invece del
   * contrario — la stessa ragione per cui `VaultSnapshot` vive in `model/types.ts`.
   */
  groupName: string | null;
  /**
   * La versione dell'app che ha prodotto il file, `null` se non si sa.
   *
   * Non serve a leggere il file — a quello basta `version` — ma a rispondere alla domanda
   * che ci si fa davanti a un file che si comporta male: «con che cosa è stato scritto?».
   */
  app: string | null;
}

export interface JsonExportOptions {
  /** Istante da registrare nel file. Iniettabile per rendere i test deterministici. */
  now?: () => Date;
  /** Indentazione. `0` per il file più compatto. Default: `2`. */
  indent?: number;
  /** Il nome del gruppo, da `VaultStore.getGroupName()`. */
  groupName?: string | null;
  /** La versione dell'app, da `Constants.expoConfig?.version`. */
  app?: string | null;
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
    // Una stringa vuota vale quanto un nome assente: chi legge non deve distinguere due
    // modi di dire «non si sa».
    groupName:
      options.groupName === undefined || options.groupName === '' ? null : options.groupName,
    app: options.app === undefined || options.app === '' ? null : options.app,
    expenses: snapshot.expenses,
    categories: snapshot.categories,
    members: snapshot.members,
    budgets: snapshot.budgets,
    settlements: snapshot.settlements,
    vocabulary: snapshot.vocabulary,
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
