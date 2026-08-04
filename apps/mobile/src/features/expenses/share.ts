import type { Cents, Expense } from '@jutrack/core';

/**
 * Quanto **mi** cambia in tasca una singola spesa.
 *
 * Positivo: ho anticipato più della mia quota, quindi sono in credito su questa spesa.
 * Negativo: la mia quota è a carico mio e non l'ho pagata io. Zero: ho pagato esattamente
 * la mia parte, oppure la spesa non mi riguarda.
 *
 * **Non passa da `computeBalances`.** Quello aggrega su tutta la storia e restituisce il
 * saldo di ogni membro, che è una domanda diversa: qui serve una riga alla volta, e la
 * risposta è `amountCents - shares[me]` se ho pagato io, `-shares[me]` altrimenti. È O(1)
 * per riga, quindi non serve né un `useMemo` a monte né una prop calcolata dalla schermata
 * — che era la strada prevista dal documento di redesign, e sarebbe stata più cara di
 * quella che sostituisce.
 *
 * Una spesa cancellata vale zero: il tombstone resta nel documento e la riga non si mostra,
 * ma chi chiamasse questa funzione su una tombstone otterrebbe altrimenti una quota che
 * nessun saldo conta più.
 */
export function yourShareCents(expense: Expense, myMemberId: string): Cents {
  if (expense.deletedAt !== null) return 0;
  const mine = expense.split.shares[myMemberId] ?? 0;
  const net = expense.paidBy === myMemberId ? expense.amountCents - mine : -mine;
  // `-mine` con `mine` a zero dà `-0`, che non è `0` per `Object.is` né per un test:
  // chi non compare nello split otterrebbe uno zero negativo, e un `Math.sign` a valle
  // lo leggerebbe come debito. `net === 0` è vero anche per `-0`, quindi lo appiattisce.
  return net === 0 ? 0 : net;
}
