/**
 * Le fasce di importo, dall'istogramma al filtro.
 *
 * Sono **le stesse sei fasce** di `AMOUNT_BINS`, e devono restare le stesse: toccare la
 * barra «20–50» e scegliere «20–50» fra i filtri deve dare lo stesso insieme di spese, o
 * l'istogramma diventa un grafico che indica una cosa e ne seleziona un'altra.
 *
 * **C'è però una conversione, ed è il punto in cui si perde un centesimo.** In `bins.ts` il
 * massimo è **esclusivo** — `min <= importo < max`, così 10,00 € sta in «10–20» e non in
 * «0–10» — mentre `ExpenseQuery.maxCents` è **inclusivo**, come `from` e `to`. Passare
 * `maxCents: 2000` alla query includerebbe una spesa da 20,00 € in «10–20» *e* in «20–50».
 * Il centesimo si toglie qui, una volta, invece che a ogni chiamante.
 */
import { AMOUNT_BINS, type Cents } from '@jutrack/core';

export interface AmountChoice {
  label: string;
  /** Inclusivo, come nella query. */
  minCents: Cents;
  /** Inclusivo. `null` per l'ultima fascia, che non ha limite superiore. */
  maxCents: Cents | null;
}

/** Le sei fasce con gli estremi che vuole `ExpenseQuery`: entrambi inclusivi. */
export const AMOUNT_CHOICES: AmountChoice[] = AMOUNT_BINS.map((bin) => ({
  label: bin.label,
  minCents: bin.minCents,
  maxCents: bin.maxCents === null ? null : bin.maxCents - 1,
}));

/** Gli estremi da mettere nella query, senza le chiavi che non servono. */
export function amountRange(choice: AmountChoice): { minCents?: Cents; maxCents?: Cents } {
  // Spread condizionale e non `maxCents: undefined`: con `exactOptionalPropertyTypes` una
  // proprietà valorizzata a `undefined` è diversa da una proprietà assente.
  return {
    minCents: choice.minCents,
    ...(choice.maxCents !== null && { maxCents: choice.maxCents }),
  };
}

/** Se la fascia è quella attiva nella query. Il confronto è sugli estremi, non su un id. */
export function isAmountChosen(
  choice: AmountChoice,
  current: { minCents?: Cents; maxCents?: Cents },
): boolean {
  return (
    current.minCents === choice.minCents &&
    (choice.maxCents === null
      ? current.maxCents === undefined
      : current.maxCents === choice.maxCents)
  );
}
