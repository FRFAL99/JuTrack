import { describe, expect, it } from 'vitest';
import { ITALIAN_LEXICON } from './lexicon';
import { findPeriod } from './periods';
import { newTaken, tokenize } from './tokens';
import type { ParseContext } from './types';

/** Martedì 15 settembre 2026. Il resto del contesto qui non serve. */
const context: ParseContext = {
  today: '2026-09-15',
  members: [],
  myMemberId: 'm1',
  categories: [],
  stores: [],
  tags: [],
};

/** Il periodo letto, scritto corto: il preset, o i due estremi. */
function read(text: string, today = context.today): string | null {
  const tokens = tokenize(text);
  const match = findPeriod(tokens, newTaken(tokens.length), { ...context, today }, ITALIAN_LEXICON);
  if (match === null) return null;
  const { preset, from, to } = match.period;
  return preset ?? `${from ?? ''}..${to ?? ''}`;
}

describe('i sei preset', () => {
  it('si riconoscono dalle frasi che li nominano', () => {
    expect(read('questo mese')).toBe('thisMonth');
    expect(read('mese scorso')).toBe('lastMonth');
    expect(read('il mese scorso')).toBe('lastMonth');
    expect(read("quest'anno")).toBe('thisYear');
    expect(read('ultimi 7 giorni')).toBe('last7');
    expect(read('ultimi 30 giorni')).toBe('last30');
    expect(read('ultimi 12 mesi')).toBe('last12Months');
  });

  it('vincono sul conteggio generico', () => {
    // Senza la regola «prima la frase più lunga», «ultimi 7 giorni» diventerebbe un
    // intervallo morto invece del preset che si muove col calendario.
    expect(read('ultimi 7 giorni')).toBe('last7');
    expect(read('ultimi 8 giorni')).toBe('2026-09-08..2026-09-15');
  });
});

describe('il conteggio all indietro', () => {
  it('conta i giorni includendo oggi', () => {
    expect(read('ultimi 15 giorni')).toBe('2026-09-01..2026-09-15');
  });

  it('conta i mesi dal primo giorno del più lontano', () => {
    expect(read('ultimi 3 mesi')).toBe('2026-07-01..2026-09-15');
  });

  it('ignora un unità che non conosce', () => {
    expect(read('ultimi 3 gatti')).toBeNull();
  });
});

describe('i mesi civili', () => {
  it('si leggono con o senza preposizione', () => {
    expect(read('agosto')).toBe('2026-08-01..2026-08-31');
    expect(read('ad agosto')).toBe('2026-08-01..2026-08-31');
    expect(read('di agosto')).toBe('2026-08-01..2026-08-31');
  });

  it('tornano all anno prima invece di andare nel futuro', () => {
    expect(read('dicembre')).toBe('2025-12-01..2025-12-31');
  });

  it('si fermano a oggi quando è il mese in corso', () => {
    // Una curva che prosegue piatta fino al 30 non dice «non ho ancora speso», dice
    // «non spenderò».
    expect(read('settembre')).toBe('2026-09-01..2026-09-15');
  });

  it('accettano l anno scritto dopo', () => {
    expect(read('agosto 2024')).toBe('2024-08-01..2024-08-31');
  });

  it('rifiutano un mese che deve ancora cominciare', () => {
    expect(read('agosto 2027')).toBeNull();
  });
});

describe('gli anni', () => {
  it('si leggono in cifre, con o senza preposizione', () => {
    expect(read('2025')).toBe('2025-01-01..2025-12-31');
    expect(read('nel 2025')).toBe('2025-01-01..2025-12-31');
  });

  it('leggono «l anno scorso» come l anno civile prima', () => {
    expect(read("l'anno scorso")).toBe('2025-01-01..2025-12-31');
  });

  it('si fermano a oggi sull anno in corso', () => {
    expect(read('2026')).toBe('2026-01-01..2026-09-15');
  });

  it('rifiutano un anno futuro e uno troppo indietro', () => {
    expect(read('2027')).toBeNull();
    expect(read('1998')).toBeNull();
  });
});

describe('findPeriod', () => {
  it('non trova niente in una frase che non nomina un periodo', () => {
    expect(read('spesa esselunga')).toBeNull();
    expect(read('')).toBeNull();
  });

  it('restituisce i token da cui viene, per poterli evidenziare', () => {
    const tokens = tokenize('spesa questo mese');
    const match = findPeriod(tokens, newTaken(tokens.length), context, ITALIAN_LEXICON);
    expect(match?.from).toBe(1);
    expect(match?.to).toBe(2);
  });
});
