/**
 * Da numeri a pixel.
 *
 * Le scale stanno qui e non nei componenti per la stessa ragione dei totali: sono la parte
 * che può essere sbagliata in silenzio, e una barra alta il doppio del dovuto non si nota
 * guardando un grafico. `eslint.config.mjs` vieta a `packages/core` di importare
 * react-native, ed è quel divieto a garantire che questa geometria resti provabile in Node.
 */

/**
 * Mappa un intervallo di valori su un intervallo di coordinate.
 *
 * **Un dominio piatto non divide per zero**: quando tutti i valori sono uguali — o non ce
 * n'è nessuno — la funzione restituisce il **centro** dell'intervallo. Un `NaN` propagato
 * in un attributo SVG non disegna niente e non segnala niente: sparirebbe un grafico senza
 * che nulla lo dica.
 */
export function linearScale(
  domain: [number, number],
  range: [number, number],
): (value: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0;

  if (span === 0 || !Number.isFinite(span)) {
    const middle = (r0 + r1) / 2;
    return () => middle;
  }

  return (value: number) => r0 + ((value - d0) / span) * (r1 - r0);
}

export interface Band {
  /** Distanza fra l'inizio di una banda e l'inizio della successiva. */
  step: number;
  /** Larghezza della marca, `step` meno lo spazio fra le bande. */
  bandWidth: number;
  /** Coordinata iniziale della banda `i`. */
  at: (index: number) => number;
  /** Centro della banda `i`, dove va l'etichetta. */
  center: (index: number) => number;
}

/**
 * Bande di uguale larghezza per barre e istogrammi.
 *
 * `padding` è la quota di `step` lasciata vuota fra una barra e l'altra, fra 0 e 1 — la
 * stessa convenzione di d3, così chi conosce quella non deve reimpararla. Con zero bande
 * si restituisce comunque un oggetto usabile: un grafico vuoto non deve far saltare la
 * schermata che lo contiene.
 */
export function bandScale(count: number, width: number, padding = 0.2): Band {
  const safeCount = Math.max(0, Math.floor(count));
  const gap = Math.min(Math.max(padding, 0), 0.99);
  const step = safeCount === 0 ? 0 : width / safeCount;
  const bandWidth = step * (1 - gap);
  const offset = (step - bandWidth) / 2;

  return {
    step,
    bandWidth,
    at: (index: number) => index * step + offset,
    center: (index: number) => index * step + step / 2,
  };
}

/**
 * Valori tondi per le linee guida di un asse.
 *
 * Tondi in base 10 (1, 2, 5 e i loro multipli) perché è così che si leggono i soldi: un
 * asse a 0 · 3333 · 6667 · 10000 è matematicamente ineccepibile e illeggibile.
 *
 * Il conteggio richiesto è **indicativo**: si preferisce un passo tondo a un numero esatto
 * di tacche, quindi ne possono uscire una in più o una in meno.
 */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (count < 1) return [];
  if (min === max) return [min];

  const low = Math.min(min, max);
  const high = Math.max(min, max);
  const step = niceStep((high - low) / count);
  if (step === 0) return [low];

  const first = Math.ceil(low / step) * step;
  const ticks: number[] = [];
  // Il limite protegge da un passo minuscolo su un intervallo enorme, che riempirebbe la
  // memoria mentre la schermata è in disegno.
  for (let value = first, i = 0; value <= high + step / 1000 && i < 1000; value += step, i++) {
    // L'accumulo in virgola mobile produce 0.30000000000000004: si arrotonda al passo.
    ticks.push(Math.round(value / step) * step);
  }
  return ticks;
}

/** Il valore tondo più vicino a `rough`, fra 1, 2, 5 e i loro multipli di dieci. */
function niceStep(rough: number): number {
  if (rough <= 0) return 0;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const normalized = rough / magnitude;
  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
}
