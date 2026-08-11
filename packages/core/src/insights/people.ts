/**
 * Il confronto fra le persone, mese per mese.
 *
 * Due grandezze per ciascuno, e sono diverse: quanto ha **anticipato** (`paidCents`) e
 * quanto gli è **costato** (`owedCents`). Chi paga sempre lui non spende necessariamente di
 * più, e un grafico che mostrasse una sola delle due direbbe una cosa per l'altra.
 */
import type { Cents } from '../model/money';
import type { Expense, IsoMonth } from '../model/types';
import { monthOf } from './period';

export interface MemberMonthTotal {
  month: IsoMonth;
  paidCents: Cents;
  owedCents: Cents;
}

export interface MemberSeries {
  memberId: string;
  months: MemberMonthTotal[];
  /** Somme sul periodo, per la riga di riepilogo accanto al grafico. */
  paidCents: Cents;
  owedCents: Cents;
}

/**
 * Una serie per membro, con **gli stessi mesi per tutti** e nello stesso ordine.
 *
 * I mesi li decide chi chiama (di solito con `monthsBetween`), non i dati: due serie con
 * mesi diversi si disegnerebbero disallineate, ed è proprio il confronto a saltare.
 *
 * **Questa è l'unica aggregazione che non passa da `amountFor`**, e la ragione è che *è* la
 * scomposizione per persona: proiettare gli importi su un membro scelto altrove
 * risponderebbe due volte alla stessa domanda, e la seconda risposta sovrascriverebbe la
 * prima. Il filtro persona di `ExpenseQuery` va applicato **prima**, se si vuole, per
 * scegliere quali spese entrano; qui dentro ogni spesa si scompone su tutti.
 */
export function totalsByMemberOverTime(
  expenses: Expense[],
  memberIds: string[],
  months: IsoMonth[],
): MemberSeries[] {
  const empty = (): MemberMonthTotal[] =>
    months.map((month) => ({ month, paidCents: 0, owedCents: 0 }));

  const index = new Map(months.map((month, i) => [month, i]));
  const series = new Map<string, MemberMonthTotal[]>(memberIds.map((id) => [id, empty()]));

  const slotFor = (memberId: string, month: IsoMonth): MemberMonthTotal | undefined => {
    const at = index.get(month);
    if (at === undefined) return undefined;
    // Chi compare nelle spese senza essere in elenco viene incluso lo stesso, come fa
    // `computeBalances`: un membro rimosso che ha speso non deve svanire dal grafico.
    let rows = series.get(memberId);
    if (rows === undefined) {
      rows = empty();
      series.set(memberId, rows);
    }
    return rows[at];
  };

  for (const expense of expenses) {
    if (expense.deletedAt !== null) continue;
    const month = monthOf(expense.date);

    const paidSlot = slotFor(expense.paidBy, month);
    if (paidSlot !== undefined) paidSlot.paidCents += expense.amountCents;

    for (const [memberId, share] of Object.entries(expense.split.shares)) {
      const owedSlot = slotFor(memberId, month);
      if (owedSlot !== undefined) owedSlot.owedCents += share;
    }
  }

  return (
    [...series.entries()]
      .map(([memberId, rows]) => ({
        memberId,
        months: rows,
        paidCents: rows.reduce((sum, row) => sum + row.paidCents, 0),
        owedCents: rows.reduce((sum, row) => sum + row.owedCents, 0),
      }))
      // L'ordine è quello di `memberIds`, e chi non c'era finisce in coda in ordine di id:
      // le due legende dei due telefoni devono elencare le persone allo stesso modo.
      .sort(
        (a, b) =>
          rankOf(a.memberId, memberIds) - rankOf(b.memberId, memberIds) ||
          compare(a.memberId, b.memberId),
      )
  );
}

function rankOf(memberId: string, memberIds: string[]): number {
  const at = memberIds.indexOf(memberId);
  return at === -1 ? memberIds.length : at;
}

function compare(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
