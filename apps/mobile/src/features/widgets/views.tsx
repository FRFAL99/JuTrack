import type { WidgetRepresentation } from 'react-native-android-widget';
import { hex, widgetCard } from './WidgetCard';
import {
  UNKNOWN_BALANCE,
  UNKNOWN_MONTH,
  type BalanceSnapshot,
  type MonthSnapshot,
} from './snapshot';

/**
 * I due widget, che sono lo stesso rettangolo con due numeri dentro.
 *
 * Stanno in un file solo perché insieme sono venti righe, e separarli avrebbe voluto dire due
 * file che importano le stesse tre cose per dichiarare una funzione ciascuno. Il rettangolo è
 * in `WidgetCard.tsx`, i contenuti in `snapshot.ts`: qui resta la sola cosa che distingue un
 * widget dall'altro, cioè **di che colore è la cifra**.
 *
 * `null` non è un errore in nessuno dei due casi: è il primo avvio, ed è il telefono appena
 * azzerato. In entrambi c'è una frase giusta da mostrare invece di un rettangolo vuoto.
 */

/** Il saldo: verde se mi devono, rosso se devo, neutro se i conti tornano. */
export function balanceView(balance: BalanceSnapshot | null): WidgetRepresentation {
  const shown = balance ?? UNKNOWN_BALANCE;
  return widgetCard(shown, (palette) => {
    if (shown.tone === 'credit') return hex(palette.income);
    if (shown.tone === 'debt') return hex(palette.expense);
    return hex(palette.text);
  });
}

/**
 * Il totale del mese, sempre neutro.
 *
 * Non è una dimenticanza: `colors.expense` è il colore di **un'uscita**, e tingere di rosso la
 * somma di tutte le spese del mese le trasformerebbe in un allarme. A dire se si sta spendendo
 * troppo c'è il budget, che ha una soglia e una notifica sua (Step 32); questo è un numero, e
 * un numero non giudica.
 */
export function monthView(month: MonthSnapshot | null): WidgetRepresentation {
  return widgetCard(month ?? UNKNOWN_MONTH, (palette) => hex(palette.text));
}
