import type { WidgetRepresentation } from 'react-native-android-widget';
import { hex, widgetCard } from './WidgetCard';
import { unknownBalance, unknownMonth, type BalanceSnapshot, type MonthSnapshot } from './snapshot';
import type { WidgetSize } from './size';

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

/**
 * Il saldo: verde se mi devono, rosso se devo, neutro se i conti tornano.
 *
 * **Nessuna striscia qui, e non è una dimenticanza.** Il saldo non ha una serie storica da cui
 * disegnarla: è una fotografia di chi deve cosa a chi *adesso*, e ricostruirne l'andamento
 * vorrebbe dire rifare il giro dei debiti per ognuno degli ultimi quattordici giorni — un
 * conto che non sta né nel foglietto né in un task headless. Del taglio il saldo si serve
 * comunque, per non stringere le tre righe dove non ci stanno.
 */
export function balanceView(
  balance: BalanceSnapshot | null,
  size: WidgetSize,
): WidgetRepresentation {
  const shown = balance ?? unknownBalance();
  return widgetCard(
    shown,
    (palette) => {
      if (shown.tone === 'credit') return hex(palette.income);
      if (shown.tone === 'debt') return hex(palette.expense);
      return hex(palette.text);
    },
    size,
  );
}

/**
 * Il totale del mese, sempre neutro.
 *
 * Non è una dimenticanza: `colors.expense` è il colore di **un'uscita**, e tingere di rosso la
 * somma di tutte le spese del mese le trasformerebbe in un allarme. A dire se si sta spendendo
 * troppo c'è il budget, che ha una soglia e una notifica sua (Step 32); questo è un numero, e
 * un numero non giudica.
 */
export function monthView(month: MonthSnapshot | null, size: WidgetSize): WidgetRepresentation {
  const shown = month ?? unknownMonth();
  return widgetCard(shown, (palette) => hex(palette.text), size, {
    sparkPath: shown.sparkPath,
    note: shown.pace,
  });
}
