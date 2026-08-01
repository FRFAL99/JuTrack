import type { Cents, Expense } from '@jutrack/core';

export interface DaySection {
  /** Data in formato `YYYY-MM-DD`. */
  date: string;
  /** Intestazione leggibile: «Oggi», «Ieri» o «lunedì 1 agosto». */
  title: string;
  totalCents: Cents;
  /** Il nome `data` è imposto da `SectionList` di React Native. */
  data: Expense[];
}

const WEEKDAYS = [
  'domenica',
  'lunedì',
  'martedì',
  'mercoledì',
  'giovedì',
  'venerdì',
  'sabato',
] as const;

const MONTHS = [
  'gennaio',
  'febbraio',
  'marzo',
  'aprile',
  'maggio',
  'giugno',
  'luglio',
  'agosto',
  'settembre',
  'ottobre',
  'novembre',
  'dicembre',
] as const;

/** Data locale del dispositivo in formato `YYYY-MM-DD`. */
export function todayIso(now: Date = new Date()): string {
  // Costruita dai componenti locali e non da `toISOString`, che converte in UTC:
  // alle 23:30 in Italia darebbe già il giorno dopo, e una spesa registrata la sera
  // comparirebbe sotto «domani».
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Intestazione leggibile per una data. */
export function formatDayTitle(isoDate: string, now: Date = new Date()): string {
  const today = todayIso(now);
  if (isoDate === today) return 'Oggi';

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isoDate === todayIso(yesterday)) return 'Ieri';

  const [yearPart, monthPart, dayPart] = isoDate.split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return isoDate;

  // Mezzogiorno invece di mezzanotte: evita che l'ora legale sposti la data di un
  // giorno in alcuni fusi.
  const date = new Date(year, month - 1, day, 12);
  const weekday = WEEKDAYS[date.getDay()] ?? '';
  const monthName = MONTHS[month - 1] ?? '';

  const sameYear = year === now.getFullYear();
  return sameYear ? `${weekday} ${day} ${monthName}` : `${day} ${monthName} ${year}`;
}

/** Mese corrente del dispositivo in formato `YYYY-MM`. */
export function currentMonth(now: Date = new Date()): string {
  return todayIso(now).slice(0, 7);
}

/**
 * Intestazione di un mese: «agosto» nell'anno in corso, «agosto 2025» altrove.
 *
 * L'anno compare solo quando serve a distinguere: ripeterlo su ogni schermata del mese
 * corrente è rumore.
 */
export function formatMonthTitle(month: string, now: Date = new Date()): string {
  const [yearPart, monthPart] = month.split('-');
  const year = Number(yearPart);
  const index = Number(monthPart) - 1;
  const name = MONTHS[index];
  if (!Number.isFinite(year) || name === undefined) return month;
  return year === now.getFullYear() ? name : `${name} ${year}`;
}

/** Abbreviazione di tre lettere per gli assi dei grafici, dove lo spazio è poco. */
export function shortMonthLabel(month: string): string {
  const index = Number(month.split('-')[1]) - 1;
  return MONTHS[index]?.slice(0, 3) ?? month;
}

/**
 * Raggruppa le spese per giorno, conservando l'ordine ricevuto.
 *
 * Presuppone che l'elenco arrivi già ordinato per data decrescente da
 * `VaultStore.listExpenses`, così i gruppi risultano nello stesso ordine.
 */
export function groupByDay(expenses: Expense[], now: Date = new Date()): DaySection[] {
  const sections: DaySection[] = [];
  let current: DaySection | null = null;

  for (const expense of expenses) {
    if (current === null || current.date !== expense.date) {
      current = {
        date: expense.date,
        title: formatDayTitle(expense.date, now),
        totalCents: 0,
        data: [],
      };
      sections.push(current);
    }
    current.data.push(expense);
    current.totalCents += expense.amountCents;
  }

  return sections;
}
