/**
 * Quando un budget merita un avviso, e cosa dice.
 *
 * **È l'opposto esatto dello Step 31, e vale la pena dirlo.** Il promemoria non poteva
 * essere una condizione — nessuno la rilegge quando la notifica suona — ed è diventato una
 * scadenza. Qui è il contrario: «hai superato il budget» **è** una condizione, e per di più
 * una condizione che cambia solo quando cambia il documento. Non c'è nessuna data da
 * calcolare: si guarda, e se è appena successo si avvisa subito.
 *
 * Ne segue il limite onesto della cosa: **l'app deve essere aperta**. Una spesa registrata
 * sull'altro telefono sfonda il budget nell'istante in cui viene scritta, ma questo telefono
 * lo scopre quando la riceve col sync, cioè quando qualcuno apre l'app. Un avviso in
 * differita è comunque vero — il limite è superato adesso — e l'alternativa sarebbe un
 * processo in background, che è lo Step 36 e resta opzionale.
 *
 * **Il confine con `packages/core` non si sposta.** Chi decide se un limite è vicino o
 * superato resta `insights/budget.ts`, con la sua soglia dell'80%. Qui si decide una cosa
 * sola, che il core non può sapere: se quello stato **è nuovo**.
 */
import { formatMoney, type BudgetState, type BudgetStatus, type IsoMonth } from '@jutrack/core';

/** La chiave in `app_meta`. Una sola per tutti i gruppi e tutti i mesi. */
export const MARKS_KEY = 'budget_alerts';

/**
 * Il livello di cui si è già avvisati. `under` non compare: è l'assenza.
 *
 * `BudgetState` meno `under`, e non un tipo scritto a mano, così se il core aggiungesse un
 * quarto stato il typecheck lo porterebbe qui invece di lasciarlo cadere nel silenzio.
 */
export type AlertLevel = Exclude<BudgetState, 'under'>;

/**
 * Fin dove è arrivato ogni budget **mentre lo si guardava**.
 *
 * Due campi e non uno, perché le due domande sono diverse: `levels` dice a che livello è
 * arrivata una categoria, `watched` dice se questo telefono stava guardando quel gruppo in
 * quel mese. Senza il secondo, «tutto sotto controllo» e «non ho mai guardato» sarebbero lo
 * stesso stato — un `levels` vuoto — e la prima apertura di un gruppo già sforato
 * produrrebbe un avviso su qualcosa che è successo settimane fa.
 */
export interface BudgetMarks {
  /** `vaultId|month` dei periodi di cui si è già preso il punto di partenza. */
  watched: string[];
  /** `vaultId|month|categoryId` → livello più alto raggiunto. */
  levels: Record<string, AlertLevel>;
}

const EMPTY_MARKS: BudgetMarks = { watched: [], levels: {} };

/** Un gruppo in un mese: l'unità di cui si prende il punto di partenza. */
function periodKey(vaultId: string, month: IsoMonth): string {
  return `${vaultId}|${month}`;
}

/**
 * Il mese sta **in mezzo** alla chiave di proposito.
 *
 * È il campo su cui si pota (`pruneMarks`), e leggerlo con uno `split` a posizione fissa
 * funziona solo se non è né il primo né l'ultimo pezzo: `vaultId` e `categoryId` sono
 * esadecimali, il mese è `YYYY-MM`, e nessuno dei tre contiene una barra verticale.
 */
function levelKey(vaultId: string, month: IsoMonth, categoryId: string): string {
  return `${vaultId}|${month}|${categoryId}`;
}

function monthOfKey(key: string): string | undefined {
  return key.split('|')[1];
}

const RANK: Record<BudgetState, number> = { under: 0, near: 1, over: 2 };

function rank(level: AlertLevel | undefined): number {
  return level === undefined ? 0 : RANK[level];
}

function isAlertLevel(value: unknown): value is AlertLevel {
  return value === 'near' || value === 'over';
}

/**
 * Rilegge i segni lasciati, **scartando tutto ciò che non si capisce**.
 *
 * Stesso criterio di `parseLayout` e `parseSettings`, con una conseguenza diversa: qui un
 * valore illeggibile non spegne niente, fa **ricominciare da capo** — e ricominciare da capo
 * significa prendere di nuovo il punto di partenza in silenzio, non sparare gli avvisi
 * arretrati. È la direzione giusta dell'errore: un file corrotto non deve produrre una
 * raffica di notifiche su budget sforati la settimana scorsa.
 */
export function parseMarks(raw: string | null): BudgetMarks {
  if (raw === null) return EMPTY_MARKS;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY_MARKS;
  }
  if (typeof parsed !== 'object' || parsed === null) return EMPTY_MARKS;

  const { watched, levels } = parsed as Record<string, unknown>;

  const cleanWatched = Array.isArray(watched)
    ? watched.filter((entry): entry is string => typeof entry === 'string')
    : [];

  const cleanLevels: Record<string, AlertLevel> = {};
  if (typeof levels === 'object' && levels !== null) {
    for (const [key, value] of Object.entries(levels as Record<string, unknown>)) {
      if (isAlertLevel(value)) cleanLevels[key] = value;
    }
  }

  return { watched: cleanWatched, levels: cleanLevels };
}

export function serializeMarks(marks: BudgetMarks): string {
  return JSON.stringify(marks);
}

/**
 * Butta via tutto ciò che non riguarda il mese in corso.
 *
 * Un budget appartiene a un mese, e a mese finito non può più essere superato: la spesa
 * porta sempre la data del giorno in cui viene registrata — il form non ha un selettore di
 * date, ed è una scelta del redesign — quindi nessuna spesa nuova può ricadere in agosto a
 * settembre. Senza la potatura il registro crescerebbe di una riga per categoria per mese,
 * per sempre, dentro una tabella che nessuno guarda.
 *
 * **Si pota per mese e non per gruppo**: i gruppi aperti sono più d'uno e ciascuno tiene il
 * proprio conto nello stesso mese.
 */
export function pruneMarks(marks: BudgetMarks, month: IsoMonth): BudgetMarks {
  const levels: Record<string, AlertLevel> = {};
  for (const [key, value] of Object.entries(marks.levels)) {
    if (monthOfKey(key) === month) levels[key] = value;
  }
  return {
    watched: marks.watched.filter((key) => monthOfKey(key) === month),
    levels,
  };
}

/** Un budget che ha appena cambiato livello, con i numeri che finiscono nel testo. */
export interface BudgetAlert {
  categoryId: string;
  level: AlertLevel;
  spentCents: number;
  limitCents: number;
  /** Negativo quando il limite è superato, come in `BudgetStatus`. */
  remainingCents: number;
}

export interface Crossings {
  /** Vuoto quando non c'è niente da dire — il caso normale, a ogni modifica del documento. */
  alerts: BudgetAlert[];
  marks: BudgetMarks;
  /** Falso quando i segni sono identici a prima: serve a non riscrivere `app_meta` a vuoto. */
  changed: boolean;
}

/**
 * Cosa è cambiato da com'era, e cosa va ricordato.
 *
 * Tre regole, e ognuna esiste per un modo diverso di sbagliare:
 *
 * - **Il livello sale e non scende.** Cancellare una spesa riporta una categoria da `over`
 *   a `near`, e senza questa regola la spesa successiva riavviserebbe. Un budget che
 *   oscilla intorno all'80% suonerebbe a ogni scontrino, che è il modo più rapido di far
 *   spegnere l'interruttore.
 * - **La prima volta si guarda e basta.** Un gruppo mai visto in questo mese — appena
 *   creato, appena aperto, o semplicemente il primo giorno del mese nuovo — registra lo
 *   stato di adesso senza dire niente. Un avviso deve raccontare qualcosa di appena
 *   successo; «questo budget era già sforato quando ho cominciato a guardare» non lo è.
 * - **`under` non si registra.** È l'assenza di un segno, non un segno: tenerlo
 *   raddoppierebbe le righe salvate senza distinguere nulla.
 *
 * **La funzione non sa se l'interruttore è acceso, ed è voluto.** I segni vanno tenuti
 * aggiornati comunque: se si smettesse di guardare a interruttore spento, riaccenderlo
 * produrrebbe una raffica di avvisi su sforamenti avvenuti mentre si era deciso di non
 * essere disturbati. A decidere se gli `alerts` diventano notifiche è chi chiama.
 */
export function detectCrossings(args: {
  statuses: BudgetStatus[];
  marks: BudgetMarks;
  vaultId: string;
  month: IsoMonth;
}): Crossings {
  const { statuses, marks, vaultId, month } = args;

  const period = periodKey(vaultId, month);
  const first = !marks.watched.includes(period);

  const levels = { ...marks.levels };
  const alerts: BudgetAlert[] = [];

  for (const status of statuses) {
    if (status.state === 'under') continue;
    const key = levelKey(vaultId, month, status.categoryId);
    if (RANK[status.state] <= rank(levels[key])) continue;

    levels[key] = status.state;
    if (!first) {
      alerts.push({
        categoryId: status.categoryId,
        level: status.state,
        spentCents: status.spentCents,
        limitCents: status.limitCents,
        remainingCents: status.remainingCents,
      });
    }
  }

  const watched = first ? [...marks.watched, period] : marks.watched;
  const pruned = pruneMarks({ watched, levels }, month);
  const changed =
    first ||
    alerts.length > 0 ||
    pruned.watched.length !== marks.watched.length ||
    Object.keys(pruned.levels).length !== Object.keys(marks.levels).length;

  return { alerts, marks: pruned, changed };
}

export interface AlertContent {
  title: string;
  body: string;
}

/**
 * Nomi in fila, come si direbbero a voce: «Spesa e Casa», «Spesa, Casa e Bollette».
 *
 * Oltre tre diventa un elenco che nella tendina delle notifiche viene troncato a metà
 * parola, e allora è meglio contare.
 */
function joinNames(names: string[]): string {
  if (names.length <= 3) {
    const head = names.slice(0, -1);
    const last = names[names.length - 1] ?? '';
    return head.length === 0 ? last : `${head.join(', ')} e ${last}`;
  }
  return `${names.slice(0, 2).join(', ')} e altre ${names.length - 2}`;
}

/**
 * Cosa c'è scritto nella tendina.
 *
 * **Un avviso solo anche quando i budget sono tre.** Aprendo l'app dopo un sync possono
 * essere passate di livello più categorie insieme, e tre notifiche identiche una sotto
 * l'altra sono il modo in cui si smette di leggerle. Il caso singolo però dice i numeri,
 * perché il numero è tutta l'informazione utile: sapere *quanto* si è sforato è ciò che
 * distingue un avviso da un rimprovero.
 *
 * `nameOf` e non una mappa: chi chiama ha già le categorie in mano e sa cosa scrivere per
 * una che non c'è più — la stessa frase di `BudgetRows`, non un id esadecimale.
 */
export function budgetContent(
  alerts: BudgetAlert[],
  nameOf: (categoryId: string) => string,
  symbol = '€',
): AlertContent {
  const names = alerts.map((alert) => nameOf(alert.categoryId));

  if (alerts.length > 1) {
    const allOver = alerts.every((alert) => alert.level === 'over');
    return {
      title: allOver ? `${alerts.length} budget superati` : `${alerts.length} budget da guardare`,
      body: `${joinNames(names)}. Li trovi nei Grafici.`,
    };
  }

  const alert = alerts[0];
  if (alert === undefined) {
    // Non capita: chi chiama non notifica su un elenco vuoto. Ma una funzione che
    // costruisce testo non deve poter produrre `undefined` dentro una frase.
    return { title: 'Budget', body: 'Niente da segnalare.' };
  }

  const name = names[0] ?? '';
  const spent = formatMoney(alert.spentCents, symbol);
  const limit = formatMoney(alert.limitCents, symbol);

  if (alert.level === 'over') {
    return {
      title: 'Budget superato',
      body: `${name}: ${spent} su ${limit} questo mese, ${formatMoney(-alert.remainingCents, symbol)} in più.`,
    };
  }
  return {
    title: 'Budget quasi finito',
    body: `${name}: ${spent} su ${limit} questo mese. Restano ${formatMoney(alert.remainingCents, symbol)}.`,
  };
}
