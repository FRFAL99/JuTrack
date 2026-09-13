import { afterEach, describe, expect, it } from 'vitest';
import { parseAmount } from '@jutrack/core';
import i18n from '@/i18n';
import { BACKSPACE, applyKey, decimalKey } from './amount-pad';

/** Il testo che si ottiene battendo i tasti uno dopo l'altro, partendo dal campo vuoto. */
function type(...keys: string[]): string {
  return keys.reduce((text, key) => applyKey(text, key), '');
}

describe('applyKey', () => {
  it('accoda le cifre', () => {
    expect(type('1', '2', '3')).toBe('123');
  });

  it('cancella l ultimo carattere', () => {
    expect(applyKey('12,5', BACKSPACE)).toBe('12,');
    expect(applyKey('12,', BACKSPACE)).toBe('12');
  });

  it('cancellare a campo vuoto non fa niente', () => {
    expect(applyKey('', BACKSPACE)).toBe('');
  });

  it('ignora un tasto che non è una cifra né un separatore', () => {
    // Non capita dal tastierino, che ha dodici tasti: capita se un domani qualcuno ne
    // aggiunge uno e dimentica di insegnarlo a questa funzione.
    expect(applyKey('12', 'e')).toBe('12');
    expect(applyKey('12', '')).toBe('12');
  });
});

describe('il separatore decimale', () => {
  it('si scrive una volta sola', () => {
    // È il caso che `keyboardType="decimal-pad"` impediva da solo: senza, il campo
    // mostrerebbe «1,2,3» e l errore comparirebbe solo al salvataggio.
    expect(type('1', ',', '2', ',', '3')).toBe('1,23');
  });

  it('non conta un secondo separatore nemmeno se è l altro dei due', () => {
    // Chi cambia lingua con la schermata aperta ha un «12,5» scritto in italiano e un tasto
    // che adesso scrive il punto.
    expect(applyKey('12,5', '.')).toBe('12,5');
    expect(applyKey('12.5', ',')).toBe('12.5');
  });

  it('in testa si scrive dietro uno zero', () => {
    expect(type(',', '5', '0')).toBe('0,50');
  });
});

describe('i decimali', () => {
  it('si fermano a due', () => {
    expect(type('1', ',', '2', '3', '4')).toBe('1,23');
  });

  it('restano due anche cancellando e riscrivendo', () => {
    const text = applyKey(type('1', ',', '2', '3'), BACKSPACE);
    expect(applyKey(text, '9')).toBe('1,29');
  });
});

describe('lo zero iniziale', () => {
  it('lascia il posto alla prima cifra vera', () => {
    expect(type('0', '5')).toBe('5');
  });

  it('non si accumula', () => {
    expect(type('0', '0', '0')).toBe('0');
  });

  it('resta se dopo arriva il separatore', () => {
    expect(type('0', ',', '9', '9')).toBe('0,99');
  });
});

describe('il tetto alle cifre intere', () => {
  it('si ferma a nove cifre', () => {
    expect(type(...'1234567890'.split(''))).toBe('123456789');
  });

  it('non impedisce i decimali una volta raggiunto', () => {
    expect(type(...'123456789'.split(''), ',', '5')).toBe('123456789,5');
  });
});

describe('tutto ciò che si può digitare', () => {
  it('è un importo che parseAmount accetta', () => {
    // La garanzia che serve davvero: qualunque sequenza di tasti produce un testo che il
    // core sa leggere, o il campo vuoto. Mai un testo che si vede a schermo e che fallisce
    // al salvataggio.
    const keys = ['0', '1', '5', '9', ',', '.', BACKSPACE];
    let text = '';
    for (let i = 0; i < 3000; i++) {
      text = applyKey(text, keys[(i * 7 + (i % 5)) % keys.length] ?? '0');
      expect(text === '' || parseAmount(text) !== null).toBe(true);
    }
  });
});

describe('decimalKey', () => {
  afterEach(async () => {
    await i18n.changeLanguage('it');
  });

  it('in italiano è la virgola', () => {
    expect(decimalKey()).toBe(',');
  });

  it('in inglese è il punto', async () => {
    // In inglese la virgola separa le migliaia. Un tasto che la scrivesse fisso darebbe
    // «12,50» — che chi legge intende dodicimilacinquanta — e su «1,234» `parseAmount`
    // tornerebbe nullo, perché conta tre decimali. Nessuno dei due si vede digitando.
    await i18n.changeLanguage('en');
    expect(decimalKey()).toBe('.');
  });
});
