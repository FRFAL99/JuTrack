/**
 * Chi deve quanto a chi.
 *
 * Due grandezze per ogni membro: quanto ha **anticipato** (pagando di tasca propria) e
 * quanto gli **spetta** (la somma delle quote a suo carico). La differenza è il saldo:
 * positivo per chi è in credito, negativo per chi è in debito. I pareggi già registrati
 * spostano il saldo senza toccare le spese, che restano lo storico immutato di ciò che è
 * stato comprato.
 *
 * Tutto deterministico: i due telefoni devono arrivare alla stessa frase — «devi 12,50 €
 * a Giulia» — senza consultarsi. Un ordinamento instabile o un tie-break arbitrario
 * mostrerebbe due verità diverse sui due schermi.
 */
import type { Cents } from '../model/money';
import type { Expense, Settlement } from '../model/types';

export interface MemberBalance {
  memberId: string;
  /** Quanto ha anticipato pagando le spese. */
  paidCents: Cents;
  /** Quanto gli spetta di carico, secondo gli split. */
  owedCents: Cents;
  /** Pareggi versati meno pareggi ricevuti. */
  settledCents: Cents;
  /** Positivo: gli altri gli devono. Negativo: deve lui. */
  netCents: Cents;
}

/** Un pagamento che azzererebbe (in parte) i debiti. */
export interface Transfer {
  fromMember: string;
  toMember: string;
  amountCents: Cents;
}

/**
 * Saldo di ciascun membro.
 *
 * `memberIds` decide chi compare: passando l'elenco dei membri, chi non ha ancora speso
 * nulla appare comunque a zero invece di sparire — e uno schermo che non nomina una delle
 * due persone sembra rotto. Chi compare nelle spese senza essere in elenco viene comunque
 * incluso: un membro rimosso che ha ancora un debito aperto non deve svanire con esso.
 */
export function computeBalances(
  expenses: Expense[],
  settlements: Settlement[],
  memberIds: string[] = [],
): MemberBalance[] {
  const paid = new Map<string, Cents>();
  const owed = new Map<string, Cents>();
  const settled = new Map<string, Cents>();
  const seen = new Set<string>(memberIds);

  const bump = (map: Map<string, Cents>, id: string, amount: Cents): void => {
    map.set(id, (map.get(id) ?? 0) + amount);
    seen.add(id);
  };

  for (const expense of expenses) {
    if (expense.deletedAt !== null) continue;
    bump(paid, expense.paidBy, expense.amountCents);
    for (const [memberId, share] of Object.entries(expense.split.shares)) {
      bump(owed, memberId, share);
    }
  }

  for (const settlement of settlements) {
    if (settlement.deletedAt !== null) continue;
    // Chi versa riduce il proprio debito, chi incassa riduce il proprio credito.
    bump(settled, settlement.fromMember, settlement.amountCents);
    bump(settled, settlement.toMember, -settlement.amountCents);
  }

  return [...seen]
    .map((memberId) => {
      const paidCents = paid.get(memberId) ?? 0;
      const owedCents = owed.get(memberId) ?? 0;
      const settledCents = settled.get(memberId) ?? 0;
      return {
        memberId,
        paidCents,
        owedCents,
        settledCents,
        netCents: paidCents - owedCents + settledCents,
      };
    })
    .sort((a, b) => b.netCents - a.netCents || (a.memberId < b.memberId ? -1 : 1));
}

/**
 * Trasforma i saldi nel minor numero di pagamenti che li azzera.
 *
 * Il debitore più esposto paga il creditore più esposto, fin dove arriva; si ripete finché
 * resta qualcosa. Con due persone è un pagamento solo, ma la regola generale evita il giro
 * inutile «A paga B, B paga C» quando basta «A paga C».
 *
 * L'accoppiamento greedy non minimizza in assoluto il numero di trasferimenti — il
 * problema è NP-difficile — ma è ottimo per i casi piccoli che questa app incontra, ed è
 * **stabile**: a parità di importo decide l'ordine alfabetico degli id, così i due
 * telefoni propongono lo stesso pagamento invece di due frasi contraddittorie.
 */
export function simplifyDebts(balances: MemberBalance[]): Transfer[] {
  const byId = (a: { memberId: string }, b: { memberId: string }): number =>
    a.memberId < b.memberId ? -1 : 1;

  const debtors = balances
    .filter((b) => b.netCents < 0)
    .map((b) => ({ memberId: b.memberId, amount: -b.netCents }))
    .sort((a, b) => b.amount - a.amount || byId(a, b));

  const creditors = balances
    .filter((b) => b.netCents > 0)
    .map((b) => ({ memberId: b.memberId, amount: b.netCents }))
    .sort((a, b) => b.amount - a.amount || byId(a, b));

  const transfers: Transfer[] = [];
  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d] as { memberId: string; amount: Cents };
    const creditor = creditors[c] as { memberId: string; amount: Cents };
    const amount = Math.min(debtor.amount, creditor.amount);

    if (amount > 0) {
      transfers.push({
        fromMember: debtor.memberId,
        toMember: creditor.memberId,
        amountCents: amount,
      });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;
    if (debtor.amount === 0) d++;
    if (creditor.amount === 0) c++;
  }

  return transfers;
}

/**
 * Saldo di un singolo membro verso tutti gli altri.
 *
 * Scorciatoia per la domanda che l'app fa più spesso: «io, in questo momento, sono in
 * credito o in debito?».
 */
export function netFor(balances: MemberBalance[], memberId: string): Cents {
  return balances.find((b) => b.memberId === memberId)?.netCents ?? 0;
}
