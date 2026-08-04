import { buildSplit, formatCents, formatMoney, type SplitMode } from '@jutrack/core';

/**
 * Le frasi che spiegano come si divide una spesa.
 *
 * Fuori dal componente per la stessa ragione di `features/stats/format.ts`: è qui che stanno
 * i casi limite — un importo non ancora scritto, un totale che non si divide in centesimi
 * esatti, quote che non tornano — e i componenti importano `react-native`, che i test
 * dell'app non caricano. Prima queste due funzioni stavano dentro `ExpenseForm.tsx`, dove
 * non erano provate.
 */

/**
 * L'etichetta di una modalità di divisione.
 *
 * **`equal` non si chiama sempre «Metà e metà»**, contrariamente al mockup: quella frase è
 * vera solo in due. Con tre persone sarebbe semplicemente falsa, e su un'app di conti una
 * frase falsa accanto a un numero è peggio di una lunga.
 *
 * **`single` non si chiama «Tutto mio»**, per lo stesso motivo: la modalità mette la spesa a
 * carico di **chi ha pagato**, che non sono necessariamente io — posso registrare una spesa
 * pagata da un altro. «Solo chi paga» è vero in entrambi i casi.
 */
export function splitModeLabel(mode: SplitMode, memberCount: number): string {
  if (mode === 'equal') return memberCount === 2 ? 'Metà e metà' : 'In parti uguali';
  if (mode === 'custom') return 'Quote';
  return 'Solo chi paga';
}

/** Dice quanto manca o quanto avanza rispetto al totale, in parole. */
export function describeGap(gap: number, amountCents: number | null): string {
  if (amountCents === null || amountCents <= 0) return 'Inserisci prima l’importo della spesa';
  if (gap === 0) return 'Le quote coprono esattamente il totale';
  return gap > 0 ? `Mancano ${formatMoney(gap)}` : `Eccedono di ${formatMoney(-gap)}`;
}

/** Anteprima della quota per persona, per rendere concreto l'effetto dello split. */
export function splitPreview(amountCents: number | null, memberCount: number): string {
  if (amountCents === null || amountCents <= 0 || memberCount < 2) {
    return 'Diviso in parti uguali';
  }
  const shares = buildSplit(
    'equal',
    amountCents,
    Array.from({ length: memberCount }, (_, i) => String(i)),
  ).shares;
  const values = Object.values(shares);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Quando l'importo non è divisibile esattamente le quote differiscono di un
  // centesimo: mostrarlo evita che sembri un errore di calcolo.
  return min === max
    ? `${formatCents(min)} € a testa`
    : `${formatCents(min)} € / ${formatCents(max)} € a testa`;
}

/**
 * La quota che toccherebbe a un membro, per l'anteprima sotto il suo riquadro.
 *
 * `null` quando non c'è ancora niente da mostrare: senza importo, una quota a `0,00` farebbe
 * sembrare deciso qualcosa che non è stato ancora scritto.
 */
export function previewShareCents(
  mode: SplitMode,
  amountCents: number | null,
  memberIds: string[],
  memberId: string,
  paidBy: string,
): number | null {
  if (amountCents === null || amountCents <= 0) return null;
  if (mode === 'single') return memberId === paidBy ? amountCents : 0;
  if (mode === 'custom') return null;
  return buildSplit('equal', amountCents, memberIds).shares[memberId] ?? 0;
}
