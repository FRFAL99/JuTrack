import { describe, expect, it } from 'vitest';
import type { Expense, Member, Settlement } from '@jutrack/core';
import { composeSnapshot } from './compose';

const IO = 'membro-io';
const JUJU = 'membro-juju';

function member(id: string, name: string): Member {
  return { id, name, color: '#000000' };
}

/** Una spesa pagata da uno e divisa a metà, che è il caso di cui i widget parlano. */
function shared(amountCents: number, paidBy: string, date = '2026-08-10'): Expense {
  const half = amountCents / 2;
  return {
    id: `spesa-${amountCents}-${paidBy}-${date}`,
    amountCents,
    currency: 'EUR',
    date,
    categoryId: null,
    note: '',
    store: '',
    tags: [],
    paidBy,
    split: { mode: 'equal', shares: { [IO]: half, [JUJU]: half } },
    createdAt: `${date}T10:00:00.000Z`,
    updatedAt: `${date}T10:00:00.000Z`,
    deletedAt: null,
  };
}

const MEMBERS = [member(IO, 'Io'), member(JUJU, 'Juju')];
const NO_SETTLEMENTS: Settlement[] = [];

function compose(args: { expenses: Expense[]; monthExpenses?: Expense[]; members?: Member[] }) {
  return composeSnapshot({
    groupName: 'Casa',
    expenses: args.expenses,
    monthExpenses: args.monthExpenses ?? args.expenses,
    settlements: NO_SETTLEMENTS,
    members: args.members ?? MEMBERS,
    myMemberId: IO,
    monthTitle: 'agosto',
    symbol: '€',
  });
}

describe('composeSnapshot', () => {
  // È il conto che l'app e il task headless devono fare **uguale**: verificarlo qui vale per
  // tutti e due i chiamanti, ed è la ragione per cui questa funzione esiste.

  it('riempie tutti e due i widget in un colpo solo', () => {
    const snapshot = compose({ expenses: [shared(2000, IO)] });
    expect(snapshot.balance).not.toBeNull();
    expect(snapshot.month).not.toBeNull();
  });

  it('dice che mi devono la metà di quello che ho anticipato', () => {
    const snapshot = compose({ expenses: [shared(2000, IO)] });
    expect(snapshot.balance?.amount).toBe('10,00 €');
    expect(snapshot.balance?.caption).toBe('Juju ti deve');
    expect(snapshot.balance?.tone).toBe('credit');
  });

  it('conta nel totale del mese quello che ha pagato chiunque', () => {
    // Il totale è del gruppo e non la mia quota: 20 + 10 fanno 30, anche se dieci li ha
    // anticipati Juju.
    const snapshot = compose({ expenses: [shared(2000, IO), shared(1000, JUJU)] });
    expect(snapshot.month?.amount).toBe('30,00 €');
    expect(snapshot.month?.caption).toBe('Speso in agosto');
  });

  it('conta il saldo su tutta la storia e il totale sul solo mese', () => {
    // È la differenza fra i due numeri, e l'unico modo di sbagliarla è passare la stessa
    // lista a entrambi: il calendario azzera un totale mensile, non un debito.
    const luglio = shared(4000, IO, '2026-07-02');
    const agosto = shared(2000, IO, '2026-08-10');
    const snapshot = compose({ expenses: [luglio, agosto], monthExpenses: [agosto] });
    expect(snapshot.balance?.amount).toBe('30,00 €'); // metà di 60,00, su tutta la storia
    expect(snapshot.month?.amount).toBe('20,00 €'); // il solo agosto
  });

  it('porta il nome del gruppo su entrambi i widget', () => {
    const snapshot = compose({ expenses: [] });
    expect(snapshot.balance?.group).toBe('Casa');
    expect(snapshot.month?.group).toBe('Casa');
  });

  it('regge un gruppo senza spese', () => {
    const snapshot = compose({ expenses: [] });
    expect(snapshot.balance?.caption).toBe('Siete pari');
    expect(snapshot.month?.amount).toBe('0,00 €');
  });

  it('regge un gruppo di una persona sola', () => {
    // Il task headless lo incontra come lo incontra l'app: il saldo non ha controparti, e il
    // widget che serve a quella persona è il totale del mese.
    const snapshot = compose({ expenses: [], members: [member(IO, 'Io')] });
    expect(snapshot.balance?.caption).toBe('Solo tu in questo gruppo');
  });
});
