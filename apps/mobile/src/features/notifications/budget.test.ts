import { describe, expect, it } from 'vitest';
import type { BudgetStatus } from '@jutrack/core';
import {
  budgetContent,
  detectCrossings,
  parseMarks,
  pruneMarks,
  serializeMarks,
  type BudgetMarks,
} from './budget';

const VAULT = 'v1';
const MONTH = '2026-08';

/** Uno stato di budget verosimile, con i campi che il resto del test non guarda già a posto. */
function status(
  categoryId: string,
  state: BudgetStatus['state'],
  spentCents = 0,
  limitCents = 20000,
): BudgetStatus {
  return {
    categoryId,
    month: MONTH,
    limitCents,
    spentCents,
    remainingCents: limitCents - spentCents,
    ratio: limitCents === 0 ? 0 : spentCents / limitCents,
    state,
  };
}

const NOTHING: BudgetMarks = { watched: [], levels: {} };

/** I segni dopo un primo giro: il gruppo è già stato guardato, e tutto era sotto. */
const WATCHING: BudgetMarks = { watched: [`${VAULT}|${MONTH}`], levels: {} };

describe('parseMarks', () => {
  it('rilegge quello che ha scritto', () => {
    const marks: BudgetMarks = { watched: ['v1|2026-08'], levels: { 'v1|2026-08|c1': 'over' } };
    expect(parseMarks(serializeMarks(marks))).toEqual(marks);
  });

  it.each([
    ['non è mai stato scritto', null],
    ['non è JSON', 'boh'],
    ['non è un oggetto', '"acceso"'],
    ['è null', 'null'],
  ])('riparte da zero se il valore %s', (_caso, raw) => {
    expect(parseMarks(raw)).toEqual(NOTHING);
  });

  it('scarta i livelli che non riconosce invece di fidarsi', () => {
    const marks = parseMarks('{"watched":["v1|2026-08"],"levels":{"a":"over","b":"boh","c":3}}');
    expect(marks.levels).toEqual({ a: 'over' });
  });

  it('scarta le voci di `watched` che non sono stringhe', () => {
    expect(parseMarks('{"watched":["v1|2026-08",7,null],"levels":{}}').watched).toEqual([
      'v1|2026-08',
    ]);
  });

  it('un file illeggibile riparte in silenzio, non con la raffica degli arretrati', () => {
    // Riparte da zero significa `watched` vuoto, quindi il giro dopo è un primo giro:
    // registra e tace. È la direzione giusta dell'errore.
    const { alerts } = detectCrossings({
      statuses: [status('c1', 'over', 25000)],
      marks: parseMarks('{{{'),
      vaultId: VAULT,
      month: MONTH,
    });
    expect(alerts).toEqual([]);
  });
});

describe('detectCrossings', () => {
  it('la prima volta guarda e tace, ma se lo ricorda', () => {
    const result = detectCrossings({
      statuses: [status('c1', 'over', 25000)],
      marks: NOTHING,
      vaultId: VAULT,
      month: MONTH,
    });

    expect(result.alerts).toEqual([]);
    expect(result.changed).toBe(true);
    expect(result.marks.watched).toEqual([`${VAULT}|${MONTH}`]);
    expect(result.marks.levels).toEqual({ [`${VAULT}|${MONTH}|c1`]: 'over' });
  });

  it('avvisa quando una categoria arriva vicino al limite', () => {
    const result = detectCrossings({
      statuses: [status('c1', 'near', 17000)],
      marks: WATCHING,
      vaultId: VAULT,
      month: MONTH,
    });

    expect(result.alerts).toEqual([
      {
        categoryId: 'c1',
        level: 'near',
        spentCents: 17000,
        limitCents: 20000,
        remainingCents: 3000,
      },
    ]);
  });

  it('avvisa di nuovo quando da vicino passa a superato', () => {
    const marks: BudgetMarks = { ...WATCHING, levels: { [`${VAULT}|${MONTH}|c1`]: 'near' } };
    const result = detectCrossings({
      statuses: [status('c1', 'over', 22000)],
      marks,
      vaultId: VAULT,
      month: MONTH,
    });

    expect(result.alerts.map((alert) => alert.level)).toEqual(['over']);
    expect(result.marks.levels[`${VAULT}|${MONTH}|c1`]).toBe('over');
  });

  it('non ripete l’avviso se il livello non cambia', () => {
    const marks: BudgetMarks = { ...WATCHING, levels: { [`${VAULT}|${MONTH}|c1`]: 'over' } };
    const result = detectCrossings({
      statuses: [status('c1', 'over', 30000)],
      marks,
      vaultId: VAULT,
      month: MONTH,
    });

    expect(result.alerts).toEqual([]);
    // Niente da riscrivere: `app_meta` non va toccata a ogni modifica del documento.
    expect(result.changed).toBe(false);
  });

  it('il livello non scende, così una spesa cancellata non riapre l’avviso', () => {
    // Cancellare una spesa riporta la categoria sotto il limite. Senza questa regola la
    // spesa successiva riavviserebbe, e un budget che oscilla intorno alla soglia
    // suonerebbe a ogni scontrino.
    const marks: BudgetMarks = { ...WATCHING, levels: { [`${VAULT}|${MONTH}|c1`]: 'over' } };
    const back = detectCrossings({
      statuses: [status('c1', 'near', 17000)],
      marks,
      vaultId: VAULT,
      month: MONTH,
    });
    expect(back.alerts).toEqual([]);
    expect(back.marks.levels[`${VAULT}|${MONTH}|c1`]).toBe('over');

    const again = detectCrossings({
      statuses: [status('c1', 'over', 21000)],
      marks: back.marks,
      vaultId: VAULT,
      month: MONTH,
    });
    expect(again.alerts).toEqual([]);
  });

  it('`under` non lascia segni', () => {
    const result = detectCrossings({
      statuses: [status('c1', 'under', 1000)],
      marks: WATCHING,
      vaultId: VAULT,
      month: MONTH,
    });
    expect(result.marks.levels).toEqual({});
    expect(result.changed).toBe(false);
  });

  it('più categorie passate insieme danno più avvisi, in un giro solo', () => {
    const result = detectCrossings({
      statuses: [status('c1', 'over', 25000), status('c2', 'near', 17000)],
      marks: WATCHING,
      vaultId: VAULT,
      month: MONTH,
    });
    expect(result.alerts.map((alert) => alert.categoryId)).toEqual(['c1', 'c2']);
  });

  it('due gruppi tengono conti separati nello stesso mese', () => {
    const first = detectCrossings({
      statuses: [status('c1', 'over', 25000)],
      marks: WATCHING,
      vaultId: VAULT,
      month: MONTH,
    });
    // L'altro gruppo non è mai stato guardato: registra e tace, e non tocca i segni del primo.
    const second = detectCrossings({
      statuses: [status('c1', 'over', 25000)],
      marks: first.marks,
      vaultId: 'v2',
      month: MONTH,
    });

    expect(second.alerts).toEqual([]);
    expect(second.marks.levels[`${VAULT}|${MONTH}|c1`]).toBe('over');
    expect(second.marks.levels[`v2|${MONTH}|c1`]).toBe('over');
  });

  it('il mese nuovo è un primo giro, e si porta via il mese vecchio', () => {
    const marks: BudgetMarks = {
      watched: [`${VAULT}|2026-07`],
      levels: { [`${VAULT}|2026-07|c1`]: 'over' },
    };
    const result = detectCrossings({
      statuses: [status('c1', 'near', 17000)],
      marks,
      vaultId: VAULT,
      month: MONTH,
    });

    expect(result.alerts).toEqual([]);
    expect(result.marks).toEqual({
      watched: [`${VAULT}|${MONTH}`],
      levels: { [`${VAULT}|${MONTH}|c1`]: 'near' },
    });
  });
});

describe('pruneMarks', () => {
  it('tiene il mese in corso di tutti i gruppi e butta gli altri', () => {
    const marks: BudgetMarks = {
      watched: [`v1|${MONTH}`, `v2|${MONTH}`, 'v1|2026-07'],
      levels: {
        [`v1|${MONTH}|c1`]: 'over',
        [`v2|${MONTH}|c9`]: 'near',
        'v1|2026-07|c1': 'over',
      },
    };

    expect(pruneMarks(marks, MONTH)).toEqual({
      watched: [`v1|${MONTH}`, `v2|${MONTH}`],
      levels: { [`v1|${MONTH}|c1`]: 'over', [`v2|${MONTH}|c9`]: 'near' },
    });
  });
});

describe('budgetContent', () => {
  const nameOf = (id: string): string =>
    id === 'c1' ? 'Spesa' : id === 'c2' ? 'Casa' : 'Bollette';

  it('con un budget solo dice i numeri, che sono l’informazione utile', () => {
    const content = budgetContent(
      [
        {
          categoryId: 'c1',
          level: 'over',
          spentCents: 21400,
          limitCents: 20000,
          remainingCents: -1400,
        },
      ],
      nameOf,
    );

    expect(content.title).toBe('Budget superato');
    expect(content.body).toBe('Spesa: 214,00 € su 200,00 € questo mese, 14,00 € in più.');
  });

  it('«quasi finito» dice quanto resta, non quanto manca al disastro', () => {
    const content = budgetContent(
      [
        {
          categoryId: 'c1',
          level: 'near',
          spentCents: 17000,
          limitCents: 20000,
          remainingCents: 3000,
        },
      ],
      nameOf,
    );

    expect(content.title).toBe('Budget quasi finito');
    expect(content.body).toContain('Restano 30,00 €');
  });

  it('usa il simbolo del profilo, non l’euro scritto a mano', () => {
    const content = budgetContent(
      [
        {
          categoryId: 'c1',
          level: 'over',
          spentCents: 21400,
          limitCents: 20000,
          remainingCents: -1400,
        },
      ],
      nameOf,
      'CHF',
    );
    expect(content.body).toContain('214,00 CHF');
  });

  it('più budget insieme fanno un avviso solo, non tre uguali in fila', () => {
    const content = budgetContent(
      [
        { categoryId: 'c1', level: 'over', spentCents: 0, limitCents: 0, remainingCents: 0 },
        { categoryId: 'c2', level: 'over', spentCents: 0, limitCents: 0, remainingCents: 0 },
      ],
      nameOf,
    );

    expect(content.title).toBe('2 budget superati');
    expect(content.body).toBe('Spesa e Casa. Li trovi nei Grafici.');
  });

  it('«superati» solo se lo sono tutti: con uno vicino la parola sarebbe falsa', () => {
    const content = budgetContent(
      [
        { categoryId: 'c1', level: 'over', spentCents: 0, limitCents: 0, remainingCents: 0 },
        { categoryId: 'c2', level: 'near', spentCents: 0, limitCents: 0, remainingCents: 0 },
      ],
      nameOf,
    );
    expect(content.title).toBe('2 budget da guardare');
  });

  it('oltre tre nomi conta invece di elencare', () => {
    const alerts = ['c1', 'c2', 'c3', 'c4'].map((categoryId) => ({
      categoryId,
      level: 'over' as const,
      spentCents: 0,
      limitCents: 0,
      remainingCents: 0,
    }));
    const content = budgetContent(alerts, (id) => `Categoria ${id}`);
    expect(content.body).toBe('Categoria c1, Categoria c2 e altre 2. Li trovi nei Grafici.');
  });

  it('una categoria che non c’è più ha comunque un nome', () => {
    const content = budgetContent(
      [
        {
          categoryId: 'sparita',
          level: 'over',
          spentCents: 100,
          limitCents: 50,
          remainingCents: -50,
        },
      ],
      () => 'Categoria rimossa',
    );
    expect(content.body).toContain('Categoria rimossa');
  });
});
