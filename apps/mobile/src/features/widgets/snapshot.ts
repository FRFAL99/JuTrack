/**
 * Quello che i widget sanno, scritto su disco.
 *
 * **È la decisione che regge lo Step 34, e nasce da un fatto della piattaforma.** Un widget
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
 * **Non c'è una data di aggiornamento, ed è una scelta.** Sarebbe l'unico modo onesto di dire
 * «questo numero è di ieri», perché senza refresh in background il widget resta fermo finché
 * l'app non si riapre — ma un campo che cambia a ogni scrittura, e che nessuno legge, è peso
 * morto. Il problema che risolverebbe è quello che lo **Step 36** esiste per risolvere davvero,
 * e il piano lo tiene esplicitamente in sospeso: se dopo l'uso reale il widget si dimostra
 * troppo vecchio, la risposta è aggiornarlo, non datarlo.
 */
import { formatMoney, type Transfer } from '@jutrack/core';
import { myBalance, type BalanceTone } from '@/features/expenses/balance-line';

/** La chiave in `app_meta`. Una sola per tutti i widget. */
export const SNAPSHOT_KEY = 'widget_snapshot';

/** Quello che il widget «Saldo» disegna. Tre stringhe e un segno, niente da calcolare. */
export interface BalanceSnapshot {
  /** Il gruppo aperto quando è stata scritta. Il widget mostra quello, non una somma. */
  group: string;
  /** La riga grande: sempre un importo formattato, simbolo compreso. */
  amount: string;
  /** La riga sotto: chi, e da che parte. L'importo **non** c'è: sta già sopra. */
  caption: string;
  tone: BalanceTone;
}

/**
 * Il foglietto intero.
 *
 * Un campo per widget, e non un oggetto piatto: lo Step 35 aggiunge `month` accanto a
 * `balance`, e `parseSnapshot` legge un campo per volta apposta — un telefono che ha ancora
 * il foglietto scritto dallo Step 34 continuerà a leggere il saldo, con il totale del mese
 * assente invece di tutto il foglietto illeggibile. È lo stesso criterio con cui
 * `parseSettings` ha accolto il terzo interruttore senza toccare gli altri due.
 */
export interface WidgetSnapshot {
  /** `null` finché non si è potuto saperlo: nessun gruppo, o app mai aperta. */
  balance: BalanceSnapshot | null;
}

/**
 * Cosa dice il widget quando non c'è ancora niente da dire.
 *
 * Non è un caso d'errore: è il primo avvio, ed è anche il telefono appena azzerato. Un
 * rettangolo vuoto sembrerebbe un widget rotto; una cifra vecchia sarebbe peggio ancora.
 */
export const UNKNOWN_BALANCE: BalanceSnapshot = {
  group: 'JuTrack',
  amount: '—',
  caption: "Apri l'app per vedere il saldo",
  tone: 'even',
};

/**
 * Il foglietto di adesso, dai fatti del gruppo aperto.
 *
 * L'importo esce dalla frase e diventa la riga grande: è la ragione per cui `myBalance`
 * esiste, e la differenza fra questa didascalia e la riga della card in cima alle spese.
 *
 * **Da solo in un gruppo non si è «pari»**, e vale la pena scriverlo. La card sulla home nasconde
 * il saldo quando il gruppo ha un membro solo; il widget non può nascondere niente — quella
 * è tutta la sua superficie — e «Siete pari» direbbe che si è in pareggio con qualcuno che
 * non c'è. Chi è da solo legge il totale del mese, che è il widget dello Step 35.
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
      caption: 'Solo tu in questo gruppo',
      tone: 'even',
    };
  }

  const { tone, cents, counterparties } = myBalance(transfers, myMemberId);
  const alone = counterparties.length === 1;

  const caption =
    tone === 'credit'
      ? alone
        ? `${nameOf(counterparties[0]!)} ti deve`
        : `In ${counterparties.length} ti devono`
      : tone === 'debt'
        ? alone
          ? `Devi a ${nameOf(counterparties[0]!)}`
          : `Devi a ${counterparties.length} persone`
        : 'Siete pari';

  return { group: groupName, amount: formatMoney(cents, symbol), caption, tone };
}

/**
 * Rilegge il foglietto, **scartando ciò che non si capisce**.
 *
 * Stesso criterio di `parseSettings` e `parseSyncMarks`, e qui la direzione dell'errore è
 * quella che costa meno di tutte: un campo illeggibile vale «non lo so», e il widget dice
 * «apri l'app» invece di disegnare una cifra inventata. Un widget che chiede di aprire l'app
 * è un widget scomodo; uno che mostra un saldo sbagliato è un widget di cui non ci si fida
 * più.
 */
export function parseSnapshot(raw: string | null): WidgetSnapshot {
  if (raw === null) return { balance: null };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { balance: null };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { balance: null };
  }

  return { balance: readBalance((parsed as Record<string, unknown>)['balance']) };
}

function readBalance(value: unknown): BalanceSnapshot | null {
  if (typeof value !== 'object' || value === null) return null;
  const { group, amount, caption, tone } = value as Record<string, unknown>;

  // Le tre stringhe sono ciò che si disegna: senza una di loro il widget avrebbe una riga
  // vuota in mezzo alle altre, che si legge come un guasto e non come un'assenza.
  if (typeof group !== 'string' || typeof amount !== 'string' || typeof caption !== 'string') {
    return null;
  }
  // Il segno decide solo un colore: se non si capisce, si ripiega sul neutro invece di
  // buttare via un saldo che è scritto giusto.
  const clean: BalanceTone = tone === 'credit' || tone === 'debt' ? tone : 'even';
  return { group, amount, caption, tone: clean };
}

export function serializeSnapshot(snapshot: WidgetSnapshot): string {
  return JSON.stringify(snapshot);
}

/**
 * Se il foglietto nuovo dice qualcosa di diverso da quello vecchio.
 *
 * Serve a non riscrivere `app_meta` e a non svegliare il widget per niente: il documento
 * cambia a ogni spesa, il saldo mostrato molto più di rado — una spesa pagata da me e divisa
 * a metà cambia il saldo, una che pago tutta io per me stesso no. Il confronto passa dal
 * testo che verrebbe scritto comunque, come `settle` in `sync.ts`: nel caso peggiore si paga
 * un aggiornamento di troppo, mai uno perso.
 */
export function sameSnapshot(a: WidgetSnapshot, b: WidgetSnapshot): boolean {
  return serializeSnapshot(a) === serializeSnapshot(b);
}
