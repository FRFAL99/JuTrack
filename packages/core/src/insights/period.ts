/**
 * Aritmetica sui mesi civili.
 *
 * Fatta sulle stringhe `YYYY-MM` e non con `Date`: un oggetto `Date` porta con sé un fuso
 * orario e un'ora, e «il mese di questa spesa» non ne ha bisogno. Passando da `Date`, una
 * spesa del 1° agosto registrata a Roma finirebbe in luglio per chiunque legga i campi
 * UTC — un errore che si nota solo a fine mese, quando i totali non tornano.
 */
import type { IsoDate, IsoMonth } from '../model/types';

/** Mese di una data `YYYY-MM-DD`. */
export function monthOf(date: IsoDate): IsoMonth {
  return date.slice(0, 7);
}

/** Sposta un mese avanti o indietro di `delta` mesi. */
export function shiftMonth(month: IsoMonth, delta: number): IsoMonth {
  const [yearPart, monthPart] = month.split('-');
  const year = Number(yearPart);
  const index = Number(monthPart) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(index)) return month;

  // Il resto in JavaScript può essere negativo (`-1 % 12 === -1`): senza la seconda
  // normalizzazione, tornare indietro da gennaio darebbe il mese 0.
  const absolute = year * 12 + index + delta;
  const nextYear = Math.floor(absolute / 12);
  const nextIndex = ((absolute % 12) + 12) % 12;

  return `${String(nextYear).padStart(4, '0')}-${String(nextIndex + 1).padStart(2, '0')}`;
}

/** Primo e ultimo giorno di un mese, entrambi inclusivi, per `ExpenseFilter`. */
export function monthBounds(month: IsoMonth): { from: IsoDate; to: IsoDate } {
  return { from: `${month}-01`, to: `${month}-${String(daysInMonth(month)).padStart(2, '0')}` };
}

/** Giorni del mese, anni bisestili inclusi. */
export function daysInMonth(month: IsoMonth): number {
  const [yearPart, monthPart] = month.split('-');
  const year = Number(yearPart);
  const index = Number(monthPart);
  if (!Number.isFinite(year) || !Number.isFinite(index)) return 31;

  if (index === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(index) ? 30 : 31;
}

/** Sequenza continua di mesi, estremi inclusi. */
export function monthsBetween(first: IsoMonth, last: IsoMonth): IsoMonth[] {
  const out: IsoMonth[] = [];
  let cursor = first;
  // Il limite protegge da un intervallo invertito o da input malformati, che
  // altrimenti farebbero girare il ciclo per sempre bloccando l'interfaccia.
  for (let i = 0; i < 1200 && cursor <= last; i++) {
    out.push(cursor);
    cursor = shiftMonth(cursor, 1);
  }
  return out;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}
