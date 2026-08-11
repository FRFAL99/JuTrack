/**
 * Il colore del testo che sta **sopra** una tinta.
 *
 * Serve al treemap, che è il primo punto dell'app in cui una scritta finisce dentro il
 * colore di una categoria invece che accanto. I colori di default sembrano tutti scuri, e
 * il bianco fisso pareva bastare: non basta. Metà di quegli otto — l'arancione, il turchese,
 * l'ocra, il grigio — hanno luminanza abbastanza alta da reggere meglio una scritta scura,
 * e su di essi il bianco dà un contrasto sotto 3,7:1. In più una categoria la si può creare
 * a mano: con un giallo chiaro il nome sparirebbe del tutto.
 *
 * **Non c'è una soglia di luminanza, si confrontano i due contrasti veri.** La soglia WCAG
 * (0,179) vale contro il bianco e il nero puri, e i due inchiostri qui non lo sono: contro
 * `#14141B` e `#FFFFFF` quella soglia sbaglia proprio sui verdi medio-scuri come `#2B8A3E`,
 * dove indicherebbe il testo scuro mentre il chiaro contrasta di più. Calcolare entrambi i
 * rapporti costa due divisioni e non ha casi limite da ricordare.
 */

/** I due inchiostri: gli stessi `text` delle due palette, presi come valori fissi. */
const LIGHT_INK = '#FFFFFF';
const DARK_INK = '#14141B';

const LIGHT_LUMINANCE = 1;
const DARK_LUMINANCE = 0.00625;

export function inkOn(background: string): string {
  const luminance = relativeLuminance(background);
  // Un colore che non si riesce a leggere si tratta come scuro: nel dubbio il chiaro è il
  // ripiego che sbaglia più di rado, perché i colori scelti a mano restano quasi sempre
  // saturi e medio-scuri.
  if (luminance === null) return LIGHT_INK;

  return contrast(LIGHT_LUMINANCE, luminance) >= contrast(DARK_LUMINANCE, luminance)
    ? LIGHT_INK
    : DARK_INK;
}

/** Rapporto di contrasto WCAG fra due luminanze relative. */
function contrast(one: number, other: number): number {
  const lighter = Math.max(one, other);
  const darker = Math.min(one, other);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Luminanza relativa secondo WCAG, oppure `null` se non è un colore esadecimale. */
function relativeLuminance(color: string): number | null {
  const rgb = parseHex(color);
  if (rgb === null) return null;
  // Destrutturata da una tupla e non da un array: qui i tre canali ci sono per tipo.
  const [red, green, blue] = rgb;
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

function channel(value: number): number {
  const ratio = value / 255;
  return ratio <= 0.04045 ? ratio / 12.92 : Math.pow((ratio + 0.055) / 1.055, 2.4);
}

/** Accetta `#RGB` e `#RRGGBB`, con o senza cancelletto. Il canale alfa non entra. */
function parseHex(color: string): [number, number, number] | null {
  const hex = color.trim().replace('#', '');
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((digit) => digit + digit)
          .join('')
      : hex;

  if (!/^[0-9a-fA-F]{6}$/.test(full.slice(0, 6)) || (full.length !== 6 && full.length !== 8)) {
    return null;
  }

  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}
