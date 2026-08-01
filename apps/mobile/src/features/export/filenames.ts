/**
 * Nomi dei file esportati.
 *
 * Vive in un modulo suo, senza dipendenze native, perché è l'unica parte dell'export
 * lato app che si può verificare con un test: il resto è scrittura su disco e apertura
 * del foglio di condivisione, cose che si provano solo sul telefono.
 */

/** Data civile locale in `YYYY-MM-DD`. Locale e non UTC: è la data che l'utente si aspetta. */
export function localDateStamp(now: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Compone `jutrack-<cosa>-<data>.<estensione>`.
 *
 * Nessun orario nel nome: due export lo stesso giorno si sovrascrivono in cache, ed è il
 * comportamento voluto — la cache è un'area di transito, il file vero è quello che
 * l'utente ha già salvato altrove.
 */
export function exportFileName(what: string, extension: string, now: Date): string {
  return `jutrack-${what}-${localDateStamp(now)}.${extension}`;
}
