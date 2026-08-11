/**
 * I cinque filtri che non sono il periodo, e come si accendono e si spengono.
 *
 * Stanno separati dal periodo perché hanno una vita diversa: il periodo decide **quante
 * spese si leggono dal documento** — è l'unico filtro che conviene far fare allo store,
 * perché restringe la scansione — mentre questi si applicano in memoria su ciò che è già
 * stato letto. La stessa distinzione permette ai grafici a finestra fissa (dodici mesi,
 * giorni della settimana) di rispettare i filtri **senza** rispettare il periodo, che è
 * quello che devono fare: la loro finestra è dichiarata nel titolo.
 */
import { storeKey, tagKey, type ExpenseQuery } from '@jutrack/core';

/** Una `ExpenseQuery` senza gli estremi: il periodo li aggiunge al momento di comporre. */
export type QueryFacets = Omit<ExpenseQuery, 'from' | 'to'>;

/**
 * Accende o spegne una voce in un elenco a scelta multipla.
 *
 * Il confronto passa da `keyOf` perché negozi e tag si riconoscono **sulla chiave
 * normalizzata** e non sulla grafia: un filtro su `Esselunga` deve spegnersi toccando
 * `esselunga`, altrimenti la stessa pillola resta accesa e non si riesce più a toglierla.
 *
 * Restituisce sempre un array nuovo, e `undefined` quando resta vuoto: una chiave assente e
 * una chiave con l'elenco vuoto vogliono dire la stessa cosa — «tutte» — e tenerne una sola
 * evita che `isEmptyQuery` risponda «c'è un filtro» a un filtro che non c'è.
 */
export function toggleValue(
  values: string[] | undefined,
  value: string,
  keyOf: (value: string) => string = (one) => one,
): string[] | undefined {
  const key = keyOf(value);
  const current = values ?? [];
  const next = current.filter((one) => keyOf(one) !== key);
  if (next.length === current.length) next.push(value);
  return next.length === 0 ? undefined : next;
}

/** Se una voce è fra quelle scelte, con lo stesso confronto di `toggleValue`. */
export function hasValue(
  values: string[] | undefined,
  value: string,
  keyOf: (value: string) => string = (one) => one,
): boolean {
  const key = keyOf(value);
  return (values ?? []).some((one) => keyOf(one) === key);
}

/** Le tre funzioni di confronto in un posto solo, così non si scambiano fra loro. */
export const KEY_OF = { category: (id: string) => id, store: storeKey, tag: tagKey };
