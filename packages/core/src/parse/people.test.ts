import { describe, expect, it } from 'vitest';
import { ITALIAN_LEXICON } from './lexicon';
import { findPeople } from './people';
import { leftover, newTaken, tokenize } from './tokens';
import type { Member } from '../model/types';
import type { ParseContext } from './types';

const fra: Member = { id: 'm1', name: 'Fra', color: '#4c8bf5' };
const giulia: Member = { id: 'm2', name: 'Giulia', color: '#e0645a' };
const anna: Member = { id: 'm3', name: 'Anna Maria', color: '#7bc67b' };

function contextOf(members: Member[]): ParseContext {
  return {
    today: '2026-09-15',
    members,
    myMemberId: 'm1',
    categories: [],
    stores: [],
    tags: [],
  };
}

const coppia = contextOf([fra, giulia]);
const trio = contextOf([fra, giulia, anna]);

function read(text: string, context = coppia) {
  const tokens = tokenize(text);
  const taken = newTaken(tokens.length);
  const match = findPeople(tokens, taken, context, ITALIAN_LEXICON);
  return { ...match, resto: leftover(tokens, taken) };
}

describe('chi ha pagato', () => {
  it('legge «pagato da» col nome del membro', () => {
    expect(read('pagato da Giulia').paidBy?.memberId).toBe('m2');
  });

  it('legge il marcatore che segue la persona', () => {
    expect(read('io pago').paidBy?.memberId).toBe('m1');
  });

  it('legge un nome di due parole senza spezzarlo', () => {
    const match = read('pagato da Anna Maria', trio);
    expect(match.paidBy?.memberId).toBe('m3');
    expect(match.resto).toBe('');
  });

  it('consuma il marcatore insieme alla persona', () => {
    expect(read('pizza pagata da Giulia').resto).toBe('pizza');
  });

  it('senza marcatore non deduce niente: un nome da solo resta nella nota', () => {
    const match = read('regalo per Giulia');
    expect(match.paidBy).toBeNull();
    expect(match.resto).toBe('regalo per Giulia');
  });
});

describe('i pronomi', () => {
  it('«io» vale sempre e risolve a chi scrive', () => {
    expect(read('offro io', trio).paidBy?.memberId).toBe('m1');
  });

  it('«te» vale solo in un gruppo di due', () => {
    expect(read('paga te').paidBy?.memberId).toBe('m2');
  });

  it('«te» in un gruppo di tre non compila niente e resta nella nota', () => {
    const match = read('paga te', trio);
    expect(match.paidBy).toBeNull();
    expect(match.resto).toBe('paga te');
  });

  it('un nome proprio invece vale anche in un gruppo di tre', () => {
    expect(read('paga Anna Maria', trio).paidBy?.memberId).toBe('m3');
  });
});

describe('la divisione', () => {
  it('legge «metà» con e senza preposizione', () => {
    expect(read('a metà').split?.split).toEqual({ mode: 'equal', memberId: null });
    expect(read('metà').split?.split).toEqual({ mode: 'equal', memberId: null });
  });

  it('si prende la persona che la segue, e la preposizione in mezzo', () => {
    const match = read('metà a te');
    expect(match.split?.split).toEqual({ mode: 'equal', memberId: null });
    expect(match.resto).toBe('');
  });

  it('accetta «meta» senza accento', () => {
    expect(read('meta a te').split?.split.mode).toBe('equal');
  });

  it('legge «tutto» a carico di una persona sola', () => {
    expect(read('tutto io').split?.split).toEqual({ mode: 'single', memberId: 'm1' });
    expect(read('tutta a Giulia').split?.split).toEqual({ mode: 'single', memberId: 'm2' });
  });

  it('«tutto» senza una persona non vuol dire niente e resta nella nota', () => {
    const match = read('tutto il giorno');
    expect(match.split).toBeNull();
    expect(match.resto).toBe('tutto il giorno');
  });

  it('in un gruppo di tre «metà a te» resta una divisione, ma «te» torna nella nota', () => {
    const match = read('metà a te', trio);
    expect(match.split?.split.mode).toBe('equal');
    expect(match.resto).toBe('a te');
  });
});

describe('chi paga e come si divide, nella stessa frase', () => {
  it('non si rubano la stessa persona', () => {
    const match = read('pagato da Giulia metà a te');
    expect(match.paidBy?.memberId).toBe('m2');
    expect(match.split?.split.mode).toBe('equal');
    expect(match.resto).toBe('');
  });
});
