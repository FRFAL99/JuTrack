import type { SyncState } from '@jutrack/core';
import { plural, t } from '@/i18n/translate';

/**
 * Traduce lo stato del sync in testo leggibile.
 *
 * In un file separato dal componente, e senza import da react-native, così può essere
 * testato senza montare l'interfaccia: la logica che conta è qui, non nella resa grafica.
 *
 * L'errore viene **mostrato**, non nascosto: un sync fermo che sembra funzionante fa
 * credere all'utente che i due telefoni siano allineati quando non lo sono — e su
 * un'app di conti condivisi quella convinzione sbagliata è peggio dell'errore stesso.
 *
 * **`state.message` non passa dal dizionario**, ed è l'unica frase dell'app a comparire a
 * schermo così com'è: viene dal motore o dal relay, e tradurla vorrebbe dire riconoscerla —
 * cioè avere un elenco di guasti previsti, che è esattamente ciò che quel campo esiste per
 * non avere. Meglio una diagnosi vera in inglese che una generica nella lingua giusta.
 */
export type SyncTone = 'ok' | 'warn' | 'muted';

/**
 * A quale semantica appartiene una fase, indipendente dal colore vero e proprio: lo sceglie
 * chi disegna, da `colors.income`/`colors.warning`/`colors.textMuted` o equivalenti. Estratta
 * perché due punti la leggono (il pallino di `SyncBadge` e quello nudo del tab Tu) e non
 * doveva divergere fra i due.
 */
export function syncTone(phase: SyncState['phase']): SyncTone {
  if (phase === 'error' || phase === 'offline' || phase === 'blocked') return 'warn';
  if (phase === 'synced') return 'ok';
  return 'muted';
}

/**
 * Il tono del pallino che **non cambia mentre una chiamata è in corso**.
 *
 * `syncing` è un momento, non uno stato: fra un `synced` e il successivo il tono passerebbe
 * da `ok` a `muted` e poi di nuovo a `ok`, cioè il pallino verde si spegne e si riaccende a
 * ogni giro del motore. Letto da fermi sembra un guasto intermittente, e non lo è.
 *
 * Qui il pallino risponde a **«i dati sono allineati?»** — che una chiamata sia in volo non
 * cambia la risposta, che resta l'ultima conosciuta. A dire cosa sta succedendo *adesso* è il
 * testo accanto, che continua a passare da `describeSync`: le due cose sono diverse e possono
 * dire cose diverse nello stesso istante senza contraddirsi.
 *
 * `previous` va tenuto da chi disegna, perché è l'unica parte che ha memoria. Le altre fasi
 * passano com'è: `idle` e `blocked` non sono momenti, sono dove si è.
 */
export function steadySyncTone(phase: SyncState['phase'], previous: SyncTone): SyncTone {
  return phase === 'syncing' ? previous : syncTone(phase);
}

export function describeSync(state: SyncState, now = Date.now()): { icon: string; text: string } {
  switch (state.phase) {
    case 'idle':
      return { icon: '○', text: t('sync.idle') };
    case 'syncing':
      return { icon: '↻', text: t('sync.syncing') };
    case 'synced':
      return { icon: '✓', text: t('sync.syncedAt', { when: relativeTime(state.at, now) }) };
    case 'offline':
      return { icon: '⚠', text: t('sync.offline') };
    case 'error':
      return { icon: '⚠', text: t('sync.error', { message: state.message }) };
    case 'blocked':
      // Non «riproverà fra poco»: qui non c'è nessun tentativo in arrivo, e dirlo
      // com'è evita di aspettare per ore una cosa che non succederà.
      return { icon: '✕', text: t('sync.blocked') };
  }
}

function relativeTime(at: number, now: number): string {
  // `Math.max(0, …)`: l'ora di sistema può essere corretta all'indietro, e
  // «fra 3 secondi» sarebbe solo confondente.
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 10) return t('sync.now');
  if (seconds < 60) return plural('sync.secondsAgo', seconds);
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return plural('sync.minutesAgo', minutes);
  return plural('sync.hoursAgo', Math.round(minutes / 60));
}
