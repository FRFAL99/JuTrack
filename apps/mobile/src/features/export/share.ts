/**
 * Scrittura del file e apertura del foglio di condivisione.
 *
 * Due moduli nativi (`expo-file-system`, `expo-sharing`) caricati **pigramente**, per lo
 * stesso motivo di `features/pairing/camera.ts`: expo-router importa tutte le route
 * all'avvio, quindi un `import` in cima a questa schermata verrebbe eseguito al boot. Su
 * una build nativa che non contiene ancora questi moduli — per esempio la development
 * build installata prima che venissero aggiunti — l'app non si aprirebbe affatto. Con il
 * caricamento pigro il guasto resta confinato a questa schermata, che ripiega sugli
 * appunti.
 */
import type * as ExpoFileSystem from 'expo-file-system';
import type * as ExpoSharing from 'expo-sharing';
import { markError } from '@/diagnostics';

type FileSystemModule = typeof ExpoFileSystem;
type SharingModule = typeof ExpoSharing;

// `undefined` = mai tentato, `null` = tentato e non disponibile.
let cachedFileSystem: FileSystemModule | null | undefined;
let cachedSharing: SharingModule | null | undefined;

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

function loadSharingModule(): SharingModule | null {
  if (cachedSharing !== undefined) return cachedSharing;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedSharing = require('expo-sharing') as SharingModule;
  } catch (error) {
    markError('expo-sharing non disponibile', error);
    cachedSharing = null;
  }
  return cachedSharing;
}

/** Entrambi i moduli nativi rispondono? Se no, la schermata offre solo la copia negli appunti. */
export function isFileSharingAvailable(): boolean {
  return loadFileSystemModule() !== null && loadSharingModule() !== null;
}

export interface TextFile {
  /** Nome completo, estensione inclusa. */
  name: string;
  content: string;
  /** Determina quali app compaiono nel foglio di condivisione. */
  mimeType: string;
  /** Titolo del foglio di condivisione su Android. */
  dialogTitle: string;
}

export type ShareOutcome =
  /** Il foglio di condivisione è stato aperto. Se l'utente poi annulli, non lo sappiamo. */
  | { status: 'shared' }
  /** Uno dei due moduli nativi manca: serve una build aggiornata. */
  | { status: 'unavailable' }
  | { status: 'failed'; error: unknown };

/**
 * Scrive il file in cache e apre il foglio di condivisione.
 *
 * In cache e non in `document`: il file è di transito: serve a passare i byte all'app che
 * l'utente sceglie (Drive, mail, WhatsApp) e da lì in poi la copia buona è quella. Lasciarlo
 * nella directory dei documenti significherebbe accumulare export vecchi che nessuno
 * cancella — e sono dati in chiaro.
 */
export async function shareTextFile(file: TextFile): Promise<ShareOutcome> {
  const fs = loadFileSystemModule();
  const sharing = loadSharingModule();
  if (fs === null || sharing === null) return { status: 'unavailable' };

  try {
    if (!(await sharing.isAvailableAsync())) return { status: 'unavailable' };

    const target = new fs.File(fs.Paths.cache, file.name);
    // `overwrite`: un export dello stesso giorno rimpiazza il precedente invece di fallire.
    target.create({ overwrite: true, intermediates: true });
    target.write(file.content);

    await sharing.shareAsync(target.uri, {
      mimeType: file.mimeType,
      dialogTitle: file.dialogTitle,
    });
    return { status: 'shared' };
  } catch (error) {
    markError(`condivisione di ${file.name}`, error);
    return { status: 'failed', error };
  }
}
