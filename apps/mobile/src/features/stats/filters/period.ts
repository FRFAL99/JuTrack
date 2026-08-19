/**
 * Il periodo dei grafici: dai preset a `{ from, to }`, e ritorno.
 *
 * È il filtro che decide quante spese entrano in tutti gli altri, e **il posto in cui si
 * annidano gli errori di un giorno**: «ultimi 7 giorni» che ne prende otto, «questo mese»
 * che arriva a fine mese invece che a oggi, «mese scorso» che a gennaio resta nel 2026.
 * Per questo la conversione sta qui, pura e provata, e non dentro il selettore.
 *
 * Le date sono stringhe `YYYY-MM-DD` e l'aritmetica passa da `@jutrack/core`, per la stessa
 * ragione scritta in testa a `insights/period.ts`: un `Date` porta con sé un fuso e un'ora,
 * e «il giorno da cui comincia il periodo» non ne ha bisogno.
 */
import {
  addDays,
  daysBetween,
  daysInMonth,
  monthBounds,
  monthOf,
  shiftMonth,
  type IsoDate,
  type IsoMonth,
} from '@jutrack/core';
import { formatDayShort, formatMonthTitle, todayIso } from '@/features/expenses/grouping';
import { t } from '@/i18n/translate';

/** I sei preset del selettore. `custom` non è fra questi: non ha una regola, ha due date. */
export type PeriodPresetId =
  'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'last12Months' | 'thisYear';

export type PeriodId = PeriodPresetId | 'custom';

export interface Period {
  id: PeriodId;
  /** Inclusivo. */
  from: IsoDate;
  /** Inclusivo. */
  to: IsoDate;
}

/**
 * I preset, nell'ordine in cui il selettore li mostra: dal più stretto al più largo.
 *
 * L'etichetta è quella che compare sia nel selettore sia nel chip della barra — un solo
 * testo, così la pillola che si tocca e quella che resta scritta dicono la stessa cosa.
 *
 * **Funzione e non costante di modulo**: una costante calcolata all'import resterebbe
 * congelata nella lingua di sistema per tutta la vita del processo, lo stesso guasto rischiato
 * dai widget allo Step 38.
 */
export function periodPresets(): { id: PeriodPresetId; label: string }[] {
  return [
    { id: 'last7', label: t('stats.period.last7') },
    { id: 'last30', label: t('stats.period.last30') },
    { id: 'thisMonth', label: t('stats.period.thisMonth') },
    { id: 'lastMonth', label: t('stats.period.lastMonth') },
    { id: 'last12Months', label: t('stats.period.last12Months') },
    { id: 'thisYear', label: t('stats.period.thisYear') },
  ];
}

/**
 * Il periodo di un preset.
 *
 * **Quelli che arrivano a oggi si fermano a oggi**, non alla fine del mese o dell'anno: una
 * curva che prosegue piatta fino al 31 non dice «non ho ancora speso», dice «non spenderò».
 * L'unico che guarda solo all'indietro è «mese scorso», che è chiuso per definizione.
 */
export function presetPeriod(id: PeriodPresetId, today: IsoDate = todayIso()): Period {
  const month = monthOf(today);

  switch (id) {
    // Sei giorni indietro e non sette: «ultimi 7 giorni» include **oggi**, che è il settimo.
    case 'last7':
      return { id, from: addDays(today, -6), to: today };
    case 'last30':
      return { id, from: addDays(today, -29), to: today };
    case 'thisMonth':
      return { id, from: `${month}-01`, to: today };
    case 'lastMonth': {
      const bounds = monthBounds(shiftMonth(month, -1));
      return { id, from: bounds.from, to: bounds.to };
    }
    // Undici mesi indietro più quello in corso fanno dodici: il primo giorno del dodicesimo.
    case 'last12Months':
      return { id, from: `${shiftMonth(month, -11)}-01`, to: today };
    case 'thisYear':
      return { id, from: `${today.slice(0, 4)}-01-01`, to: today };
  }
}

/**
 * Un intervallo scelto a mano, **raddrizzato**.
 *
 * Chi tocca prima il 20 e poi il 3 intende dal 3 al 20: prendere le due date nell'ordine in
 * cui sono state toccate darebbe un intervallo invertito, che non è un errore visibile — è
 * una schermata vuota che sembra un guasto.
 */
export function customPeriod(a: IsoDate, b: IsoDate): Period {
  return a <= b ? { id: 'custom', from: a, to: b } : { id: 'custom', from: b, to: a };
}

/**
 * Il periodo di un mese civile, per la barra dei mesi che si tocca.
 *
 * Il mese in corso passa per il preset invece che per un intervallo: si ferma a oggi come
 * ci si aspetta, e il chip dice «Questo mese» invece della data di oggi.
 */
export function monthPeriod(month: IsoMonth, today: IsoDate = todayIso()): Period {
  if (month === monthOf(today)) return presetPeriod('thisMonth', today);
  const bounds = monthBounds(month);
  return { id: 'custom', from: bounds.from, to: bounds.to };
}

/** Il mese a cui appartiene il periodo: quello in cui **finisce**, ed è l'ultimo raccontato. */
export function anchorMonth(period: Period): IsoMonth {
  return monthOf(period.to);
}

/**
 * Il tratto con cui ha senso confrontarlo, per la riga «+12% rispetto a…».
 *
 * Tre casi, e sono tre perché confrontare un mese in corso con il mese intero precedente
 * direbbe sempre che si sta spendendo di meno — a metà agosto qualunque mese finito vince.
 *
 * - **Un mese intero** si confronta con il mese intero prima.
 * - **Un mese in corso** con lo **stesso tratto** del mese prima: dal primo allo stesso
 *   giorno. Il 31 in un mese che ne ha 30 si accorcia all'ultimo che esiste.
 * - **Tutto il resto** con il tratto di pari lunghezza subito precedente, che è l'unico
 *   confronto onesto quando il periodo non ha niente a che vedere con il calendario.
 */
export function previousPeriod(period: Period): { from: IsoDate; to: IsoDate } {
  const month = monthOf(period.from);
  const startsFirst = period.from === `${month}-01`;

  if (startsFirst && monthOf(period.to) === month) {
    const before = shiftMonth(month, -1);
    const bounds = monthBounds(before);
    if (period.to === monthBounds(month).to) return bounds;

    const day = Math.min(Number(period.to.slice(8, 10)), daysInMonth(before));
    return { from: bounds.from, to: `${before}-${String(day).padStart(2, '0')}` };
  }

  const length = daysBetween(period.from, period.to).length;
  return { from: addDays(period.from, -length), to: addDays(period.from, -1) };
}

/**
 * Come si legge il periodo nel chip della barra.
 *
 * I preset portano la loro etichetta, che è già una risposta: «Ultimi 30 giorni» dice tutto
 * senza due date da leggere. Gli intervalli scelti a mano portano le date, perché non
 * hanno un nome.
 */
export function periodLabel(period: Period, now: Date = new Date()): string {
  const preset = periodPresets().find((one) => one.id === period.id);
  if (preset !== undefined) return preset.label;
  // La maiuscola sta **qui** e non in `describeRange`: un chip comincia una frase sua,
  // mentre «rispetto a marzo» sta in mezzo a una. Le date non se ne accorgono — «3 – 20
  // agosto» comincia per cifra — ma i nomi dei mesi sì.
  return capitalize(describeRange(period.from, period.to, now));
}

/**
 * Un intervallo in parole, il più corto che resti vero.
 *
 * Un mese civile intero si dice con il suo nome — è il caso della barra dei mesi, e «marzo»
 * si legge meglio di «1 – 31 marzo» —, due giorni dello stesso mese ripetono il nome del
 * mese una volta sola, e il resto porta entrambe le date per esteso.
 */
export function describeRange(from: IsoDate, to: IsoDate, now: Date = new Date()): string {
  if (from === to) return formatDayShort(from, now);

  const month = monthOf(from);
  const sameMonth = monthOf(to) === month;

  if (sameMonth && from === `${month}-01` && to === monthBounds(month).to) {
    return formatMonthTitle(month, now);
  }
  if (sameMonth) return `${Number(from.slice(8, 10))} – ${formatDayShort(to, now)}`;
  return `${formatDayShort(from, now)} – ${formatDayShort(to, now)}`;
}

/**
 * Gli estremi per esteso, senza scorciatoie: «dal 1 al 31 luglio».
 *
 * Diverso da `describeRange`, che un mese intero lo chiama per nome: qui il nome è già
 * scritto sulla pillola sopra, e la riga serve proprio a dire **da che giorno a che giorno**
 * si intende — «Questo mese» che il 15 significa fino al 15 e non fino al 31.
 */
export function describeBounds(from: IsoDate, to: IsoDate, now: Date = new Date()): string {
  if (from === to) return t('stats.period.onlyDay', { day: formatDayShort(from, now) });
  const opening =
    monthOf(from) === monthOf(to) ? String(Number(from.slice(8, 10))) : formatDayShort(from, now);
  return t('stats.period.fromTo', { opening, closing: formatDayShort(to, now) });
}

/**
 * Il periodo di partenza: il mese in corso.
 *
 * È quello che la schermata mostrava prima dei filtri, e chi aggiorna l'app deve ritrovare
 * la stessa cosa senza scegliere niente.
 */
export function defaultPeriod(today: IsoDate = todayIso()): Period {
  return presetPeriod('thisMonth', today);
}

/** Vero se il periodo comincia il primo del mese in cui finisce: i mesi interi ci passano. */
export function startsAtMonthStart(period: Period): boolean {
  return period.from === `${anchorMonth(period)}-01`;
}

function capitalize(value: string): string {
  const first = value[0];
  return first === undefined ? value : first.toUpperCase() + value.slice(1);
}
