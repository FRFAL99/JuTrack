/**
 * Marcatori di avvio.
 *
 * Servono a localizzare un crash che non produce schermata rossa: quando l'app muore
 * nativamente, l'ultima riga arrivata al log di Metro indica il punto raggiunto.
 *
 * Da rimuovere una volta chiusa la diagnosi.
 */

let step = 0;

export function mark(label: string): void {
  step++;
  // eslint-disable-next-line no-console
  console.log(`[JUTRACK ${String(step).padStart(2, '0')}] ${label}`);
}

export function markError(label: string, error: unknown): void {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const stack =
    error instanceof Error ? (error.stack ?? '').split('\n').slice(0, 4).join(' | ') : '';
  console.error(`[JUTRACK ERRORE] ${label} → ${message} ${stack}`);
}
