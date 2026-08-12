import {
  computeBalances,
  simplifyDebts,
  type Expense,
  type Member,
  type Settlement,
} from '@jutrack/core';
import { balanceSnapshot, monthSnapshot, type WidgetSnapshot } from './snapshot';

/**
 * Da spese, membri e pareggi al foglietto: **il calcolo, in un posto solo**.
 *
 * Lo Step 36 è la ragione per cui esiste. Fino al 35 questo conto stava dentro il `useMemo`
 * di `WidgetPublisher`, ed era il posto giusto perché c'era un chiamante solo; adesso ce ne
 * sono due, e sono **il più lontani possibile fra loro** — uno dentro l'albero React con gli
 * hook che leggono il vault montato, l'altro in un task headless che il vault se lo monta da
 * sé mentre l'app non esiste. Lasciare il conto nel componente avrebbe voluto dire riscriverlo
 * di là: due copie che devono dare lo stesso numero, di cui una non si può guardare mentre
 * gira.
 *
 * Prende liste e stringhe e non uno `store`: così i test lo eseguono senza montare niente, e
 * il chiamante decide **come** ha ottenuto quelle liste — con gli hook o leggendo il documento
 * a mano.
 */
export function composeSnapshot(args: {
  groupName: string;
  /** Tutte le spese: un debito non lo azzera il calendario. */
  expenses: Expense[];
  /** Le sole spese del mese in corso. */
  monthExpenses: Expense[];
  settlements: Settlement[];
  members: Member[];
  myMemberId: string;
  /** Il mese già leggibile: «agosto», o «agosto 2025» se non è l'anno in corso. */
  monthTitle: string;
  symbol: string;
}): WidgetSnapshot {
  const { groupName, expenses, monthExpenses, settlements, members, myMemberId } = args;
  const { monthTitle, symbol } = args;

  const namesById = new Map(members.map((member) => [member.id, member.name]));

  return {
    balance: balanceSnapshot({
      groupName,
      transfers: simplifyDebts(
        computeBalances(
          expenses,
          settlements,
          members.map((member) => member.id),
        ),
      ),
      myMemberId,
      memberCount: members.length,
      // Lo stesso ripiego della card in cima alle spese: un membro mai sincronizzato dà una
      // frase incompleta, non un widget che non si disegna.
      nameOf: (id) => namesById.get(id) ?? 'qualcuno',
      symbol,
    }),
    month: monthSnapshot({
      groupName,
      // Il totale del **gruppo**, non la mia quota: è il numero grande della card in cima
      // alle spese, e non può essere due numeri diversi in due posti.
      totalCents: monthExpenses.reduce((sum, expense) => sum + expense.amountCents, 0),
      monthTitle,
      symbol,
    }),
  };
}
