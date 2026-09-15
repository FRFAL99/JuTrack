import { describe, expect, it } from 'vitest';
import { findDate, looksLikeDate } from './dates';
import { ITALIAN_LEXICON } from './lexicon';
import { newTaken, tokenize } from './tokens';
import type { ParseContext } from './types';

/** Martedì 15 settembre 2026. Il resto del contesto qui non serve a niente. */
const context: ParseContext = {
  today: '2026-09-15',
  members: [],
  myMemberId: 'm1',
  categories: [],
  stores: [],
  tags: [],
};

function dateOf(text: string, today = context.today): string | null {
  const tokens = tokenize(text);
  const match = findDate(tokens, newTaken(tokens.length), { ...context, today }, ITALIAN_LEXICON);
  return match?.date ?? null;
}

describe('le parole del lessico', () => {
  it('legge oggi, ieri e l altro ieri', () => {
    expect(dateOf('spesa oggi')).toBe('2026-09-15');
    expect(dateOf('spesa ieri')).toBe('2026-09-14');
    expect(dateOf("spesa l'altro ieri")).toBe('2026-09-13');
  });

  it('accetta la forma senza accento, che è come si scrive in fretta', () => {
    expect(dateOf('spesa lunedi')).toBe('2026-09-14');
    expect(dateOf('spesa lunedì')).toBe('2026-09-14');
  });
});

describe('i giorni della settimana', () => {
  it('sono sempre quelli appena passati', () => {
    expect(dateOf('venerdì')).toBe('2026-09-11');
    expect(dateOf('mercoledì')).toBe('2026-09-09');
  });

  it('valgono oggi quando oggi è quel giorno', () => {
    expect(dateOf('martedì')).toBe('2026-09-15');
  });

  it('si lasciano seguire da «scorso» senza cambiare risposta', () => {
    const tokens = tokenize('venerdì scorso');
    const match = findDate(tokens, newTaken(tokens.length), context, ITALIAN_LEXICON);
    expect(match).toEqual({ date: '2026-09-11', from: 0, to: 1 });
  });
});

describe('le date scritte in cifre', () => {
  it('legge 3/9 come il 3 settembre più recente', () => {
    expect(dateOf('spesa 3/9')).toBe('2026-09-03');
  });

  it('torna all anno prima invece di andare nel futuro', () => {
    expect(dateOf('spesa 16/9')).toBe('2025-09-16');
  });

  it('legge l anno quando c è, a due o a quattro cifre', () => {
    expect(dateOf('spesa 3/9/2025')).toBe('2025-09-03');
    expect(dateOf('spesa 3/9/25')).toBe('2025-09-03');
  });

  it('legge la forma ISO', () => {
    expect(dateOf('spesa 2026-08-31')).toBe('2026-08-31');
  });

  it('rifiuta un giorno che non esiste', () => {
    expect(dateOf('spesa 30/2')).toBeNull();
    expect(dateOf('spesa 31/4/2026')).toBeNull();
  });

  it('trova il 29 febbraio saltando gli anni che non ce l hanno', () => {
    expect(dateOf('spesa 29/2')).toBe('2024-02-29');
  });

  it('rifiuta una data futura scritta per esteso', () => {
    expect(dateOf('spesa 2027-01-01')).toBeNull();
  });
});

describe('i nomi dei mesi', () => {
  it('leggono giorno e mese, con o senza preposizione', () => {
    expect(dateOf('spesa 3 agosto')).toBe('2026-08-03');
    expect(dateOf('spesa il 3 agosto')).toBe('2026-08-03');
    expect(dateOf('spesa 3 ago')).toBe('2026-08-03');
  });

  it('accettano l anno scritto dopo', () => {
    expect(dateOf('spesa 3 agosto 2024')).toBe('2024-08-03');
  });

  it('tornano all anno prima invece di andare nel futuro', () => {
    expect(dateOf('spesa 3 dicembre')).toBe('2025-12-03');
  });

  it('da soli non sono una data: un mese è un periodo, non un giorno', () => {
    expect(dateOf('spesa agosto')).toBeNull();
  });
});

describe('il giorno del mese', () => {
  it('vuole una preposizione davanti', () => {
    expect(dateOf('spesa il 3')).toBe('2026-09-03');
    expect(dateOf('spesa del 3')).toBe('2026-09-03');
    expect(dateOf('spesa 3')).toBeNull();
  });

  it('legge la preposizione attaccata al numero', () => {
    expect(dateOf("spesa l'8")).toBe('2026-09-08');
  });

  it('torna al mese prima invece di andare nel futuro', () => {
    expect(dateOf('spesa il 20')).toBe('2026-08-20');
  });

  it('scavalca il capodanno tornando indietro', () => {
    expect(dateOf('spesa il 20', '2026-01-10')).toBe('2025-12-20');
  });

  it('salta il mese che quel giorno non ha', () => {
    // Settembre non ha un 31: il 31 più recente è quello di agosto, non un giorno inventato.
    expect(dateOf('spesa il 31', '2026-09-15')).toBe('2026-08-31');
    // E febbraio non ha un 30: si indietreggia finché un giorno così esiste davvero.
    expect(dateOf('spesa il 30', '2026-03-15')).toBe('2026-01-30');
  });
});

describe('looksLikeDate', () => {
  it('riconosce un numero preceduto da una preposizione', () => {
    const tokens = tokenize('25 spesa il 3');
    expect(looksLikeDate(tokens, 3, ITALIAN_LEXICON)).toBe(true);
    expect(looksLikeDate(tokens, 0, ITALIAN_LEXICON)).toBe(false);
  });

  it('riconosce un numero seguito da un mese', () => {
    const tokens = tokenize('3 agosto');
    expect(looksLikeDate(tokens, 0, ITALIAN_LEXICON)).toBe(true);
  });

  it('non si fa ingannare da una preposizione che segue', () => {
    // «30 al bar»: la preposizione sta dopo il numero, non davanti.
    const tokens = tokenize('30 al bar');
    expect(looksLikeDate(tokens, 0, ITALIAN_LEXICON)).toBe(false);
  });
});
