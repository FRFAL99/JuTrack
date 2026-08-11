/**
 * L'istogramma degli importi: quante spese piccole, quante grosse.
 *
 * Le fasce sono **fisse e non calcolate dai dati**. Fasce automatiche cambierebbero a ogni
 * spesa nuova, e due mesi affiancati non sarebbero più confrontabili: la stessa abitudine
 * sembrerebbe cambiata solo perché è cambiato l'asse. Sono anche le soglie in cui si pensa
 * la spesa quotidiana — sotto i dieci euro, sopra i duecento.
 */
import type { Cents } from '../model/money';

export interface AmountBin {
  label: string;
  /** Inclusivo. */
  minCents: Cents;
  /** **Esclusivo**, `null` per l'ultima fascia che non ha limite superiore. */
  maxCents: Cents | null;
  count: number;
  totalCents: Cents;
}

/** Le sei fasce, in centesimi. L'ultima è aperta verso l'alto. */
export const AMOUNT_BINS: { label: string; minCents: Cents; maxCents: Cents | null }[] = [
  { label: '0–10', minCents: 0, maxCents: 1000 },
  { label: '10–20', minCents: 1000, maxCents: 2000 },
  { label: '20–50', minCents: 2000, maxCents: 5000 },
  { label: '50–100', minCents: 5000, maxCents: 10_000 },
  { label: '100–200', minCents: 10_000, maxCents: 20_000 },
  { label: '200+', minCents: 20_000, maxCents: null },
];

/**
 * Conta gli importi nelle sei fasce. Le fasce vuote restano, a zero.
 *
 * **Il confine appartiene alla fascia che comincia**: `min <= importo < max`, quindi 10,00 €
 * sta in «10–20» e non in «0–10». È il caso che si sbaglia, ed è l'unico modo di leggere le
 * etichette senza ambiguità — con il confine incluso da entrambe le parti, la stessa spesa
 * finirebbe in due barre a seconda di come è scritto il ciclo.
 *
 * Gli importi negativi non esistono fra le spese e non entrano in nessuna fascia: se ne
 * arriva uno, è un difetto a monte e va notato mancando dal totale, non nascosto nella
 * prima barra.
 */
export function binsFor(amounts: Cents[]): AmountBin[] {
  const bins: AmountBin[] = AMOUNT_BINS.map((bin) => ({ ...bin, count: 0, totalCents: 0 }));

  for (const amount of amounts) {
    if (!Number.isFinite(amount) || amount < 0) continue;
    const bin = bins.find(
      (candidate) =>
        amount >= candidate.minCents &&
        (candidate.maxCents === null || amount < candidate.maxCents),
    );
    if (bin === undefined) continue;
    bin.count++;
    bin.totalCents += amount;
  }

  return bins;
}
