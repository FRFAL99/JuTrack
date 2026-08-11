/**
 * Treemap: rettangoli di area proporzionale al valore.
 *
 * Algoritmo *squarified* (Bruls, Huizing, van Wijk): riempie una riga alla volta finché
 * l'aggiunta del rettangolo successivo peggiora il rapporto fra i lati, poi comincia una
 * riga nuova. Rispetto alla suddivisione ingenua a strisce produce forme vicine al
 * quadrato, e un rettangolo lungo e sottile è un'area che l'occhio non sa confrontare.
 *
 * **Deterministico a parità di input**, come ogni altro ordinamento del progetto: a parità
 * di valore decide l'id, così i due telefoni disegnano la stessa mappa.
 */

export interface TreemapInput {
  id: string;
  value: number;
}

export interface TreemapRect {
  id: string;
  value: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TreemapArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * I rettangoli che coprono l'area, dal valore più grande al più piccolo.
 *
 * I valori non positivi vengono scartati: un'area zero non è disegnabile e un valore
 * negativo non ha significato qui. Con niente da disporre si restituisce l'elenco vuoto.
 */
export function squarify(items: TreemapInput[], area: TreemapArea): TreemapRect[] {
  const usable = items
    .filter((item) => item.value > 0 && Number.isFinite(item.value))
    .sort((a, b) => b.value - a.value || (a.id < b.id ? -1 : 1));

  if (usable.length === 0 || area.width <= 0 || area.height <= 0) return [];

  const total = usable.reduce((sum, item) => sum + item.value, 0);
  // Si lavora in unità di area: ogni valore vale una fetta della superficie disponibile.
  const scale = (area.width * area.height) / total;
  const scaled = usable.map((item) => ({ ...item, area: item.value * scale }));

  const out: TreemapRect[] = [];
  let free: TreemapArea = { ...area };
  let row: typeof scaled = [];
  let index = 0;

  while (index < scaled.length) {
    const side = Math.min(free.width, free.height);
    const candidate = scaled[index] as (typeof scaled)[number];
    const next = [...row, candidate];

    // Finché aggiungere il prossimo migliora (o pareggia) il rapporto peggiore della riga,
    // conviene tenerlo qui: è tutto il criterio dell'algoritmo.
    if (row.length === 0 || worstRatio(next, side) <= worstRatio(row, side)) {
      row = next;
      index++;
      continue;
    }

    free = placeRow(row, free, out);
    row = [];
  }

  if (row.length > 0) placeRow(row, free, out);
  return out;
}

/** Il rapporto lato lungo/lato corto peggiore della riga. Più è vicino a 1, più è quadrata. */
function worstRatio(row: { area: number }[], side: number): number {
  if (row.length === 0 || side <= 0) return Infinity;
  const sum = row.reduce((acc, item) => acc + item.area, 0);
  if (sum <= 0) return Infinity;

  const thickness = sum / side;
  return row.reduce((worst, item) => {
    const length = item.area / thickness;
    const ratio = Math.max(length / thickness, thickness / length);
    return Math.max(worst, ratio);
  }, 0);
}

/**
 * Dispone una riga sul lato corto dell'area libera e restituisce ciò che resta.
 *
 * L'ultimo rettangolo della riga si chiude **sul bordo** invece che sulla propria misura
 * calcolata: gli arrotondamenti in virgola mobile lascerebbero altrimenti una fessura di
 * frazioni di pixel fra la riga e il bordo, visibile come una riga di sfondo.
 */
function placeRow(
  row: { id: string; value: number; area: number }[],
  free: TreemapArea,
  out: TreemapRect[],
): TreemapArea {
  const sum = row.reduce((acc, item) => acc + item.area, 0);
  const horizontal = free.width >= free.height;
  const side = horizontal ? free.height : free.width;
  const thickness = side === 0 ? 0 : sum / side;

  let offset = 0;
  row.forEach((item, i) => {
    const last = i === row.length - 1;
    const length = last ? side - offset : item.area / (thickness === 0 ? 1 : thickness);

    out.push({
      id: item.id,
      value: item.value,
      x: horizontal ? free.x : free.x + offset,
      y: horizontal ? free.y + offset : free.y,
      width: horizontal ? thickness : length,
      height: horizontal ? length : thickness,
    });

    offset += length;
  });

  return horizontal
    ? { x: free.x + thickness, y: free.y, width: free.width - thickness, height: free.height }
    : { x: free.x, y: free.y + thickness, width: free.width, height: free.height - thickness };
}
