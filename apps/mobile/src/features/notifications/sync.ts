/**
 * Quando la sincronizzazione ferma merita un avviso, e cosa dice.
 *
 * **È il terzo dei tre contenuti, e sta in mezzo agli altri due.** Lo Step 31 non poteva
 * essere una condizione — nessuno rilegge un promemoria nel momento in cui suona — ed è
 * diventato una **scadenza**. Lo Step 32 è l'opposto: «hai superato il budget» è una
 * **condizione**, vera o falsa nell'istante in cui si guarda. Qui le due cose stanno
 * insieme, e il piano lo diceva: «bloccato da tempo» ha dentro una durata, quindi è una
 * condizione **su una scadenza** — si guarda come il budget, ma quello che si guarda è da
 * quanto dura.
 *
 * Ne segue che serve un ricordo su disco e non basta lo stato in memoria: la durata da
 * misurare è più lunga di una sessione dell'app, e un contatore che riparte a ogni apertura
 * non arriverebbe mai in fondo proprio a chi apre l'app tutti i giorni.
 *
 * **Due guai e non tre**, benché le fasi in errore siano tre:
 *
 * - `blocked` è **fermo**: il relay rifiuta la chiave, il motore ha smesso di ritentare
 *   (`RelayError.fatal`, cioè 401/403) e nessuna attesa cambierà l'esito. Aspettare un
 *   giorno per dirlo vuol dire regalare un giorno di divergenza: si avvisa **subito**.
 * - `offline` ed `error` sono **in ritardo**: la rete non c'è, o il relay risponde male, e
 *   il motore riprova da solo. Nove volte su dieci passa da sé, e un avviso a ogni
 *   singhiozzo è il modo più rapido di far spegnere l'interruttore: si aspetta.
 *
 * **`offline` conta come `error`, ed è una scelta.** Lo Step 17 ha stabilito che offline
 * non è un errore del relay, e infatti la schermata lo dice senza allarme. Ma quello che
 * questo avviso serve a evitare — credere che i due telefoni siano allineati quando non lo
 * sono — succede identico nei due casi, e dopo ventiquattr'ore «sono in aereo» non è più una
 * spiegazione. Cambia il rimedio, non il fatto: infatti cambia il testo, non la regola.
 *
 * **`idle` e `syncing` non dicono niente**, e non toccano nulla: sono le due fasi da cui
 * l'app passa a ogni avvio e a ogni giro di poll. Trattarle come «tutto a posto»
 * azzererebbe il conto a ogni apertura, che è esattamente il contatore che non arriva mai in
 * fondo.
 */
import type { SyncState } from '@jutrack/core';
import type { AlertContent } from './content';

/** La chiave in `app_meta`. Una sola per tutti i gruppi. */
export const SYNC_MARKS_KEY = 'sync_alerts';

/**
 * Da quante ore di sincronizzazione ferma parte l'avviso.
 *
 * Ventiquattro e non tre: un guasto del relay che dura un'ora è un guasto del relay che
 * dura un'ora, e una serata senza campo non è una notizia. Un giorno intero senza che una
 * spesa raggiunga l'altro telefono, invece, non passa più da sé — e lo legge anche la riga
 * sotto l'interruttore in Tu, invece di riscriverlo a mano lì.
 */
export const SYNC_STALL_HOURS = 24;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Le fasi che sono un guaio. Le altre due (`idle`, `syncing`) non sono niente. */
export type TroublePhase = 'offline' | 'error' | 'blocked';

/**
 * Quanto è grave, senza dire perché.
 *
 * Due livelli e non tre perché è il livello a decidere **quando** si avvisa, e `offline` ed
 * `error` aspettano lo stesso tempo. Il perché torna nel testo, che legge la fase.
 */
export type SyncTrouble = 'stalled' | 'stopped';

/** Un episodio di guaio in corso su un gruppo. Sparisce quando il sync riesce. */
export interface SyncMark {
  level: SyncTrouble;
  /** Da quando dura, in millisecondi. Sopravvive alla chiusura dell'app: è il punto. */
  since: number;
  /** Se l'avviso di questo episodio è già partito. Uno per episodio, non uno al giorno. */
  notified: boolean;
}

/** Per `vaultId`: ogni gruppo ha il suo motore, quindi il suo guaio. */
export type SyncMarks = Record<string, SyncMark>;

const LEVEL_OF: Record<TroublePhase, SyncTrouble> = {
  offline: 'stalled',
  error: 'stalled',
  blocked: 'stopped',
};

/** Quanto deve durare il guaio prima di dirlo. `stopped` non aspetta: non c'è cosa aspettare. */
const WAIT_MS: Record<SyncTrouble, number> = {
  stalled: SYNC_STALL_HOURS * HOUR_MS,
  stopped: 0,
};

const RANK: Record<SyncTrouble, number> = { stalled: 1, stopped: 2 };

function isTroublePhase(phase: SyncState['phase']): phase is TroublePhase {
  return phase === 'offline' || phase === 'error' || phase === 'blocked';
}

/**
 * Rilegge i segni, **scartando uno per uno quelli che non si capiscono**.
 *
 * Stesso criterio di `parseMarks` e `parseSettings`, e stessa direzione dell'errore: un
 * segno illeggibile vale «episodio mai visto», quindi il conto riparte da adesso. Sbagliare
 * di là — trattarlo come un episodio vecchio e già maturo — farebbe partire un avviso su un
 * guasto che potrebbe essere finito da settimane.
 */
export function parseSyncMarks(raw: string | null): SyncMarks {
  if (raw === null) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};

  const clean: SyncMarks = {};
  for (const [vaultId, value] of Object.entries(parsed as Record<string, unknown>)) {
    const mark = readMark(value);
    if (mark !== null) clean[vaultId] = mark;
  }
  return clean;
}

function readMark(value: unknown): SyncMark | null {
  if (typeof value !== 'object' || value === null) return null;
  const { level, since, notified } = value as Record<string, unknown>;
  if (level !== 'stalled' && level !== 'stopped') return null;
  // `since` è la sola cosa che non si può ricostruire: senza un istante credibile non c'è
  // durata da misurare, e uno zero farebbe scadere l'episodio all'istante.
  if (typeof since !== 'number' || !Number.isFinite(since) || since <= 0) return null;
  return { level, since, notified: notified === true };
}

export function serializeSyncMarks(marks: SyncMarks): string {
  return JSON.stringify(marks);
}

/**
 * Butta via i segni dei gruppi che non ci sono più.
 *
 * L'equivalente della potatura per mese dei budget, su un asse diverso: là un mese finito
 * non può più essere sforato, qui un gruppo da cui si è usciti non può più sincronizzarsi.
 * Senza, uscire da un gruppo mentre il relay era giù lascerebbe una riga per sempre dentro
 * una tabella che nessuno guarda.
 */
export function pruneSyncMarks(marks: SyncMarks, knownVaultIds: readonly string[]): SyncMarks {
  const known = new Set(knownVaultIds);
  const kept: SyncMarks = {};
  for (const [vaultId, mark] of Object.entries(marks)) {
    if (known.has(vaultId)) kept[vaultId] = mark;
  }
  return kept;
}

/** Un episodio che ha appena meritato un avviso. */
export interface SyncAlert {
  /** La fase di adesso: decide il testo, non il momento. */
  phase: TroublePhase;
  /** Da quanto dura l'episodio. Zero per `blocked`, che si dice appena succede. */
  forMs: number;
}

export interface SyncReview {
  /** `null` nel caso normale, che è quasi sempre. */
  alert: SyncAlert | null;
  marks: SyncMarks;
  /** Falso quando i segni sono identici a prima: evita di riscrivere `app_meta` a vuoto. */
  changed: boolean;
}

/**
 * Cosa è cambiato nella sincronizzazione di questo gruppo, e cosa va ricordato.
 *
 * Le regole, e il modo di sbagliare che ciascuna chiude:
 *
 * - **Il livello sale e non scende**, come per i budget. Un episodio che comincia in
 *   `offline` e finisce in `blocked` merita il secondo avviso — è un fatto diverso, con un
 *   rimedio diverso — ma un `blocked` che al riavvio ricade in `error` no: è lo stesso
 *   guaio visto da un'altra angolazione, e ridirlo insegna a non leggere.
 * - **Un avviso per episodio.** L'episodio finisce al primo `synced`, e solo allora si
 *   riparte da capo. Ripetere ogni giorno «il relay non risponde» non aggiunge niente a chi
 *   l'ha già letto una volta.
 * - **Il conto riparte solo quando il sync riesce**, non quando l'app si chiude: è quello
 *   che permette alla scadenza di essere più lunga di una sessione.
 *
 * **La funzione non sa se l'interruttore è acceso, ed è voluto**, come per i budget: i segni
 * vanno tenuti aggiornati comunque, o riaccenderlo produrrebbe un avviso su un guasto che si
 * era scelto di non farsi raccontare. A decidere se l'`alert` diventa una notifica è chi
 * chiama.
 */
export function reviewSync(args: {
  vaultId: string;
  phase: SyncState['phase'];
  marks: SyncMarks;
  /** I gruppi che esistono ancora su questo telefono: tutto il resto si pota. */
  knownVaultIds: readonly string[];
  now: number;
}): SyncReview {
  const { vaultId, phase, marks, knownVaultIds, now } = args;

  const pruned = pruneSyncMarks(marks, knownVaultIds);

  // `idle` e `syncing` non sono un giudizio: sono il prima e il durante di un giro. Si esce
  // senza toccare niente, che è diverso dall'uscire dicendo «a posto».
  if (phase === 'idle' || phase === 'syncing') return settle(marks, pruned, null);

  if (!isTroublePhase(phase)) {
    // `synced`: l'episodio è chiuso, e il segno sparisce invece di restare marcato come
    // «già avvisato». È così che il guaio successivo può avvisare di nuovo.
    const resolved = { ...pruned };
    delete resolved[vaultId];
    return settle(marks, resolved, null);
  }

  const level = LEVEL_OF[phase];
  const previous = pruned[vaultId];
  // Un episodio nuovo, o lo stesso episodio che è peggiorato: in entrambi i casi il conto
  // riparte e l'avviso si riarma.
  const fresh = previous === undefined || RANK[level] > RANK[previous.level];
  const mark: SyncMark = fresh ? { level, since: now, notified: false } : previous;

  if (mark.notified || now - mark.since < WAIT_MS[mark.level]) {
    return settle(marks, { ...pruned, [vaultId]: mark }, null);
  }

  return settle(
    marks,
    { ...pruned, [vaultId]: { ...mark, notified: true } },
    { phase, forMs: now - mark.since },
  );
}

/**
 * Confronta il prima e il dopo passando dal testo che verrà scritto comunque.
 *
 * Non è pigrizia: la domanda vera è «vale la pena riscrivere `app_meta`?», e la risposta
 * esatta è «se il JSON è diverso». Nel caso peggiore — stessi dati, chiavi in ordine
 * diverso — si paga una scrittura di troppo, mai un segno perso.
 */
function settle(before: SyncMarks, after: SyncMarks, alert: SyncAlert | null): SyncReview {
  return {
    alert,
    marks: after,
    changed: serializeSyncMarks(before) !== serializeSyncMarks(after),
  };
}

/**
 * Da quanto dura, come lo direbbe una persona.
 *
 * Solo giorni: l'avviso in ritardo esce a ventiquattr'ore compiute, quindi «ore» non capita
 * mai, e l'unico caso più corto — `blocked`, che parte a zero — non passa di qui.
 */
function lasting(forMs: number): string {
  const days = Math.floor(forMs / DAY_MS);
  return days <= 1 ? 'da un giorno' : `da ${days} giorni`;
}

/**
 * Cosa c'è scritto nella tendina.
 *
 * **Il nome del gruppo c'è sempre**, a differenza dell'avviso di budget: quello si legge
 * mentre lo si è provocato, questo si legge ore dopo, e con più gruppi sul telefono «non si
 * sincronizza» senza dire *cosa* obbliga ad aprire l'app per scoprirlo.
 *
 * Tre testi per due livelli, perché il livello decide quando avvisare e la fase decide dove
 * andare a rimediare: la connessione è una cosa dell'utente, il relay che non risponde è una
 * cosa che passa da sé, la chiave rifiutata è l'unica che chiede di fare qualcosa.
 */
export function syncContent(alert: SyncAlert, groupName: string): AlertContent {
  if (alert.phase === 'blocked') {
    return {
      // La stessa frase del pallino in Tu e in `describe.ts`: chi l'ha già vista lì deve
      // riconoscerla, non chiedersi se sono due guasti diversi.
      title: 'Sincronizzazione fermata',
      body:
        `Il relay rifiuta la chiave di «${groupName}»: le spese non partono più. ` +
        'Di solito vuol dire che il gruppo è stato rigenerato, e serve un invito nuovo.',
    };
  }

  if (alert.phase === 'offline') {
    return {
      title: 'Spese non sincronizzate',
      body: `Nessuna connessione ${lasting(alert.forMs)}: quello che registri in «${groupName}» resta su questo telefono.`,
    };
  }

  return {
    title: 'Spese non sincronizzate',
    body: `Il relay non risponde ${lasting(alert.forMs)}: «${groupName}» non è allineato con gli altri telefoni.`,
  };
}
