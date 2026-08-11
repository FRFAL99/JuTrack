/**
 * Aritmetica sui giorni civili.
 *
 * Fatta sulle stringhe `YYYY-MM-DD`, per la stessa ragione scritta in testa a `period.ts`:
 * un `Date` porta con sé un fuso e un'ora, e «il giorno di questa spesa» non ne ha bisogno.
 *
 * Dove un `Date` serve davvero — il giorno della settimana, che non si calcola a mano — si
 * costruisce a **mezzanotte UTC** e si leggono i componenti UTC. `grouping.ts` usa il
 * trucco del mezzogiorno, che serve quando il `Date` è costruito con componenti **locali**:
 * lì l'ora legale può spostare la mezzanotte al giorno prima. Qui non si costruisce mai un
 * `Date` locale, quindi l'ora legale non ha modo di intervenire — UTC non ne ha.
 */
import type { IsoDate, IsoMonth } from '../model/types';
import { daysInMonth } from './period';

/** Quanti giorni si accetta di percorrere in una volta: dieci anni. */
const MAX_SPAN = 3700;

/**
 * Giorno della settimana, **0 = lunedì**.
 *
 * Lunedì e non domenica: è la settimana come la legge chi userà l'app, ed è l'ordine in cui
 * `totalsByWeekday` mostra le sette barre.
 */
export function dayOfWeek(date: IsoDate): number {
  const time = utcTime(date);
  if (time === null) return 0;
  // `getUTCDay()` conta da domenica: la rotazione porta il lunedì in testa.
  return (new Date(time).getUTCDay() + 6) % 7;
}

/** Sposta una data avanti o indietro di `delta` giorni. */
export function addDays(date: IsoDate, delta: number): IsoDate {
  const time = utcTime(date);
  if (time === null) return date;
  return format(new Date(time + delta * 86_400_000));
}

/**
 * Sequenza continua di giorni, estremi inclusi.
 *
 * Restituisce i giorni e non il loro numero, come `monthsBetween`: è ciò che serve a
 * disegnare un asse del tempo senza buchi. Un intervallo invertito dà l'elenco vuoto.
 */
export function daysBetween(from: IsoDate, to: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  let cursor = from;
  // Il limite protegge da un intervallo assurdo o da input malformati, che altrimenti
  // farebbero girare il ciclo finché non finisce la memoria.
  for (let i = 0; i < MAX_SPAN && cursor <= to; i++) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return out;
}

/** Il lunedì della settimana in cui cade la data. */
export function weekStart(date: IsoDate): IsoDate {
  return addDays(date, -dayOfWeek(date));
}

/** Tutti i giorni di un mese, dal primo all'ultimo. */
export function daysOfMonth(month: IsoMonth): IsoDate[] {
  const count = daysInMonth(month);
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
}

/** Millisecondi UTC della mezzanotte di quel giorno, `null` se la stringa non è una data. */
function utcTime(date: IsoDate): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (match === null) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const time = Date.UTC(year, month - 1, day);
  return Number.isFinite(time) ? time : null;
}

function format(date: Date): IsoDate {
  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
