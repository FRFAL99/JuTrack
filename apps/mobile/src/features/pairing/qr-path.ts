import qrcode from 'qrcode-generator';

/**
 * Dalla stringa da codificare al disegno del QR.
 *
 * Separato dal componente perché qui sta l'unica parte con una logica da verificare, e
 * il componente importa `react-native`, che i test dell'app non caricano.
 */

/**
 * Zona di quiete attorno al simbolo, in moduli.
 *
 * Quattro moduli è il minimo previsto dallo standard: senza, i lettori faticano a
 * distinguere il bordo del codice dallo sfondo e la scansione diventa capricciosa.
 */
export const QUIET_ZONE = 4;

export interface QrPath {
  /** Path SVG con un quadratino per ogni modulo scuro. */
  path: string;
  /** Lato del disegno in moduli, zona di quiete inclusa: è il viewBox. */
  extent: number;
}

/**
 * Costruisce il path di un QR in un unico tracciato.
 *
 * Un nodo per modulo — oltre un migliaio per un codice di media dimensione — sarebbe
 * pesante da montare a ogni rigenerazione dell'invito. Un path solo si costruisce una
 * volta e resta un unico nodo nativo.
 */
export function buildQrPath(value: string): QrPath {
  // Versione automatica (0) e correzione media: la 'M' recupera circa il 15% del
  // simbolo, abbastanza per un riflesso sullo schermo senza infittire la griglia.
  const qr = qrcode(0, 'M');
  qr.addData(value, 'Byte');
  qr.make();

  const count = qr.getModuleCount();
  let path = '';
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) {
        path += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
      }
    }
  }

  return { path, extent: count + QUIET_ZONE * 2 };
}
