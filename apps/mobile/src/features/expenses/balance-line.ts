import { type Transfer } from '@jutrack/core';
import { formatMoney } from '@/i18n/money';
import { t } from '@/i18n/translate';

/** Di che segno è il saldo, per scegliere il colore senza che il chiamante lo deduca dal testo. */
export type BalanceTone = 'credit' | 'debt' | 'even';

export interface BalanceLine {
  text: string;
  tone: BalanceTone;
}

/**
 * Il mio saldo **prima di diventare una frase**: quanto, da che parte, e con chi.
 *
 * Esiste perché lo Step 34 ha avuto bisogno degli stessi fatti detti in un modo diverso. La
 * card in cima alle spese ha una riga e scrive «Juju ti deve 25,00 €»; un widget sulla home
 * ha invece un numero grande e una didascalia sotto, quindi l'importo va **fuori** dalla
 * frase. Le due frasi sono due modi di dire la stessa cosa, e questa funzione è quella cosa:
 * senza, la seconda sarebbe stata una copia della prima con le parole spostate, cioè un
 * secondo posto in cui sbagliare a decidere chi deve a chi.
 *
 * `simplifyDebts` restituisce i pagamenti che azzererebbero i debiti di tutti; qui si tiene
 * solo ciò che passa per me. Un debito fra altre due persone non mi riguarda, ed è la
 * proprietà che rende questo saldo «mio».
 */
export interface MyBalance {
  tone: BalanceTone;
  /** Quanto, in centesimi, **sempre positivo**: il verso lo dice `tone`. Zero se pari. */
  cents: number;
  /** Le controparti, nell'ordine in cui arrivano. Vuoto se pari. */
  counterparties: string[];
}

export function myBalance(transfers: Transfer[], myMemberId: string): MyBalance {
  const owedToMe = transfers.filter((transfer) => transfer.toMember === myMemberId);
  const owedByMe = transfers.filter((transfer) => transfer.fromMember === myMemberId);

  const sum = (list: Transfer[]): number =>
    list.reduce((total, transfer) => total + transfer.amountCents, 0);

  // Il credito prima del debito: se per un'incoerenza dei dati esistessero entrambi, «ti
  // devono» è la lettura meno allarmante, e chi vuole i dettagli ha i Grafici.
  // `simplifyDebts` non lo produce mai — un membro sta da un lato solo del saldo netto —
  // ma questa funzione non ha bisogno di fidarsi per dare una risposta sensata.
  if (owedToMe.length > 0) {
    return {
      tone: 'credit',
      cents: sum(owedToMe),
      counterparties: owedToMe.map((transfer) => transfer.fromMember),
    };
  }
  if (owedByMe.length > 0) {
    return {
      tone: 'debt',
      cents: sum(owedByMe),
      counterparties: owedByMe.map((transfer) => transfer.toMember),
    };
  }

  return { tone: 'even', cents: 0, counterparties: [] };
}

/**
 * La riga di saldo nella card in cima alle spese: **quanto riguarda me**.
 *
 * Con più di una controparte non si elencano — la card ha una riga — si somma e si dice
 * quante persone sono: il dettaglio sta nei Grafici e in `/settle`, che è dove si va per
 * agire.
 *
 * Fuori dal componente perché è qui che stanno i casi limite, che dallo Step 34 stanno tutti
 * un gradino sotto in `myBalance`: qui resta la sola scelta delle parole.
 */
export function describeMyBalance(
  transfers: Transfer[],
  myMemberId: string,
  nameOf: (memberId: string) => string,
  symbol = '€',
): BalanceLine {
  const { tone, cents, counterparties } = myBalance(transfers, myMemberId);
  const money = formatMoney(cents, symbol);
  const alone = counterparties.length === 1;

  // Quattro chiavi e non due con un plurale: «{{name}} ti deve» e «In {{count}} ti devono»
  // non sono la stessa frase al singolare e al plurale — cambiano soggetto, non numero. Una
  // nomina una persona, l'altra la conta perché non c'è spazio per elencarle.
  if (tone === 'credit') {
    return {
      text: alone
        ? t('home.balance.creditOne', { name: nameOf(counterparties[0]!), amount: money })
        : t('home.balance.creditMany', { count: counterparties.length, amount: money }),
      tone,
    };
  }
  if (tone === 'debt') {
    return {
      text: alone
        ? t('home.balance.debtOne', { name: nameOf(counterparties[0]!), amount: money })
        : t('home.balance.debtMany', { count: counterparties.length, amount: money }),
      tone,
    };
  }

  return { text: t('home.balance.even'), tone };
}
