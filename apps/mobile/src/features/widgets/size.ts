/**
 * Quanto è grande il rettangolo, e cosa ci sta dentro.
 *
 * **Il widget si ridimensiona da sempre** — `resizeMode` è `horizontal|vertical` in
 * `app.json` dallo Step 34 — ma finora l'unica cosa che cambiava era il corpo del carattere,
 * per via di `adjustsFontSizeToFit`. Un rettangolo largo il doppio mostrava le stesse tre
 * righe più grandi: è lì che «graficamente statico» si vedeva di più.
 *
 * **Due tagli e non cinque.** Ogni taglio in più è una combinazione da provare col telefono
 * in mano su un launcher che decide lui le celle, e la differenza fra «stretto» e «largo» è
 * l'unica che si legge davvero: o la striscia ci sta, o non ci sta.
 *
 * **Sta in un file suo, e senza la libreria dei widget.** I percorsi che disegnano sono due —
 * il task headless e l'app — e devono decidere **uguale**: una funzione sola, pura, con i
 * suoi test, è ciò che impedisce alle due strade di divergere. Importare qui
 * `react-native-android-widget` renderebbe il file non testabile, che è esattamente il modo
 * in cui la regola smetterebbe di essere verificata.
 */

/** I due tagli. `compact` è il ripiego che non taglia mai niente. */
export type WidgetSize = 'compact' | 'full';

/**
 * Le misure che servono, in dp. È un sottoinsieme di `WidgetInfo`: prendere l'oggetto intero
 * legherebbe questo file ai tipi della libreria, che è quello che il commento sopra evita.
 */
export interface WidgetBox {
  width: number;
  height: number;
}

/**
 * Da quanti dp in su ci sta anche la striscia.
 *
 * `app.json` dichiara `minWidth: 180dp`, `minHeight: 110dp` e una cella bersaglio di 3×2. Una
 * cella della home sta fra i 70 e gli 80 dp, quindi due celle in larghezza fanno circa 160 dp
 * e tre circa 250: la soglia a **210** cade in mezzo, cioè stringere a due celle toglie la
 * striscia e riallargare a tre la rimette — che è il gesto descritto nel criterio di «fatto».
 *
 * L'altezza ha una soglia sua perché si può stringere in due versi: a 110 dp le tre righe di
 * testo e il padding hanno già finito lo spazio, e infilarci un grafico vorrebbe dire
 * schiacciare la cifra, cioè la ragione per cui il widget è sulla home.
 */
export const FULL_MIN_WIDTH = 210;
export const FULL_MIN_HEIGHT = 130;

/**
 * Il taglio, da una misura.
 *
 * **Una misura che non c'è vale `compact`**, e la direzione dell'errore è scelta: `compact`
 * su un rettangolo grande lascia dello spazio vuoto per un giro di disegno, `full` su uno
 * piccolo taglia il testo a metà — e un widget con la cifra troncata si legge come un'app
 * rotta, che è il difetto peggiore che un widget possa avere. Lo stesso vale per uno zero o
 * un `NaN`, che è come arriva una misura che il launcher non ha saputo dare.
 */
export function widgetSize(box: WidgetBox | null | undefined): WidgetSize {
  if (box === null || box === undefined) return 'compact';
  const { width, height } = box;
  if (!Number.isFinite(width) || !Number.isFinite(height)) return 'compact';
  return width >= FULL_MIN_WIDTH && height >= FULL_MIN_HEIGHT ? 'full' : 'compact';
}
