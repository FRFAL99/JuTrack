import type { Cents, Expense } from '@jutrack/core';
import { t } from '@/i18n/translate';

export interface DaySection {
  /** Data in formato `YYYY-MM-DD`. */
  date: string;
  /** Intestazione leggibile: «Oggi», «Ieri» o «lunedì 1 agosto». */
  title: string;
  totalCents: Cents;
  /** Il nome `data` è imposto da `SectionList` di React Native. */
  data: Expense[];
}

/**
 * I nomi dei giorni e dei mesi vengono dal dizionario, **e con loro l'ordine dei pezzi**.
 *
 * Lo Step 38 ha tolto da qui due array di parole italiane. Tradurre solo quelli avrebbe
 * prodotto «Monday 1 August»: in inglese il mese viene prima del giorno, e quell'ordine
 * appartiene alla lingua esattamente quanto la parola «August». Sta quindi nel dizionario
 * come modello — `date.dayTitle` — e qui restano solo i pezzi da infilarci.
 *
 * **Niente `Intl.DateTimeFormat`**, che pure saprebbe fare tutto: su Hermes non è verificato
 * (vedi `systemLocale` allo Step 37), e ripiegherebbe in silenzio su un formato qualsiasi.
 * Un modello scritto da noi si legge, si prova e non dipende dal motore.
 */
const weekdayName = (index: number): string => t(`date.weekdays.${index}`);
const monthName = (month: number): string => t(`date.months.${month}`);

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
  if (isoDate === today) return t('date.today');

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isoDate === todayIso(yesterday)) return t('date.yesterday');

  const [yearPart, monthPart, dayPart] = isoDate.split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return isoDate;

  // Mezzogiorno invece di mezzanotte: evita che l'ora legale sposti la data di un
  // giorno in alcuni fusi.
  const date = new Date(year, month - 1, day, 12);

  return year === now.getFullYear()
    ? t('date.dayTitle', { weekday: weekdayName(date.getDay()), day, month: monthName(month) })
    : t('date.dayTitleOtherYear', { day, month: monthName(month), year });
}

/**
 * Un giorno per esteso: «15 agosto», con l'anno solo quando non è quello in corso.
 *
 * Diverso da `formatDayTitle`, che dice «Oggi» e «Ieri»: dentro un intervallo di date
 * quelle due parole non si possono usare — «Oggi – 15 agosto» non è un intervallo, e a
 * mezzanotte diventerebbe falso senza che nulla lo ridisegni.
 */
export function formatDayShort(isoDate: string, now: Date = new Date()): string {
  const [yearPart, monthPart, dayPart] = isoDate.split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  if (!Number.isFinite(year) || !Number.isFinite(day) || !isMonthNumber(month)) return isoDate;
  return year === now.getFullYear()
    ? t('date.dayShort', { day, month: monthName(month) })
    : t('date.dayShortOtherYear', { day, month: monthName(month), year });
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
  const index = Number(monthPart);
  if (!Number.isFinite(year) || !isMonthNumber(index)) return month;
  const name = monthName(index);
  return year === now.getFullYear() ? name : t('date.monthYear', { month: name, year });
}

/**
 * Abbreviazione di tre lettere per gli assi dei grafici, dove lo spazio è poco.
 *
 * Tagliare a tre funziona in entrambe le lingue — «ago», «Aug» — e regge la maiuscola
 * inglese senza doverla sapere, perché arriva già dal dizionario.
 */
export function shortMonthLabel(month: string): string {
  const index = Number(month.split('-')[1]);
  return isMonthNumber(index) ? monthName(index).slice(0, 3) : month;
}

/** Guardia unica sull'indice del mese: `date.months` ha esattamente le chiavi da 1 a 12. */
function isMonthNumber(month: number): boolean {
  return Number.isInteger(month) && month >= 1 && month <= 12;
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
