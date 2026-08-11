/**
 * Le etichette degli assi, e quali di esse ci stanno.
 *
 * I grafici disegnano le **marche** in SVG e scrivono il testo con `Text` di React Native,
 * che eredita gratis il font dell'app e il ridimensionamento d'accessibilità del sistema.
 * Quel testo va scelto: trenta giorni non ci stanno sotto un grafico largo un telefono, e
 * decidere quali mostrare è logica pura — quindi sta qui, con i suoi test, e non dentro un
 * componente che i test non caricano.
 */
import type { Cents } from '@jutrack/core';

/** Un punto di una curva: il valore, e come si chiama sull'asse. */
export interface ChartPoint {
  /** Chiave stabile per le liste: la data o il mese. */
  key: string;
  /** Etichetta breve per l'asse orizzontale. */
  label: string;
  valueCents: Cents;
}

/**
 * I nomi dei sette giorni, **lunedì per primo**.
 *
 * L'ordine è quello di `dayOfWeek` di `@jutrack/core`, che restituisce 0 per lunedì: non
 * quello di `Date.getDay()`, che parte da domenica ed è la convenzione usata da
 * `features/expenses/grouping.ts` per un motivo diverso (lì l'indice arriva da un `Date`).
 * Due elenchi con lo stesso contenuto e un ordine diverso sono esattamente il tipo di cosa
 * che si sbaglia una volta sola e poi non si nota più.
 */
export const WEEKDAY_NAMES = [
  'lunedì',
  'martedì',
  'mercoledì',
  'giovedì',
  'venerdì',
  'sabato',
  'domenica',
] as const;

/** Nome per esteso, per le etichette d'accessibilità. Stringa vuota fuori da 0–6. */
export function weekdayName(weekday: number): string {
  return WEEKDAY_NAMES[weekday] ?? '';
}

/** Abbreviazione di tre lettere, per l'asse dove lo spazio è poco. */
export function shortWeekdayLabel(weekday: number): string {
  return weekdayName(weekday).slice(0, 3);
}

/**
 * Quali indici di una serie meritano un'etichetta, al più `max`.
 *
 * **Il primo e l'ultimo ci sono sempre**: sono i due che dicono di che periodo si sta
 * parlando, e un asse che comincia a metà non si legge. Gli altri si distribuiscono in modo
 * uniforme, arrotondati — e i doppioni prodotti dall'arrotondamento si scartano, così due
 * etichette non finiscono mai una sopra l'altra.
 */
export function labelIndices(count: number, max: number): number[] {
  if (count <= 0 || max <= 0) return [];
  if (count <= max) return Array.from({ length: count }, (_, i) => i);
  if (max === 1) return [0];

  const picked = new Set<number>();
  for (let i = 0; i < max; i++) {
    picked.add(Math.round((i * (count - 1)) / (max - 1)));
  }
  return [...picked].sort((a, b) => a - b);
}
