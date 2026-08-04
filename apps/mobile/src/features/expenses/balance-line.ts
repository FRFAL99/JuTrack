import { formatMoney, type Transfer } from '@jutrack/core';

/** Di che segno è il saldo, per scegliere il colore senza che il chiamante lo deduca dal testo. */
export type BalanceTone = 'credit' | 'debt' | 'even';

export interface BalanceLine {
  text: string;
  tone: BalanceTone;
}

/**
 * La riga di saldo nella card in cima alle spese: **quanto riguarda me**.
 *
 * `simplifyDebts` restituisce i pagamenti che azzererebbero i debiti di tutti; qui si tiene
 * solo ciò che passa per me, perché è la mia schermata. Con più di una controparte non si
 * elencano — la card ha una riga — si somma e si dice quante persone sono: il dettaglio sta
 * nei Grafici e in `/settle`, che è dove si va per agire.
 *
 * Fuori dal componente perché è qui che stanno i casi limite: nessun debito, una sola
 * controparte, più controparti, e la possibilità di essere contemporaneamente creditore e
 * debitore — che `simplifyDebts` non produce mai (un membro sta da un lato solo del saldo
 * netto), ma di cui questa funzione non ha bisogno di fidarsi.
 */
export function describeMyBalance(
  transfers: Transfer[],
  myMemberId: string,
  nameOf: (memberId: string) => string,
): BalanceLine {
  const owedToMe = transfers.filter((transfer) => transfer.toMember === myMemberId);
  const owedByMe = transfers.filter((transfer) => transfer.fromMember === myMemberId);

  const sum = (list: Transfer[]): number =>
    list.reduce((total, transfer) => total + transfer.amountCents, 0);

  // Il credito prima del debito: se per un'incoerenza dei dati esistessero entrambi, «ti
  // devono» è la lettura meno allarmante, e chi vuole i dettagli ha i Grafici.
  if (owedToMe.length === 1) {
    return {
      text: `${nameOf(owedToMe[0]!.fromMember)} ti deve ${formatMoney(sum(owedToMe))}`,
      tone: 'credit',
    };
  }
  if (owedToMe.length > 1) {
    return {
      text: `In ${owedToMe.length} ti devono ${formatMoney(sum(owedToMe))}`,
      tone: 'credit',
    };
  }
  if (owedByMe.length === 1) {
    return {
      text: `Devi ${formatMoney(sum(owedByMe))} a ${nameOf(owedByMe[0]!.toMember)}`,
      tone: 'debt',
    };
  }
  if (owedByMe.length > 1) {
    return {
      text: `Devi ${formatMoney(sum(owedByMe))} a ${owedByMe.length} persone`,
      tone: 'debt',
    };
  }

  return { text: 'Siete pari', tone: 'even' };
}
