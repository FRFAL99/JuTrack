/**
 * La cartella in cui il backup automatico scrive, scelta una volta sola.
 *
 * **Il permesso è persistente, e questo è ciò che rende possibile tutto lo step.** Su
 * Android `Directory.pickDirectoryAsync()` apre il selettore di cartelle di sistema, e il
 * modulo chiama `takePersistableUriPermission` sull'URI scelto
 * (`expo-file-system/android/…/FilePickerContract.kt:48`): l'accesso sopravvive alla
 * chiusura dell'app e al riavvio del telefono. Senza quello, «scegli una cartella» sarebbe
 * un gesto da ripetere a ogni backup, cioè niente di automatico.
 *
 * **Quello che si ottiene è un `content://`, non un `file:///`**, e non è un dettaglio:
 *
 * ```
 * fun create(options: CreateOptions = CreateOptions()) {
 *   if (uri.isContentUri) {
 *     throw UnableToCreateException("File.create function does not work with SAF
 *       content:// uris, use `Directory.createFile` instead")
 * ```
 *
 * È `FileSystemFile.kt:44-47` del modulo nativo, verbatim. **`new File(dir, nome).create()`
 * lancia**, ed è esattamente quello che fa `features/export/share.ts` per il file di
 * transito in cache — dove funziona, perché la cache è un `file:///`. Qui no: si passa da
 * **`Directory.createFile(nome, mimeType)`**, che è il metodo che quel messaggio d'errore
 * indica. Anche `File.write()` è coinvolto, perché chiama `create()` quando il file non
 * esiste ancora: si scrive **sul file restituito da `createFile`**, che a quel punto esiste.
 *
 * Il resto del modulo è impianto: caricamento pigro del nativo, `try/catch` attorno alle
 * chiamate — non solo attorno al `require`, per la ragione scritta in
 * `features/import/pick.ts`. Le decisioni stanno in `auto.ts`, che è puro e ha i test.
 */
import type * as ExpoFileSystem from 'expo-file-system';
import { markError } from '@/diagnostics';
import type { KeyValueStore } from '@/platform/app-meta';

type FileSystemModule = typeof ExpoFileSystem;

/** La chiave in `app_meta`: l'URI della cartella concessa. Una sola per il telefono. */
export const BACKUP_FOLDER_KEY = 'backup_folder_uri';

// `undefined` = mai tentato, `null` = tentato e non disponibile.
let cachedFileSystem: FileSystemModule | null | undefined;

function loadFileSystemModule(): FileSystemModule | null {
  if (cachedFileSystem !== undefined) return cachedFileSystem;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedFileSystem = require('expo-file-system') as FileSystemModule;
  } catch (error) {
    markError('expo-file-system non disponibile', error);
    cachedFileSystem = null;
  }
  return cachedFileSystem;
}

/**
 * Il selettore di cartelle risponde su questo telefono?
 *
 * Come per `pickFileAsync`: non basta che il modulo si carichi, serve che ci sia anche la
 * funzione. La build nativa installata può essere più vecchia del JavaScript che le arriva
 * via etere, e in quel caso l'intera sezione «Dati» deve dire che qui non si può fare.
 */
export function isFolderPickerAvailable(): boolean {
  const fs = loadFileSystemModule();
  return fs !== null && typeof fs.Directory?.pickDirectoryAsync === 'function';
}

export type FolderChoice =
  | { status: 'chosen'; uri: string }
  | { status: 'cancelled' }
  | { status: 'unavailable' }
  | { status: 'failed'; error: unknown };

/** Apre il selettore di cartelle e restituisce l'URI concesso. */
export async function chooseFolder(): Promise<FolderChoice> {
  const fs = loadFileSystemModule();
  if (fs === null) return { status: 'unavailable' };

  try {
    if (typeof fs.Directory?.pickDirectoryAsync !== 'function') return { status: 'unavailable' };

    const directory = await fs.Directory.pickDirectoryAsync();
    // Chiudere il selettore senza scegliere non è un guasto, come in `pick.ts`.
    if (directory === null || directory === undefined) return { status: 'cancelled' };

    return { status: 'chosen', uri: directory.uri };
  } catch (error) {
    markError('scelta della cartella di backup', error);
    return { status: 'failed', error };
  }
}

export async function readFolderUri(meta: KeyValueStore): Promise<string | null> {
  const uri = await meta.get(BACKUP_FOLDER_KEY);
  return uri === null || uri === '' ? null : uri;
}

export async function saveFolderUri(meta: KeyValueStore, uri: string): Promise<void> {
  await meta.set(BACKUP_FOLDER_KEY, uri);
}

/**
 * Dimentica la cartella.
 *
 * **Non cancella i file che ci sono dentro**, ed è voluto: sono backup, cioè la cosa che
 * si vuole tenere proprio quando si smette di usare l'app. Toglie solo il puntatore.
 */
export async function forgetFolder(meta: KeyValueStore): Promise<void> {
  await meta.delete(BACKUP_FOLDER_KEY);
}

export type WriteOutcome =
  | { status: 'written' }
  /** La cartella non c'è più, o il permesso è stato revocato dalle impostazioni di Android. */
  | { status: 'gone' }
  | { status: 'unavailable' }
  | { status: 'failed'; error: unknown };

/**
 * Scrive un file di testo nella cartella, cancellando prima l'omonimo.
 *
 * **Il `delete` prima non è pignoleria.** SAF non sovrascrive: `createDocument` su un nome
 * già presente produce `nome (1).json`, e due backup fatti lo stesso giorno lascerebbero
 * due file quasi identici che la potatura non riconosce — il suo criterio è il nome. Meglio
 * togliere di mezzo quello vecchio e riscriverlo.
 */
export async function writeIntoFolder(
  folderUri: string,
  fileName: string,
  content: string,
): Promise<WriteOutcome> {
  const fs = loadFileSystemModule();
  if (fs === null) return { status: 'unavailable' };

  try {
    const directory = new fs.Directory(folderUri);
    if (!directory.exists) return { status: 'gone' };

    for (const entry of directory.list()) {
      if (entry.name === fileName) entry.delete();
    }

    // **`createFile` e non `new File(dir, nome).create()`**: vedi il commento in cima.
    const file = directory.createFile(fileName, 'application/json');
    file.write(content);
    return { status: 'written' };
  } catch (error) {
    markError(`scrittura di ${fileName} nella cartella di backup`, error);
    return { status: 'failed', error };
  }
}

/** I nomi dei file dentro la cartella, per decidere quali potare. `null` se non si può leggere. */
export function listFolder(folderUri: string): string[] | null {
  const fs = loadFileSystemModule();
  if (fs === null) return null;

  try {
    const directory = new fs.Directory(folderUri);
    if (!directory.exists) return null;
    return directory.list().map((entry) => entry.name);
  } catch (error) {
    markError('lettura della cartella di backup', error);
    return null;
  }
}

/**
 * Cancella dei file dalla cartella, uno per uno.
 *
 * **Un errore su uno non ferma gli altri**: la potatura è manutenzione, e mezza potatura è
 * meglio di nessuna. Quello che non si riesce a togliere resta, e ci si riprova la volta
 * dopo — al contrario della scrittura, dove fermarsi è giusto perché il file a metà è il
 * problema.
 */
export function deleteFromFolder(folderUri: string, names: readonly string[]): number {
  const fs = loadFileSystemModule();
  if (fs === null || names.length === 0) return 0;

  const wanted = new Set(names);
  let removed = 0;
  try {
    const directory = new fs.Directory(folderUri);
    for (const entry of directory.list()) {
      if (!wanted.has(entry.name)) continue;
      try {
        entry.delete();
        removed++;
      } catch (error) {
        markError(`potatura di ${entry.name}`, error);
      }
    }
  } catch (error) {
    markError('potatura della cartella di backup', error);
  }
  return removed;
}
