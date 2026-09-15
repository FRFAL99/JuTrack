import { describe, expect, it } from 'vitest';
import { leftover, newTaken, tokenize } from './tokens';
import { findWords } from './words';
import type { Category } from '../model/types';
import type { ParseContext } from './types';

const categories: Category[] = [
  { id: 'c1', name: 'Spesa', icon: '🛒', color: '#4c8bf5', archived: false },
  { id: 'c2', name: 'Casa', icon: '🏠', color: '#7bc67b', archived: false },
  { id: 'c3', name: 'Vecchia', icon: '📦', color: '#999999', archived: true },
];

const context: ParseContext = {
  today: '2026-09-15',
  members: [],
  myMemberId: 'm1',
  categories,
  stores: ['Esselunga', 'Mercato Centrale'],
  tags: ['regalo', 'Vacanza Estate'],
};

function read(text: string) {
  const tokens = tokenize(text);
  const taken = newTaken(tokens.length);
  const match = findWords(tokens, taken, context);
  return {
    store: match.store?.value ?? '',
    tags: match.tags.map((tag) => tag.value),
    categoryId: match.category?.value ?? null,
    resto: leftover(tokens, taken),
  };
}

describe('findWords', () => {
  it('riconosce negozio e categoria nella stessa frase', () => {
    expect(read('spesa esselunga')).toEqual({
      store: 'Esselunga',
      tags: [],
      categoryId: 'c1',
      resto: '',
    });
  });

  it('propone la grafia del vocabolario, non quella digitata', () => {
    // È ciò che tiene «esselunga» ed «Esselunga» un negozio solo.
    expect(read('ESSELUNGA').store).toBe('Esselunga');
  });

  it('non inventa niente: una parola mai vista finisce nella nota', () => {
    // Il test che protegge la decisione 2. Un parser che battezza un negozio a ogni parola
    // sconosciuta trasforma «top negozi» in una classifica di refusi, e lo fa in silenzio.
    expect(read('pranzo da zio Piero al lago')).toEqual({
      store: '',
      tags: [],
      categoryId: null,
      resto: 'pranzo da zio Piero al lago',
    });
  });

  it('preferisce la sequenza più lunga', () => {
    // Senza questo, «Mercato Centrale» diventerebbe il negozio «Mercato» e una nota.
    expect(read('mercato centrale')).toEqual({
      store: 'Mercato Centrale',
      tags: [],
      categoryId: null,
      resto: '',
    });
  });

  it('riconosce un tag di due parole, e il cancelletto non dà fastidio', () => {
    expect(read('#vacanza estate').tags).toEqual(['Vacanza Estate']);
  });

  it('prende più tag e non li ripete', () => {
    expect(read('regalo regalo').tags).toEqual(['regalo']);
  });

  it('non propone una categoria archiviata', () => {
    expect(read('vecchia')).toEqual({ store: '', tags: [], categoryId: null, resto: 'vecchia' });
  });

  it('si ferma al primo negozio: due negozi in una spesa non vogliono dire niente', () => {
    const match = read('esselunga mercato centrale');
    expect(match.store).toBe('Esselunga');
    expect(match.resto).toBe('mercato centrale');
  });

  it('salta ciò che un riconoscitore precedente si è già preso', () => {
    const tokens = tokenize('spesa esselunga');
    const taken = newTaken(tokens.length);
    taken[1] = true;
    const match = findWords(tokens, taken, context);
    expect(match.store).toBeNull();
    expect(match.category?.value).toBe('c1');
  });
});
