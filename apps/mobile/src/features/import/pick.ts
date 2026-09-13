/**
 * Scegliere un file dal telefono, invece di incollarne il contenuto.
 *
 * **Questo modulo esiste perché una regola del progetto ha smesso di essere vera.** Lo Step
 * 42 aveva scritto, in cima a `/importa`: «si incolla, non si sceglie un file, per la sesta
 * volta nel progetto: `expo-document-picker` è un modulo nativo, cioè una build EAS nuova
 * per una comodità». Era giusto allora. Oggi **`expo-file-system` — che è già nella build
 * dallo Step 30 — espone `File.pickFileAsync`**, quindi il selettore non costa nessun
 * modulo nuovo e nessuna build.
 *
 * **Il `try/catch` avvolge la chiamata, non solo il `require`, ed è la differenza che conta.**
 * Il caricamento pigro dello Step 9 (`features/export/share.ts`) difende dal caso in cui il
 * **modulo** manchi: `require` lancia, si ripiega. Qui il caso è un altro e più insidioso —
 * il modulo si carica benissimo, ma la sua parte **nativa** è quella di una build compilata
 * prima che `pickFileAsync` esistesse. Gli aggiornamenti via etere portano JavaScript, non
 * codice nativo: questo file può arrivare su un telefono dove quella funzione non c'è, e
 * allora è la chiamata a lanciare, non l'import. Difendere solo il `require` lascerebbe
 * scoperto esattamente il caso che si verificherà.
 *
 * Il ripiego è la stessa cosa che si faceva prima: incollare. Non è un errore da mostrare,
 * è la strada vecchia che resta aperta.
 */
import type * as ExpoFileSystem from 'expo-file-system';
import { markError } from '@/diagnostics';

type FileSystemModule = typeof ExpoFileSystem;

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
 * Il selettore risponde su questo telefono?
 *
 * Non basta che il modulo si carichi: serve che ci sia **anche** la funzione, perché la
 * build nativa installata potrebbe essere più vecchia del JavaScript che la chiama.
 */
export function isFilePickerAvailable(): boolean {
  const fs = loadFileSystemModule();
  return fs !== null && typeof fs.File?.pickFileAsync === 'function';
}

export type PickOutcome =
  /** L'utente ha scelto un file e si è riusciti a leggerlo. */
  | { status: 'read'; name: string; content: string }
  /** Ha aperto il selettore e l'ha chiuso senza scegliere: non è un errore. */
  | { status: 'cancelled' }
  /** Niente selettore su questa build: chi chiama offre gli appunti. */
  | { status: 'unavailable' }
  | { status: 'failed'; error: unknown };

/**
 * Apre il selettore di sistema e restituisce il testo del file scelto.
 *
 * **Si filtra per `application/json` ma si accetta quello che arriva.** Il tipo dichiarato
 * da un fornitore di documenti è un'indicazione, non una garanzia: un `.json` arrivato da
 * una chat può presentarsi come `text/plain` o come `application/octet-stream`, e rifiutarlo
 * qui vorrebbe dire dire di no a un file perfettamente buono. **Chi decide se il contenuto
 * è un export di JuTrack è `parseVaultExport`**, che è nato per questo e che sa dire perché
 * no. Aggiungere un secondo giudice, più ignorante, servirebbe solo a produrre rifiuti che
 * il primo non avrebbe dato.
 */
/** La forma minima del risultato del selettore che a questo modulo serve davvero. */
export interface PickedFile {
  canceled: boolean;
  result: { name: string; textSync: () => string } | null;
}

/**
 * Che cosa fare del risultato del selettore.
 *
 * **Sta fuori dalla funzione che chiama il modulo nativo perché è la parte che decide**, e
 * quindi la parte che si può sbagliare senza che nessuno se ne accorga. Il resto di
 * `pickTextFile` è impianto: carica un modulo, chiama una funzione, cattura un errore.
 *
 * La decisione che conta è una sola: **annullare non è un guasto.** Chi apre il selettore e
 * lo richiude ha deciso di non scegliere niente, e trattarlo come un errore — un avviso, un
 * messaggio rosso — vorrebbe dire rimproverare qualcuno per aver cambiato idea. Il caso
 * arriva in due forme, `canceled: true` e `result: null`, e valgono uguale.
 */
export function outcomeOf(picked: PickedFile): PickOutcome {
  if (picked.canceled || picked.result === null) return { status: 'cancelled' };
  return { status: 'read', name: picked.result.name, content: picked.result.textSync() };
}

export async function pickTextFile(mimeTypes: string[]): Promise<PickOutcome> {
  const fs = loadFileSystemModule();
  if (fs === null) return { status: 'unavailable' };

  try {
    // Il `typeof` è dentro il `try` insieme alla chiamata: su una build nativa più vecchia
    // del JavaScript, è qui che si scopre che la funzione non c'è.
    if (typeof fs.File?.pickFileAsync !== 'function') return { status: 'unavailable' };

    return outcomeOf(await fs.File.pickFileAsync({ mimeTypes }));
  } catch (error) {
    markError('scelta di un file da leggere', error);
    return { status: 'failed', error };
  }
}

/** L'export JSON del vault, per `/importa`. */
export async function pickJsonFile(): Promise<PickOutcome> {
  return pickTextFile(['application/json']);
}

/**
 * Il backup della chiave, per `/backup`.
 *
 * `text/plain` perché è così che `exportFileName(…, 'txt')` lo fa uscire — un `JTBK1.…` è
 * base64url, non JSON. Ma vale la stessa indulgenza di sopra: il tipo dichiarato è
 * un'indicazione, e a decidere se il contenuto è un backup è `importBackup`.
 */
export async function pickKeyFile(): Promise<PickOutcome> {
  return pickTextFile(['text/plain', 'application/octet-stream']);
}
