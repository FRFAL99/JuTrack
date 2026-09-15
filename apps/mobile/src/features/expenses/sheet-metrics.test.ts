import { describe, expect, it } from 'vitest';
import { sheetMetrics, SHEET_MAX_FRACTION } from './sheet-metrics';

/** Un telefono verosimile: schermo alto 800, barra di navigazione 24, tastiera 300. */
const SCHERMO = 800;
const SICUREZZA = 24;
const TASTIERA = 300;
const RESPIRO = 12;

function metrics(keyboardHeight: number, windowHeight = SCHERMO) {
  return sheetMetrics({
    windowHeight,
    keyboardHeight,
    safeBottom: SICUREZZA,
    gap: RESPIRO,
  });
}

describe('sheetMetrics, a tastiera chiusa', () => {
  it('non alza il foglio', () => {
    expect(metrics(0).liftBy).toBe(0);
  });

  it('tiene il foglio sopra la barra di navigazione', () => {
    expect(metrics(0).paddingBottom).toBe(SICUREZZA + RESPIRO);
  });

  it('lascia crescere il foglio fino alla frazione dello schermo intero', () => {
    expect(metrics(0).maxHeight).toBe(SCHERMO * SHEET_MAX_FRACTION);
  });
});

describe('sheetMetrics, a tastiera aperta', () => {
  // È il difetto visto sul telefono il 15 settembre: il foglio si apre con `autoFocus`, la
  // tastiera compare da sola, e copriva il campo in cui si stava scrivendo.

  it('alza il foglio esattamente di quanto misura la tastiera', () => {
    expect(metrics(TASTIERA).liftBy).toBe(TASTIERA);
  });

  it('toglie il margine di sicurezza, che in quel momento sta dietro la tastiera', () => {
    // Sommarlo lo stesso aggiungerebbe una striscia di niente fra il foglio e i tasti, cioè
    // spazio tolto alla sola cosa che si sta guardando.
    expect(metrics(TASTIERA).paddingBottom).toBe(RESPIRO);
  });

  it('misura l’altezza massima su ciò che resta, non sullo schermo intero', () => {
    // È la riga che chiude il difetto per davvero: con la frazione presa sullo schermo intero
    // il foglio si alzerebbe e poi si riallungherebbe dentro la tastiera.
    expect(metrics(TASTIERA).maxHeight).toBe((SCHERMO - TASTIERA) * SHEET_MAX_FRACTION);
    expect(metrics(TASTIERA).maxHeight).toBeLessThan(SCHERMO - TASTIERA);
  });

  it('non fa mai sporgere il foglio oltre lo spazio rimasto', () => {
    // La somma di ciò che si alza e di quanto è alto non può superare la finestra: se lo
    // facesse, il foglio tornerebbe sotto la tastiera da cui si è appena tolto.
    const { liftBy, maxHeight } = metrics(TASTIERA);
    expect(liftBy + maxHeight).toBeLessThanOrEqual(SCHERMO);
  });
});

describe('sheetMetrics davanti a misure che non tornano', () => {
  // La direzione dell'errore è scelta: un foglio che non si alza è il difetto che c'era
  // prima, mentre uno alzato di `NaN` sparisce dallo schermo e non lo riporta indietro nessun
  // gesto.

  it('tratta una tastiera negativa o non numerica come chiusa', () => {
    expect(metrics(-100).liftBy).toBe(0);
    expect(metrics(Number.NaN).liftBy).toBe(0);
    expect(metrics(Number.POSITIVE_INFINITY).liftBy).toBe(0);
  });

  it('non alza il foglio più in alto della finestra', () => {
    // Capita con una misura sballata della tastiera, ed è l'unico caso in cui il foglio
    // uscirebbe dallo schermo per non tornare più.
    const { liftBy, maxHeight } = metrics(SCHERMO * 2);
    expect(liftBy).toBe(SCHERMO);
    expect(maxHeight).toBe(0);
  });

  it('regge una finestra che non si è ancora misurata', () => {
    expect(metrics(0, 0).maxHeight).toBe(0);
    expect(metrics(0, Number.NaN).maxHeight).toBe(0);
  });
});
