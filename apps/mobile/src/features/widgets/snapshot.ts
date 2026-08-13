/**
 * Quello che i widget sanno, scritto su disco.
 *
 * **È la decisione che regge i due widget, e nasce da un fatto della piattaforma.** Un widget
 * Android non viene disegnato dall'app: viene disegnato quando il sistema lo chiede — appena
 * aggiunto alla home, dopo un riavvio, a ogni ridimensionamento — e quasi sempre l'app non
 * sta girando. Chi risponde è un task headless (`handler.tsx`) che ha il bundle JS ma **non
 * ha niente dell'app**: nessun provider, nessun `Y.Doc` montato, nessuna chiave presa dal
 * portachiavi. Rimontargli il vault sotto vorrebbe dire aprire SecureStore e ricostruire il
 * documento per scrivere due righe di testo su un rettangolo.
 *
 * Quindi il disegno non calcola: **legge**. L'app calcola quando ha già tutto in mano —
 * `WidgetPublisher` sta accanto allo `Stack`, come i due watcher delle notifiche — e lascia
 * qui un foglietto in `app_meta`; il task headless lo raccoglie e lo disegna. È la stessa
 * divisione dei tre step di notifica (`reminder.ts`, `budget.ts`, `sync.ts` decidono, il
 * modulo nativo esegue), applicata a un caso in cui i due lati non sono nemmeno vivi nello
 * stesso momento.
 *
 * **Nel foglietto ci sono frasi già fatte, non numeri.** Formattare un importo vuole il
 * simbolo della valuta scelta nel profilo (Step 29), e dire chi deve a chi vuole i nomi dei
 * membri: due cose che stanno nel profilo e nel documento, cioè esattamente le due cose che
 * il task headless non ha. Salvare `cents` e ricostruire la frase di là significherebbe
 * rimontare metà app per riscoprire ciò che l'app sapeva già.
 *
 * **Un campo per widget, e non un oggetto piatto.** Lo Step 34 lo aveva scritto prevedendo il
 * 35, e la previsione ha retto: `month` è entrato accanto a `balance` senza toccare una riga
 * del saldo, e un telefono rimasto al foglietto dello Step 34 continua a disegnare il saldo
 * con il totale del mese assente — invece del foglietto intero illeggibile. È lo stesso
 * criterio con cui `parseSettings` ha accolto il terzo interruttore.
 *
 * **Non c'è una data di aggiornamento, ed è una scelta.** Sarebbe l'unico modo onesto di dire
 * «questo numero è di ieri», perché senza refresh in background il widget resta fermo finché
 * l'app non si riapre — ma un campo che cambia a ogni scrittura, e che nessuno legge, è peso
 * morto. Il problema che risolverebbe è quello che lo **Step 36** esiste per risolvere davvero,
 * e il piano lo tiene esplicitamente in sospeso. Il totale del mese aggira la parte peggiore
 * del problema in un altro modo: **dice di che mese parla**, così un widget vecchio di un
 * giorno resta vero anche il primo del mese dopo.
 */
import { formatMoney, type Cents, type Transfer } from '@jutrack/core';
import { myBalance, type BalanceTone } from '@/features/expenses/balance-line';
import type { WidgetName } from './module';
import { t } from '@/i18n/translate';

/** La chiave in `app_meta`. Una sola per tutti i widget. */
export const SNAPSHOT_KEY = 'widget_snapshot';

/** Quando il task headless ha fatto l'ultimo giro di rete. Il foglietto sta nell'altra chiave. */
export const REFRESH_KEY = 'widget_refreshed_at';

/**
 * Quanto deve passare prima che valga la pena rifare un giro in background.
 *
 * Venticinque minuti contro i trenta di `updatePeriodMillis`, e i cinque di scarto sono la
 * ragione per cui questo numero non è trenta: Android non promette la puntualità — sotto Doze
 * i risvegli si accorpano e possono arrivare **prima** o molto dopo — e una soglia uguale al
 * periodo scarterebbe proprio il giro che è arrivato con qualche minuto di anticipo.
 *
 * Serve soprattutto a un caso banale e frequente: **due widget sulla home sono due risvegli**.
 * Android chiama un provider per volta, quindi a ogni scadenza il task parte due volte, e senza
 * questa soglia farebbe due giri di rete identici a distanza di un istante.
 */
export const REFRESH_COOLDOWN_MS = 25 * 60 * 1000;

/**
 * Se è passato abbastanza tempo dall'ultimo giro.
 *
 * Un valore illeggibile o assente vale «mai fatto», quindi si parte: è la direzione giusta
 * dell'errore, perché il costo è un giro di rete di troppo una volta sola, mentre sbagliare
 * di là — trattarlo come appena fatto — vorrebbe dire un widget che non si aggiorna mai e non
 * dice perché.
 *
 * **Anche un istante nel futuro vale «mai fatto»**: capita spostando l'orologio del telefono,
 * e ripiegare sull'attesa lascerebbe i widget fermi fino a quando quell'istante non arriva
 * davvero.
 */
export function dueForRefresh(raw: string | null, now: number): boolean {
  if (raw === null) return true;
  const last = Number(raw);
  if (!Number.isFinite(last) || last <= 0 || last > now) return true;
  return now - last >= REFRESH_COOLDOWN_MS;
}

/**
 * Le tre righe che un widget disegna, uguali per tutti e due.
 *
 * Non è una comodità: i due widget sono lo **stesso rettangolo** con dentro due numeri
 * diversi — il gruppo sopra, la cifra grande in mezzo, la spiegazione sotto — e averlo scritto
 * una volta sola è ciò che ha reso lo Step 35 un file di viste in più e nient'altro.
 */
export interface WidgetLines {
  /** Il gruppo aperto quando è stata scritta. Il widget mostra quello, non una somma. */
  group: string;
  /** La riga grande: sempre un importo formattato, simbolo compreso. */
  amount: string;
  /** La riga sotto: cosa vuol dire quel numero. L'importo **non** c'è: sta già sopra. */
  caption: string;
}

/** Quello che il widget «Saldo» disegna. */
export interface BalanceSnapshot extends WidgetLines {
  /** Il segno, che decide il colore della cifra. */
  tone: BalanceTone;
}

/**
 * Quello che il widget «Speso questo mese» disegna.
 *
 * Nessun `tone`: una somma di spese non ha un verso da colorare. Il saldo sì, ed è l'unica
 * differenza fra i due foglietti.
 */
export type MonthSnapshot = WidgetLines;

/** Il foglietto intero: un campo per widget. */
export interface WidgetSnapshot {
  /** `null` finché non si è potuto saperlo: nessun gruppo, o app mai aperta. */
  balance: BalanceSnapshot | null;
  month: MonthSnapshot | null;
}

/** Il foglietto di chi non sa ancora niente. Non è un errore: è il primo avvio. */
export const NOTHING_KNOWN: WidgetSnapshot = { balance: null, month: null };

/**
 * Cosa dice il widget del saldo quando non c'è ancora niente da dire.
 *
 * Non è un caso d'errore: è il primo avvio, ed è anche il telefono appena azzerato. Un
 * rettangolo vuoto sembrerebbe un widget rotto; una cifra vecchia sarebbe peggio ancora.
 *
 * **Una funzione e non più una costante** (Step 38): una costante di modulo si calcola
 * all'import, cioè prima che chiunque abbia scelto una lingua, e resterebbe congelata in
 * quella di sistema per tutta la vita del processo. Il costo è una chiamata in più; il
 * risparmio è non avere un widget che parla una lingua diversa dall'app che gli sta sotto.
 */
export function unknownBalance(): BalanceSnapshot {
  return { group: 'JuTrack', amount: '—', caption: t('widget.unknownBalance'), tone: 'even' };
}

/** Lo stesso, per il totale del mese. */
export function unknownMonth(): MonthSnapshot {
  return { group: 'JuTrack', amount: '—', caption: t('widget.unknownMonth') };
}

/**
 * Il foglietto del saldo, dai fatti del gruppo aperto.
 *
 * L'importo esce dalla frase e diventa la riga grande: è la ragione per cui `myBalance`
 * esiste, e la differenza fra questa didascalia e la riga della card in cima alle spese.
 *
 * **Da solo in un gruppo non si è «pari»**, e vale la pena scriverlo. La card sulla home
 * nasconde il saldo quando il gruppo ha un membro solo; il widget non può nascondere niente —
 * quella è tutta la sua superficie — e «Siete pari» direbbe che si è in pareggio con qualcuno
 * che non c'è. Chi è da solo legge il totale del mese, che è l'altro widget.
 */
export function balanceSnapshot(args: {
  groupName: string;
  transfers: Transfer[];
  myMemberId: string;
  /** Quanti membri ha il gruppo, me compreso. */
  memberCount: number;
  nameOf: (memberId: string) => string;
  symbol: string;
}): BalanceSnapshot {
  const { groupName, transfers, myMemberId, memberCount, nameOf, symbol } = args;

  if (memberCount <= 1) {
    return {
      group: groupName,
      amount: formatMoney(0, symbol),
      caption: t('widget.alone'),
      tone: 'even',
    };
  }

  const { tone, cents, counterparties } = myBalance(transfers, myMemberId);
  const alone = counterparties.length === 1;

  const caption =
    tone === 'credit'
      ? alone
        ? t('widget.creditOne', { name: nameOf(counterparties[0]!) })
        : t('widget.creditMany', { count: counterparties.length })
      : tone === 'debt'
        ? alone
          ? t('widget.debtOne', { name: nameOf(counterparties[0]!) })
          : t('widget.debtMany', { count: counterparties.length })
        : t('widget.even');

  return { group: groupName, amount: formatMoney(cents, symbol), caption, tone };
}

/**
 * Il foglietto del totale del mese.
 *
 * **La didascalia nomina il mese, e non dice «questo mese».** È la differenza fra un widget
 * che invecchia male e uno che invecchia bene: senza refresh in background il numero resta
 * quello dell'ultima apertura, e il primo di settembre «speso questo mese» sopra il totale di
 * agosto sarebbe una frase falsa scritta da noi. «Speso in agosto» resta vero anche vecchio di
 * un giorno — dice qualcosa di meno, ma non dice niente di sbagliato. È la stessa regola dei
 * due testi del promemoria e di «Metà e metà»: si sceglie la frase che il tempo non può
 * smentire.
 *
 * `in` e non `a`: regge tutti e dodici i mesi senza dover scegliere fra «a gennaio» e «ad
 * agosto», che è un modo di sbagliare che comparirebbe una volta l'anno.
 *
 * Il totale è quello del **gruppo**, non la mia quota: è lo stesso numero della card in cima
 * alle spese, e due posti che mostrano lo stesso importo devono mostrare lo stesso importo.
 */
export function monthSnapshot(args: {
  groupName: string;
  totalCents: Cents;
  /** Il mese già leggibile: «agosto», o «agosto 2025» se non è l'anno in corso. */
  monthTitle: string;
  symbol: string;
}): MonthSnapshot {
  const { groupName, totalCents, monthTitle, symbol } = args;
  return {
    group: groupName,
    amount: formatMoney(totalCents, symbol),
    caption: t('widget.monthCaption', { month: monthTitle }),
  };
}

/**
 * Rilegge il foglietto, **scartando ciò che non si capisce**.
 *
 * Stesso criterio di `parseSettings` e `parseSyncMarks`, e qui la direzione dell'errore è
 * quella che costa meno di tutte: un campo illeggibile vale «non lo so», e il widget dice
 * «apri l'app» invece di disegnare una cifra inventata. Un widget che chiede di aprire l'app
 * è un widget scomodo; uno che mostra un saldo sbagliato è un widget di cui non ci si fida
 * più.
 *
 * **Ogni widget si legge per conto suo**: un `month` scritto male non porta via il saldo.
 */
export function parseSnapshot(raw: string | null): WidgetSnapshot {
  if (raw === null) return NOTHING_KNOWN;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NOTHING_KNOWN;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return NOTHING_KNOWN;
  }

  const fields = parsed as Record<string, unknown>;
  const balance = readLines(fields['balance']);
  const month = readLines(fields['month']);

  return {
    balance: balance === null ? null : { ...balance, tone: readTone(fields['balance']) },
    month,
  };
}

/**
 * Le tre righe, o `null` se ne manca una.
 *
 * Mezza riga disegnata si legge come un guasto; «apri l'app» si legge come un'attesa.
 */
function readLines(value: unknown): WidgetLines | null {
  if (typeof value !== 'object' || value === null) return null;
  const { group, amount, caption } = value as Record<string, unknown>;
  if (typeof group !== 'string' || typeof amount !== 'string' || typeof caption !== 'string') {
    return null;
  }
  return { group, amount, caption };
}

/**
 * Il segno, che decide **solo un colore**.
 *
 * Se non si capisce si ripiega sul neutro, invece di buttare via un saldo che è scritto
 * giusto: perdere il colore costa molto meno che perdere il numero.
 */
function readTone(value: unknown): BalanceTone {
  const tone = (value as Record<string, unknown> | null)?.['tone'];
  return tone === 'credit' || tone === 'debt' ? tone : 'even';
}

export function serializeSnapshot(snapshot: WidgetSnapshot): string {
  return JSON.stringify(snapshot);
}

/**
 * Quali widget hanno qualcosa di nuovo da mostrare. Vuoto quando non è cambiato niente.
 *
 * Serve a non riscrivere `app_meta` e a non svegliare la home per niente: il documento cambia
 * a ogni spesa, ma i due numeri mostrati cambiano in momenti diversi — una spesa che pago io
 * e teniamo per me sposta il totale del mese e **non** il saldo, una che paghi tu e dividiamo
 * a metà li sposta entrambi. Chiedere «quali», e non «è cambiato qualcosa», è ciò che evita di
 * ridisegnare il saldo ogni volta che cambia il totale.
 *
 * Il confronto passa dal testo che verrebbe scritto comunque, come `settle` in `sync.ts`: nel
 * caso peggiore si paga un aggiornamento di troppo, mai uno perso.
 */
export function changedWidgets(before: WidgetSnapshot, after: WidgetSnapshot): WidgetName[] {
  const changed: WidgetName[] = [];
  if (JSON.stringify(before.balance) !== JSON.stringify(after.balance)) changed.push('Balance');
  if (JSON.stringify(before.month) !== JSON.stringify(after.month)) changed.push('MonthTotal');
  return changed;
}
