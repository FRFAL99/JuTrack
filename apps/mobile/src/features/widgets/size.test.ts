import { describe, expect, it } from 'vitest';
import { FULL_MIN_HEIGHT, FULL_MIN_WIDTH, widgetSize } from './size';

/**
 * È la funzione che i **due** percorsi di disegno devono condividere — il task headless e
 * l'app — e provarla qui vale per tutti e due. È anche l'unica parte del disegno che si possa
 * provare senza il modulo nativo, che nei test non esiste.
 */
describe('widgetSize', () => {
  it('dà il taglio pieno quando il rettangolo è abbastanza grande in tutti e due i versi', () => {
    expect(widgetSize({ width: 250, height: 160 })).toBe('full');
  });

  it('dà il taglio pieno esattamente sulla soglia', () => {
    // Il confronto è `>=`: una soglia che si incontra è una soglia raggiunta, e un widget
    // largo esattamente quanto basta non deve perdere la striscia.
    expect(widgetSize({ width: FULL_MIN_WIDTH, height: FULL_MIN_HEIGHT })).toBe('full');
  });

  it('stringe quando manca la larghezza, anche se l’altezza abbonda', () => {
    // È il gesto del criterio di «fatto»: da tre celle a due.
    expect(widgetSize({ width: FULL_MIN_WIDTH - 1, height: 300 })).toBe('compact');
  });

  it('stringe quando manca l’altezza, anche se la larghezza abbonda', () => {
    // Si può stringere in due versi, e schiacciare la cifra per far posto a un grafico
    // sarebbe togliere la ragione per cui il widget è sulla home.
    expect(widgetSize({ width: 400, height: FULL_MIN_HEIGHT - 1 })).toBe('compact');
  });

  it('ripiega su compatto quando la misura non c’è', () => {
    // La direzione dell'errore è scelta: spazio vuoto per un giro di disegno invece di una
    // cifra tagliata a metà, che si legge come un'app rotta.
    expect(widgetSize(null)).toBe('compact');
    expect(widgetSize(undefined)).toBe('compact');
  });

  it('ripiega su compatto davanti a una misura che non è un numero', () => {
    // È così che arriva una misura che il launcher non ha saputo dare.
    expect(widgetSize({ width: 0, height: 0 })).toBe('compact');
    expect(widgetSize({ width: Number.NaN, height: 200 })).toBe('compact');
    expect(widgetSize({ width: 300, height: Number.POSITIVE_INFINITY })).toBe('compact');
  });
});
