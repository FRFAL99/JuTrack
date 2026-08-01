import type { SyncState } from '@jutrack/core';

/**
 * Traduce lo stato del sync in testo leggibile.
 *
 * In un file separato dal componente, e senza import da react-native, così può essere
 * testato senza montare l'interfaccia: la logica che conta è qui, non nella resa grafica.
 *
 * L'errore viene **mostrato**, non nascosto: un sync fermo che sembra funzionante fa
 * credere all'utente che i due telefoni siano allineati quando non lo sono — e su
 * un'app di conti condivisi quella convinzione sbagliata è peggio dell'errore stesso.
 */
export function describeSync(state: SyncState, now = Date.now()): { icon: string; text: string } {
  switch (state.phase) {
    case 'idle':
      return { icon: '○', text: 'In attesa' };
    case 'syncing':
      return { icon: '↻', text: 'Sincronizzazione…' };
    case 'synced':
      return { icon: '✓', text: `Aggiornato ${relativeTime(state.at, now)}` };
    case 'offline':
      return { icon: '⚠', text: 'Offline — le modifiche restano in coda' };
    case 'error':
      return { icon: '⚠', text: `Non sincronizzato: ${state.message}` };
    case 'blocked':
      // Non «riproverà fra poco»: qui non c'è nessun tentativo in arrivo, e dirlo
      // com'è evita di aspettare per ore una cosa che non succederà.
      return { icon: '✕', text: 'Sincronizzazione fermata: il relay rifiuta la chiave' };
  }
}

function relativeTime(at: number, now: number): string {
  // `Math.max(0, …)`: l'ora di sistema può essere corretta all'indietro, e
  // «fra 3 secondi» sarebbe solo confondente.
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 10) return 'adesso';
  if (seconds < 60) return `${seconds} secondi fa`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minuto' : 'minuti'} fa`;
  const hours = Math.round(minutes / 60);
  return `${hours} ${hours === 1 ? 'ora' : 'ore'} fa`;
}
