/**
 * I tracciati SVG, come stringhe.
 *
 * Coordinate già in pixel: le scale le ha applicate chi chiama. Qui si decide solo la
 * **forma** della curva, che è la parte che può mentire.
 */

export interface Point {
  x: number;
  y: number;
}

/** Decimali tenuti nei tracciati: sotto il centesimo di pixel nessuno schermo distingue. */
const PRECISION = 2;

/** Spezzata che unisce i punti. Stringa vuota senza punti, che l'SVG ignora. */
export function linePath(points: Point[]): string {
  if (points.length === 0) return '';
  return points.map((point, i) => `${i === 0 ? 'M' : 'L'}${pair(point)}`).join(' ');
}

/**
 * La stessa spezzata chiusa sulla linea di base, per l'area sotto la curva.
 *
 * `baselineY` è una coordinata, non un valore: in SVG l'asse y cresce verso il basso, e il
 * fondo del grafico è la y **più grande**.
 */
export function areaPath(points: Point[], baselineY: number): string {
  if (points.length === 0) return '';
  const first = points[0] as Point;
  const last = points[points.length - 1] as Point;
  return `${linePath(points)} L${num(last.x)},${num(baselineY)} L${num(first.x)},${num(baselineY)} Z`;
}

/**
 * Curva morbida che **non scavalca i punti**: cubica monotona, non spline naturale.
 *
 * È la differenza fra un grafico più morbido e un grafico che mente. Fra due mesi bassi e
 * uno alto, una spline naturale supera i valori che collega e scende **sotto la linea di
 * base**: disegnerebbe una spesa negativa in un mese in cui si è speso poco. La monotona
 * (Fritsch–Carlson) annulla la tangente a ogni cambio di pendenza, quindi resta sempre
 * dentro l'intervallo dei valori che unisce.
 *
 * L'implementazione è la stessa idea di `curveMonotoneX` di d3, scritta qui perché costa
 * quaranta righe e una dipendenza no.
 */
export function smoothLinePath(points: Point[]): string {
  if (points.length < 3) return linePath(points);

  const n = points.length;
  const slopes: number[] = [];
  const widths: number[] = [];

  for (let i = 0; i < n - 1; i++) {
    const a = points[i] as Point;
    const b = points[i + 1] as Point;
    const h = b.x - a.x;
    widths.push(h);
    // Due punti sulla stessa ascissa non hanno pendenza: trattarli come piatti è l'unica
    // scelta che non produce infinito.
    slopes.push(h === 0 ? 0 : (b.y - a.y) / h);
  }

  const tangents: number[] = new Array<number>(n);
  tangents[0] = slopes[0] as number;
  tangents[n - 1] = slopes[n - 2] as number;

  for (let i = 1; i < n - 1; i++) {
    const previous = slopes[i - 1] as number;
    const next = slopes[i] as number;
    if (previous * next <= 0) {
      // Cambio di direzione — o un tratto piatto: tangente nulla. È **questa** riga a
      // impedire lo scavalcamento, e quindi la spesa negativa disegnata.
      tangents[i] = 0;
      continue;
    }
    const hPrevious = widths[i - 1] as number;
    const hNext = widths[i] as number;
    const weight = hPrevious + hNext;
    tangents[i] = (3 * weight) / ((weight + hNext) / previous + (weight + hPrevious) / next);
  }

  let path = `M${pair(points[0] as Point)}`;
  for (let i = 0; i < n - 1; i++) {
    const a = points[i] as Point;
    const b = points[i + 1] as Point;
    const third = (widths[i] as number) / 3;
    const c1 = { x: a.x + third, y: a.y + (tangents[i] as number) * third };
    const c2 = { x: b.x - third, y: b.y - (tangents[i + 1] as number) * third };
    path += ` C${pair(c1)} ${pair(c2)} ${pair(b)}`;
  }
  return path;
}

/**
 * Uno spicchio di ciambella: arco esterno, raggio, arco interno di ritorno.
 *
 * Angoli in radianti, zero **a ore dodici** e crescenti in senso orario — che è come si
 * legge una ciambella, non come li conta la trigonometria. Con `innerRadius` a zero viene
 * una fetta di torta.
 */
export function arcPath(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
): string {
  const sweep = endAngle - startAngle;
  if (sweep <= 0 || outerRadius <= 0) return '';

  // Un giro completo con un arco solo non si disegna: inizio e fine coincidono e l'SVG non
  // traccia nulla. Si spezza in due mezzi archi.
  if (sweep >= Math.PI * 2) {
    const half = startAngle + Math.PI;
    return `${arcPath(cx, cy, outerRadius, innerRadius, startAngle, half)} ${arcPath(cx, cy, outerRadius, innerRadius, half, startAngle + Math.PI * 2)}`;
  }

  const large = sweep > Math.PI ? 1 : 0;
  const outerStart = onCircle(cx, cy, outerRadius, startAngle);
  const outerEnd = onCircle(cx, cy, outerRadius, endAngle);

  if (innerRadius <= 0) {
    return (
      `M${num(cx)},${num(cy)} L${pair(outerStart)} ` +
      `A${num(outerRadius)},${num(outerRadius)} 0 ${large} 1 ${pair(outerEnd)} Z`
    );
  }

  const innerEnd = onCircle(cx, cy, innerRadius, endAngle);
  const innerStart = onCircle(cx, cy, innerRadius, startAngle);

  return (
    `M${pair(outerStart)} ` +
    `A${num(outerRadius)},${num(outerRadius)} 0 ${large} 1 ${pair(outerEnd)} ` +
    `L${pair(innerEnd)} ` +
    `A${num(innerRadius)},${num(innerRadius)} 0 ${large} 0 ${pair(innerStart)} Z`
  );
}

/** Punto sulla circonferenza, con lo zero a ore dodici e il verso orario. */
function onCircle(cx: number, cy: number, radius: number, angle: number): Point {
  return { x: cx + radius * Math.sin(angle), y: cy - radius * Math.cos(angle) };
}

function pair(point: Point): string {
  return `${num(point.x)},${num(point.y)}`;
}

/** Arrotonda e toglie gli zeri finali: `12.00` diventa `12`, e il tracciato si accorcia. */
function num(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return String(Number(value.toFixed(PRECISION)));
}
