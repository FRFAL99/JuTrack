import { formatMoney, numberFormat } from '@/i18n/money';
import { t } from '@/i18n/translate';

/**
 * Le frasi e i numeri che compaiono nei grafici.
 *
 * Fuori dai componenti perché è qui che stanno i casi limite — un mese precedente a zero,
 * un totale che va in migliaia — e i componenti importano `react-native`, che i test
 * dell'app non caricano.
 */

/**
 * Confronto con il mese precedente, in parole.
 *
 * Una variazione percentuale su un mese a zero sarebbe infinita: quel caso si racconta,
 * non si calcola.
 */
export function describeChange(current: number, previous: number, previousLabel: string): string {
  if (previous === 0) {
    return current === 0
      ? t('stats.change.none')
      : t('stats.change.zeroPrevious', { previous: previousLabel });
  }
  const delta = Math.round(((current - previous) / previous) * 100);
  if (delta === 0) return t('stats.change.same', { previous: previousLabel });
  return delta > 0
    ? t('stats.change.up', { delta, previous: previousLabel })
    : t('stats.change.down', { delta, previous: previousLabel });
}

/**
 * Importo compatto per l'etichetta sopra una barra.
 *
 * Unità intere: i centesimi non entrano nella larghezza di una colonna, e su un andamento
 * mensile non cambiano la lettura. Oltre il migliaio si abbrevia in `1,2k`.
 *
 * **Senza simbolo**, a differenza di `formatMoney`: chi la chiama lo aggiunge se serve (la
 * legenda della heatmap, l'etichetta del treemap) e lo omette dove il numero sta su un asse,
 * dove ripeterlo a ogni tacca sarebbe rumore.
 */
export function compactAmount(cents: number): string {
  const euro = Math.round(cents / 100);
  if (euro < 1000) return String(euro);
  // Il separatore decimale arriva dalla lingua, come per gli importi interi: scritto a mano
  // com'era prima (`.replace('.', ',')`), «1,2k» sarebbe comparso anche sugli assi di un
  // grafico letto in inglese, dove si scrive «1.2k».
  return `${(euro / 1000).toFixed(1).replace('.', numberFormat().decimal)}k`;
}

/** Percentuale intera: i decimali su una quota non aggiungono nulla di azionabile. */
export function formatShare(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/**
 * Riga di stato di un budget: dice sempre quanto, mai solo un colore.
 *
 * Il simbolo è un parametro e non una lettura: questo modulo è puro — è la ragione per cui
 * sta fuori dai componenti — e un hook qui non si può chiamare. Il default `'€'` tiene
 * additiva la firma per i test che c'erano già.
 */
export function describeBudget(
  state: 'under' | 'near' | 'over',
  remainingCents: number,
  symbol = '€',
): string {
  if (state === 'over') {
    return t('stats.budgetStatus.over', { amount: formatMoney(-remainingCents, symbol) });
  }
  if (state === 'near') {
    return t('stats.budgetStatus.near', { amount: formatMoney(remainingCents, symbol) });
  }
  return t('stats.budgetStatus.under', { amount: formatMoney(remainingCents, symbol) });
}
