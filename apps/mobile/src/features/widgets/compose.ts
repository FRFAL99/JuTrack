import {
  addDays,
  computeBalances,
  daysOfMonth,
  linePath,
  simplifyDebts,
  totalsByDay,
  type Cents,
  type Expense,
  type IsoDate,
  type Member,
  type Point,
  type Settlement,
} from '@jutrack/core';
import { formatMoney } from '@/i18n/money';
import { t } from '@/i18n/translate';
import {
  balanceSnapshot,
  monthSnapshot,
  SPARK_DAYS,
  SPARK_HEIGHT,
  SPARK_MAX_CHARS,
  SPARK_WIDTH,
  type MonthSnapshot,
  type WidgetSnapshot,
} from './snapshot';

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
  /**
   * Oggi, per la striscia e per il ritmo.
   *
   * Passato e non letto qui: è l'unica cosa in questa funzione che cambierebbe da sola fra
   * una chiamata e l'altra, e i due chiamanti la sanno già — `WidgetPublisher` la rilegge a
   * ogni render, il task headless una volta per giro.
   */
  today: IsoDate;
}): WidgetSnapshot {
  const { groupName, expenses, monthExpenses, settlements, members, myMemberId } = args;
  const { monthTitle, symbol, today } = args;

  const monthTotal = monthExpenses.reduce((sum, expense) => sum + expense.amountCents, 0);

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
    month: withExtras(
      monthSnapshot({
        groupName,
        // Il totale del **gruppo**, non la mia quota: è il numero grande della card in cima
        // alle spese, e non può essere due numeri diversi in due posti.
        totalCents: monthTotal,
        monthTitle,
        symbol,
      }),
      { expenses, monthTotal, today, symbol },
    ),
  };
}

/**
 * I due campi in più del totale del mese, **quando c'è qualcosa da dirci**.
 *
 * Nessuno dei due si mette per forza: una striscia tutta piatta e una proiezione fatta su due
 * giorni sono rumore disegnato in grande, e un widget che dice una cosa a caso si smette di
 * guardarlo — che è il difetto da cui parte tutto questo piano.
 */
function withExtras(
  month: MonthSnapshot,
  args: { expenses: Expense[]; monthTotal: Cents; today: IsoDate; symbol: string },
): MonthSnapshot {
  const { expenses, monthTotal, today, symbol } = args;

  const sparkPath = sparkline(expenses, today);
  const pace = paceCaption(monthTotal, today, symbol);

  return {
    ...month,
    ...(sparkPath === null ? {} : { sparkPath }),
    ...(pace === null ? {} : { pace }),
  };
}

/**
 * La spezzata degli ultimi quattordici giorni, nelle coordinate del foglietto.
 *
 * **La stessa geometria dei Grafici, non una seconda.** `totalsByDay` decide i giorni vuoti e
 * `linePath` la forma: sono le funzioni che disegnano l'andamento dentro l'app, e `chart/` non
 * importa `react-native` proprio perché possa servire anche qui. Due curve calcolate da due
 * codici diversi si sarebbero contraddette il giorno del primo arrotondamento.
 *
 * **Si scala sul massimo del periodo, e non su uno zero fisso.** Una striscia serve a mostrare
 * il *ritmo* — dove ci sono stati i giorni pieni e dove i vuoti — non a confrontare due
 * settimane diverse fra loro: con un fondoscala fisso, quattordici giorni da pochi euro
 * darebbero una riga schiacciata sul fondo, cioè un grafico che non dice niente.
 *
 * `null` quando non c'è speso niente: l'area sarebbe alta zero, cioè un trattino sul fondo che
 * si legge come un grafico rotto invece che come una settimana tranquilla.
 */
function sparkline(expenses: Expense[], today: IsoDate): string | null {
  const from = addDays(today, -(SPARK_DAYS - 1));
  const days = totalsByDay(expenses, {}, { from, to: today });
  if (days.length < 2) return null;

  const max = Math.max(...days.map((day) => day.totalCents));
  if (max <= 0) return null;

  const step = SPARK_WIDTH / (days.length - 1);
  const points: Point[] = days.map((day, index) => ({
    x: index * step,
    // In SVG la y cresce verso il basso: il giorno più caro è quello con la y più piccola.
    y: SPARK_HEIGHT - (day.totalCents / max) * SPARK_HEIGHT,
  }));

  const path = linePath(points);
  // Il tetto della decisione 3. Con quattordici punti non si incontra: è la rete che si
  // accorge del giorno in cui qualcuno alzasse `SPARK_DAYS` senza pensare ad `app_meta`.
  return path.length <= SPARK_MAX_CHARS ? path : null;
}

/**
 * «Di questo passo, ~840 € a fine mese».
 *
 * **Non è una previsione, è una moltiplicazione**, e la frase lo dice: «di questo passo» è la
 * condizione, e la tilde davanti al numero toglie la precisione che il conto non ha. Dire
 * «finirai il mese a 840 €» sarebbe la stessa aritmetica spacciata per una cosa che sa.
 *
 * **Prima del terzo giorno non si mostra.** Il 1° del mese la proiezione moltiplica per trenta
 * quello che si è speso in un giorno solo: una spesa grossa fatta il primo darebbe un numero
 * enorme e falso, proprio nel momento in cui non si ha ancora nessun altro dato per non
 * crederci. Ed è anche il giorno in cui il widget viene guardato per capire com'è andato il
 * mese prima.
 *
 * Arrotondata all'euro: i centesimi di una stima sono una precisione inventata.
 */
function paceCaption(monthTotal: Cents, today: IsoDate, symbol: string): string | null {
  if (monthTotal <= 0) return null;

  const dayOfMonth = Number(today.slice(8, 10));
  if (!Number.isFinite(dayOfMonth) || dayOfMonth < 3) return null;

  const total = daysOfMonth(today.slice(0, 7)).length;
  if (total <= 0 || dayOfMonth >= total) return null;

  const projected = Math.round((monthTotal / dayOfMonth) * total);
  return t('widget.pace', { amount: formatMoney(roundToEuro(projected), symbol) });
}

/** All'euro intero, che è quanta precisione ha una stima fatta su una media. */
function roundToEuro(cents: Cents): Cents {
  return Math.round(cents / 100) * 100;
}
