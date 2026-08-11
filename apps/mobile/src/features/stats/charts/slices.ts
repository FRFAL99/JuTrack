/**
 * Le fette della ciambella, e quello che non ci sta.
 *
 * Una ciambella con quindici spicchi è un cerchio colorato: oltre i primi si distinguono
 * solo con la lente, e la legenda diventa un elenco. Il resto si raccoglie in una voce
 * sola, che **dice quante voci contiene** — «Altre 7 voci» e non «Altro», perché la
 * differenza fra una coda lunga e una corta è essa stessa un'informazione.
 */
import type { Cents } from '@jutrack/core';

export interface Slice {
  /** Chiave stabile per le liste. */
  key: string;
  label: string;
  valueCents: Cents;
  color: string;
}

/** La chiave della fetta che raccoglie la coda. Non può collidere con un id del documento. */
export const REST_KEY = '__rest';

/**
 * Le prime fette e la coda raccolta in una, al più `max` voci in tutto.
 *
 * L'ordine arriva già deciso da chi chiama — le aggregazioni del core ordinano per importo
 * decrescente in modo deterministico — e non viene toccato: riordinare qui vorrebbe dire
 * avere due ordinamenti da tenere d'accordo.
 *
 * **La somma non cambia mai**: la coda vale esattamente quanto le voci che sostituisce, o
 * la ciambella smetterebbe di coincidere con il totale in testa alla schermata.
 */
export function topSlices(slices: Slice[], max: number, restColor: string): Slice[] {
  if (max < 2 || slices.length <= max) return slices;

  const kept = slices.slice(0, max - 1);
  const rest = slices.slice(max - 1);
  const restCents = rest.reduce((sum, slice) => sum + slice.valueCents, 0);

  return [
    ...kept,
    { key: REST_KEY, label: `Altre ${rest.length} voci`, valueCents: restCents, color: restColor },
  ];
}
