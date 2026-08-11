/**
 * Il test che attraversa i moduli.
 *
 * Ogni aggregazione ha i suoi test, ma nessuno di quelli si accorgerebbe di un filtro
 * applicato due volte o di un arrotondamento che perde centesimi: sono difetti che si
 * vedono solo **confrontando** due grafici della stessa schermata. Con lo stesso
 * `ExpenseQuery`, la somma dell'istogramma, quella delle aree del treemap, quella della
 * serie giornaliera e quella delle categorie devono dare lo stesso numero del totale in
 * testa.
 */
import { describe, expect, it } from 'vitest';
import { binsFor, squarify } from '../chart';
import { totalsByCategory } from './breakdown';
import { totalsByMemberOverTime } from './people';
import { amountFor, applyQuery, queryTotalCents, type ExpenseQuery } from './query';
import { cumulativeByDay, totalsByDay } from './series';
import { totalsByWeekday } from './weekday';
import type { Expense } from '../model/types';

const ANNA = 'anna';
const BRUNO = 'bruno';

function expense(
  id: string,
  date: string,
  amountCents: number,
  extra: Partial<Expense> = {},
): Expense {
  const half = Math.floor(amountCents / 2);
  return {
    id,
    amountCents,
    currency: 'EUR',
    date,
    categoryId: 'cibo',
    note: '',
    store: 'Coop',
    tags: ['casa'],
    paidBy: ANNA,
    split: { mode: 'equal', shares: { [ANNA]: amountCents - half, [BRUNO]: half } },
    createdAt: `${date}T10:00:00.000Z`,
    updatedAt: `${date}T10:00:00.000Z`,
    deletedAt: null,
    ...extra,
  };
}

/** Un mese di spese con importi dispari, categorie diverse e una cancellata. */
const expenses: Expense[] = [
  expense('a', '2026-08-01', 1233),
  expense('b', '2026-08-01', 999, { categoryId: 'casa' }),
  expense('c', '2026-08-05', 4501, { categoryId: 'viaggi' }),
  expense('d', '2026-08-12', 777, { categoryId: null }),
  expense('e', '2026-08-19', 25_000, { categoryId: 'casa', paidBy: BRUNO }),
  expense('f', '2026-08-28', 1501),
  expense('g', '2026-07-30', 5000), // fuori periodo
  expense('h', '2026-08-20', 9999, { deletedAt: '2026-08-21T10:00:00.000Z' }),
];

const PERIOD = { from: '2026-08-01', to: '2026-08-31' };

/** Le stesse verifiche per una query qualunque: è il punto del test. */
function checkAgreement(query: ExpenseQuery): void {
  const rows = applyQuery(expenses, query);
  const total = queryTotalCents(rows, query);

  const fromDays = totalsByDay(rows, query).reduce((sum, day) => sum + day.totalCents, 0);
  expect(fromDays, 'la serie giornaliera deve dare il totale').toBe(total);

  const fromWeekdays = totalsByWeekday(rows, query).reduce((sum, day) => sum + day.totalCents, 0);
  expect(fromWeekdays, 'le sette barre devono dare il totale').toBe(total);

  const categories = totalsByCategory(rows, query);
  const fromCategories = categories.reduce((sum, row) => sum + row.totalCents, 0);
  expect(fromCategories, 'le categorie devono dare il totale').toBe(total);

  const fromBins = binsFor(rows.map((row) => amountFor(row, query))).reduce(
    (sum, bin) => sum + bin.totalCents,
    0,
  );
  expect(fromBins, 'l istogramma deve dare il totale').toBe(total);

  const cumulative = cumulativeByDay(totalsByDay(rows, query));
  expect(
    cumulative[cumulative.length - 1]?.totalCents ?? 0,
    'la curva cumulata finisce sul totale',
  ).toBe(total);

  if (total > 0) {
    const area = { x: 0, y: 0, width: 300, height: 200 };
    const rects = squarify(
      categories.map((row) => ({ id: row.categoryId ?? 'senza', value: row.totalCents })),
      area,
    );
    const covered = rects.reduce((sum, rect) => sum + rect.width * rect.height, 0);
    expect(covered, 'il treemap copre tutta l area').toBeCloseTo(area.width * area.height, 6);

    for (const rect of rects) {
      const share =
        (categories.find((c) => (c.categoryId ?? 'senza') === rect.id)?.totalCents ?? 0) / total;
      expect(rect.width * rect.height, `l area di ${rect.id} è proporzionale`).toBeCloseTo(
        share * area.width * area.height,
        6,
      );
    }
  }
}

describe('le somme di tutti i grafici coincidono', () => {
  it('sul periodo, senza altri filtri', () => {
    checkAgreement(PERIOD);
  });

  it('con il filtro categoria', () => {
    checkAgreement({ ...PERIOD, categoryIds: ['casa', 'cibo'] });
  });

  it('con il filtro persona «a carico di», che proietta gli importi sulla quota', () => {
    // È qui che un modulo dimenticato produrrebbe numeri plausibili e sbagliati: se anche
    // uno solo leggesse `amountCents`, la sua somma sarebbe il doppio delle altre.
    checkAgreement({ ...PERIOD, memberId: BRUNO });
  });

  it('con il filtro persona «ha pagato»', () => {
    checkAgreement({ ...PERIOD, memberId: BRUNO, personMode: 'paid' });
  });

  it('con negozio, tag e fascia di importo insieme', () => {
    checkAgreement({ ...PERIOD, stores: ['coop'], tags: ['CASA'], maxCents: 5000 });
  });

  it('su un periodo senza spese: tutto a zero, niente NaN', () => {
    checkAgreement({ from: '2026-01-01', to: '2026-01-31' });
  });
});

describe('coerenza fra le due letture di una spesa', () => {
  it('la somma delle quote di tutti i membri è il totale pieno', () => {
    // Se non lo fosse, «a carico di Anna» più «a carico di Bruno» non farebbe il totale
    // della schermata senza filtri, e nessuno dei due numeri sarebbe sbagliato da solo.
    const rows = applyQuery(expenses, PERIOD);
    const full = queryTotalCents(rows, PERIOD);
    const anna = queryTotalCents(rows, { ...PERIOD, memberId: ANNA });
    const bruno = queryTotalCents(rows, { ...PERIOD, memberId: BRUNO });
    expect(anna + bruno).toBe(full);
  });

  it('la somma di quanto hanno anticipato è il totale pieno', () => {
    const rows = applyQuery(expenses, PERIOD);
    const full = queryTotalCents(rows, PERIOD);
    const paid = [ANNA, BRUNO].reduce(
      (sum, memberId) => sum + queryTotalCents(rows, { ...PERIOD, memberId, personMode: 'paid' }),
      0,
    );
    expect(paid).toBe(full);
  });

  it('il confronto fra persone somma allo stesso totale, in entrambe le grandezze', () => {
    const rows = applyQuery(expenses, PERIOD);
    const full = queryTotalCents(rows, PERIOD);
    const series = totalsByMemberOverTime(rows, [ANNA, BRUNO], ['2026-08']);
    expect(series.reduce((sum, s) => sum + s.paidCents, 0)).toBe(full);
    expect(series.reduce((sum, s) => sum + s.owedCents, 0)).toBe(full);
  });
});
