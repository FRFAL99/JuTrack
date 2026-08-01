import { describe, expect, it } from 'vitest';
import type { Expense } from '@jutrack/core';
import {
  currentMonth,
  formatDayTitle,
  formatMonthTitle,
  groupByDay,
  shortMonthLabel,
  todayIso,
} from './grouping';

function expense(date: string, amountCents: number, id = date + amountCents): Expense {
  return {
    id,
    amountCents,
    currency: 'EUR',
    date,
    categoryId: null,
    note: '',
    paidBy: 'membro-a',
    split: { mode: 'single', shares: { 'membro-a': amountCents } },
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    deletedAt: null,
  };
}

describe('todayIso', () => {
  it('usa i componenti locali, non UTC', () => {
    // La trappola: alle 23:30 in Italia (UTC+2) `toISOString()` restituisce già il
    // giorno successivo. Una spesa registrata la sera comparirebbe sotto «domani».
    const lateEvening = new Date(2026, 7, 1, 23, 30); // 1 agosto 2026, ora locale
    expect(todayIso(lateEvening)).toBe('2026-08-01');
  });

  it('gestisce le prime ore del mattino', () => {
    expect(todayIso(new Date(2026, 7, 1, 0, 15))).toBe('2026-08-01');
  });

  it('mette lo zero iniziale a mese e giorno', () => {
    expect(todayIso(new Date(2026, 0, 5, 12))).toBe('2026-01-05');
  });
});

describe('formatDayTitle', () => {
  const now = new Date(2026, 7, 1, 12); // sabato 1 agosto 2026

  it('riconosce oggi', () => {
    expect(formatDayTitle('2026-08-01', now)).toBe('Oggi');
  });

  it('riconosce ieri', () => {
    expect(formatDayTitle('2026-07-31', now)).toBe('Ieri');
  });

  it('riconosce ieri anche a cavallo di un mese', () => {
    const firstOfMonth = new Date(2026, 7, 1, 12);
    expect(formatDayTitle('2026-07-31', firstOfMonth)).toBe('Ieri');
  });

  it('usa giorno della settimana e mese per le date dell anno corrente', () => {
    expect(formatDayTitle('2026-07-20', now)).toBe('lunedì 20 luglio');
  });

  it('include l anno per le date di anni diversi', () => {
    expect(formatDayTitle('2025-12-25', now)).toBe('25 dicembre 2025');
  });

  it('restituisce la stringa originale se la data è malformata', () => {
    // Meglio mostrare un valore grezzo che far crashare la lista.
    expect(formatDayTitle('non-una-data', now)).toBe('non-una-data');
  });
});

describe('groupByDay', () => {
  const now = new Date(2026, 7, 1, 12);

  it('restituisce un elenco vuoto senza spese', () => {
    expect(groupByDay([], now)).toEqual([]);
  });

  it('raggruppa le spese dello stesso giorno', () => {
    const sections = groupByDay([expense('2026-08-01', 1000), expense('2026-08-01', 500)], now);
    expect(sections).toHaveLength(1);
    expect(sections[0]?.data).toHaveLength(2);
  });

  it('somma il totale di ogni giorno', () => {
    const sections = groupByDay([expense('2026-08-01', 1000), expense('2026-08-01', 530)], now);
    expect(sections[0]?.totalCents).toBe(1530);
  });

  it('separa i giorni diversi conservando l ordine ricevuto', () => {
    const sections = groupByDay(
      [expense('2026-08-01', 100), expense('2026-07-31', 200), expense('2026-07-30', 300)],
      now,
    );
    expect(sections.map((s) => s.date)).toEqual(['2026-08-01', '2026-07-31', '2026-07-30']);
    expect(sections.map((s) => s.title)).toEqual(['Oggi', 'Ieri', 'giovedì 30 luglio']);
  });

  it('apre un gruppo nuovo se la stessa data ricompare più avanti', () => {
    // Non dovrebbe accadere con l'elenco ordinato, ma se accadesse è meglio due
    // gruppi visibili che spese silenziosamente assenti dal totale.
    const sections = groupByDay(
      [expense('2026-08-01', 100), expense('2026-07-31', 200), expense('2026-08-01', 300)],
      now,
    );
    expect(sections).toHaveLength(3);
    const allExpenses = sections.flatMap((s) => s.data);
    expect(allExpenses).toHaveLength(3);
  });

  it('non perde spese nel raggruppamento', () => {
    const input = [
      expense('2026-08-01', 100),
      expense('2026-08-01', 200),
      expense('2026-07-31', 300),
      expense('2026-07-15', 400),
    ];
    const total = groupByDay(input, now).reduce((sum, s) => sum + s.totalCents, 0);
    expect(total).toBe(1000);
  });
});

describe('currentMonth', () => {
  it('usa la data locale, non UTC', () => {
    // Alle 23:30 del 31 agosto in Italia, `toISOString` direbbe già settembre.
    expect(currentMonth(new Date(2026, 7, 31, 23, 30))).toBe('2026-08');
  });
});

describe('formatMonthTitle', () => {
  const now = new Date(2026, 7, 1, 12);

  it("omette l'anno in corso", () => {
    expect(formatMonthTitle('2026-08', now)).toBe('agosto');
  });

  it('mostra l’anno quando serve a distinguere', () => {
    expect(formatMonthTitle('2025-12', now)).toBe('dicembre 2025');
  });

  it('non inventa un mese da una stringa malformata', () => {
    expect(formatMonthTitle('2026-13', now)).toBe('2026-13');
    expect(formatMonthTitle('boh', now)).toBe('boh');
  });
});

describe('shortMonthLabel', () => {
  it('abbrevia a tre lettere per gli assi', () => {
    expect(shortMonthLabel('2026-01')).toBe('gen');
    expect(shortMonthLabel('2026-12')).toBe('dic');
  });

  it('ripiega sull’input se il mese non esiste', () => {
    expect(shortMonthLabel('2026-99')).toBe('2026-99');
  });
});
