/**
 * La geometria dei grafici: numeri che entrano, numeri che escono.
 *
 * Nessun import da react-native — lo vieta `eslint.config.mjs` su tutto `packages/core` — ed
 * è quel divieto a rendere provabile in Node ciò che altrimenti si potrebbe verificare solo
 * guardando uno schermo.
 */
export { bandScale, linearScale, niceTicks, type Band } from './scale';

export { areaPath, arcPath, linePath, smoothLinePath, type Point } from './path';

export { squarify, type TreemapArea, type TreemapInput, type TreemapRect } from './treemap';

export { binsFor, AMOUNT_BINS, type AmountBin } from './bins';
