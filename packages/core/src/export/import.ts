/**
 * Rilettura di un export JSON — la metà che mancava.
 *
 * `toJsonExport` produceva una copia integrale del vault che **nessuno sapeva rileggere**:
 * il file serviva a portare i dati altrove, non a farli rientrare. Chi perdeva il telefono
 * senza il backup della chiave si ritrovava un file pieno di spese e nessun modo di
 * riaverle dentro l'app se non riscrivendole a mano.
 *
 * **Questo file è una porta, e va trattato come tale.** Tutto il resto del modello riceve
 * dati scritti dall'app o arrivati cifrati dall'altro telefono; qui invece entra un file
 * che può essere stato modificato a mano, troncato da un trasferimento, prodotto da una
 * versione futura, o semplicemente non essere nostro. Il criterio è quello di `strList` e
 * di `parseMarks`, applicato con più forza perché quello che passa di qui finisce **dentro
 * il documento** e da lì si sincronizza: un dato sbagliato accettato adesso raggiunge
 * l'altro telefono e non si disfa più.
 *
 * **Due livelli di rifiuto, e la differenza conta.**
 *
 * - Il **file** si rifiuta intero quando non si sa cosa sia: JSON illeggibile, `format`
 *   sbagliato, versione futura. Non c'è niente da salvare e proseguire vorrebbe dire
 *   indovinare.
 * - Il **record** si scarta da solo quando il file è giusto ma quella riga non sta in
 *   piedi. Scartare in silenzio sarebbe il difetto peggiore di tutti — chi importa
 *   crederebbe di aver riavuto tutto — quindi ogni scarto finisce nel report **con il
 *   motivo**, e chi chiama lo mostra.
 *
 * **Le invarianti si difendono qui, non a valle.** Le quote che sommano al totale, gli
 * importi interi, i riferimenti ai membri che esistono: sono le stesse regole che
 * `VaultStore` fa rispettare in scrittura, e questo è l'unico punto in cui dei record
 * arrivano già formati senza passare da `addExpense`. Una spesa le cui quote non tornano
 * produrrebbe un saldo sbagliato per sempre, e nessuno saprebbe da dove viene.
 */
import type { Cents } from '../model/money';
import { isValidCents } from '../model/money';
import type {
  Budget,
  Category,
  Expense,
  ExpenseSplit,
  Member,
  Settlement,
  SplitMode,
  VaultSnapshot,
} from '../model/types';
import { EXPORT_FORMAT_NAME, EXPORT_FORMAT_VERSION } from './json';

/** Le famiglie di record, per dire nel report da quale viene uno scarto. */
export type ImportKind = 'expense' | 'category' | 'member' | 'budget' | 'settlement';

/** Un record che non è entrato, e perché. Il «perché» è la parte utile. */
export interface ImportSkip {
  kind: ImportKind;
  /** L'id del record, o `'(senza id)'` quando è proprio l'id a mancare. */
  id: string;
  /** In italiano e per un umano: finisce a schermo così com'è. */
  reason: string;
}

/** Quanti record sono entrati, per famiglia. */
export interface ImportCounts {
  expenses: number;
  categories: number;
  members: number;
  budgets: number;
  settlements: number;
}

export interface ImportReport {
  /** La versione dichiarata dal file: 1 non ha `store` né `tags`, 2 sì. */
  version: number;
  /** Quando il file è stato prodotto, `null` se non lo dice o lo dice male. */
  exportedAt: string | null;
  kept: ImportCounts;
  /** Vuoto quando è entrato tutto, che è il caso di un file non manomesso. */
  skipped: ImportSkip[];
}

export type ImportResult =
  | { ok: true; snapshot: VaultSnapshot; report: ImportReport }
  /** `reason` è già una frase da mostrare: chi chiama non deve tradurre un codice. */
  | { ok: false; reason: string };

/* -------------------------------------------------------------------------- */
/* Letture difensive                                                           */
/* -------------------------------------------------------------------------- */

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function nonEmptyStr(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

function nullableStr(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/**
 * Un importo, o `null` se non è un intero in centesimi.
 *
 * `isValidCents` e non un `typeof === 'number'`: un `12.5` in un file scritto a mano è
 * esattamente il float che la regola ferrea del progetto tiene fuori dal modello, e
 * arrotondarlo qui vorrebbe dire decidere per conto di chi l'ha scritto.
 */
function cents(value: unknown): Cents | null {
  return typeof value === 'number' && isValidCents(value) ? value : null;
}

function strArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function record(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** Gli elementi che sono oggetti; il resto sparisce prima di essere guardato. */
function objectList(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.map(record).filter((item): item is Record<string, unknown> => item !== null);
}

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function isSplitMode(value: unknown): value is SplitMode {
  return value === 'equal' || value === 'custom' || value === 'single';
}

/* -------------------------------------------------------------------------- */
/* Il file                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Legge un file d'export e ne ricava una fotografia da scrivere in un vault.
 *
 * **Le versioni vecchie si accettano, quelle future no.** Un file v1 non ha `store` né
 * `tags` e si legge con gli stessi fallback (`''` e `[]`) che `readExpense` usa sui record
 * scritti prima dello Step 23: è la stessa additività, vista dall'altro lato. Un file di
 * versione **maggiore** della nostra si rifiuta invece di leggerne la parte comprensibile,
 * ed è la regola dei formati binari di `docs/architecture.md` applicata qui: un client
 * vecchio che legge a metà un formato nuovo scrive nel documento una versione mutilata dei
 * dati, e li sincronizza. Meglio dire «serve un'app più recente».
 */
export function parseVaultExport(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'Questo non è un file JSON: non si riesce nemmeno a leggerlo.' };
  }

  const root = record(parsed);
  if (root === null) {
    return { ok: false, reason: 'Il file non contiene un oggetto JSON.' };
  }

  if (root.format !== EXPORT_FORMAT_NAME) {
    return {
      ok: false,
      reason:
        'Questo file non è un export di JuTrack. Serve quello prodotto da «Tutto il vault (JSON)».',
    };
  }

  const version = root.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, reason: 'Il file non dichiara una versione valida del formato.' };
  }
  if (version > EXPORT_FORMAT_VERSION) {
    return {
      ok: false,
      reason:
        `Il file è in formato v${version}, e questa app arriva alla v${EXPORT_FORMAT_VERSION}. ` +
        'Aggiorna JuTrack: leggerlo a metà scriverebbe dati incompleti.',
    };
  }

  const skipped: ImportSkip[] = [];

  // **L'ordine non è casuale.** Membri e categorie si leggono per primi perché spese,
  // budget e pareggi li riferiscono per id: senza saperli già, non si potrebbe distinguere
  // un riferimento valido da uno che punta al nulla.
  const members = readMembers(objectList(root.members), skipped);
  const categories = readCategories(objectList(root.categories), skipped);

  const memberIds = new Set(members.map((member) => member.id));
  const categoryIds = new Set(categories.map((category) => category.id));

  const expenses = readExpenses(objectList(root.expenses), memberIds, categoryIds, skipped);
  const budgets = readBudgets(objectList(root.budgets), categoryIds, skipped);
  const settlements = readSettlements(objectList(root.settlements), memberIds, skipped);

  return {
    ok: true,
    snapshot: { expenses, categories, members, budgets, settlements },
    report: {
      version,
      exportedAt: nullableStr(root.exportedAt),
      kept: {
        expenses: expenses.length,
        categories: categories.length,
        members: members.length,
        budgets: budgets.length,
        settlements: settlements.length,
      },
      skipped,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* I record                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Il primo con un dato id vince, i successivi si scartano.
 *
 * Un file con due record allo stesso id è manomesso o mal concatenato; scrivere il secondo
 * sopra il primo perderebbe dati senza dirlo, e questa è la stessa scelta di `readExpense`
 * sui campi che non capisce — si tiene ciò che si è capito e si segnala il resto.
 */
function claimId(
  seen: Set<string>,
  kind: ImportKind,
  raw: unknown,
  skipped: ImportSkip[],
): string | null {
  const id = nonEmptyStr(raw);
  if (id === null) {
    skipped.push({ kind, id: '(senza id)', reason: 'manca l’identificatore' });
    return null;
  }
  if (seen.has(id)) {
    skipped.push({ kind, id, reason: 'identificatore ripetuto nel file' });
    return null;
  }
  seen.add(id);
  return id;
}

function readMembers(rows: Record<string, unknown>[], skipped: ImportSkip[]): Member[] {
  const seen = new Set<string>();
  const out: Member[] = [];

  for (const row of rows) {
    const id = claimId(seen, 'member', row.id, skipped);
    if (id === null) continue;

    // Il nome è l'unica cosa che rende un membro riconoscibile: senza, la lista Persone
    // mostrerebbe una riga vuota e ogni saldo parlerebbe di qualcuno che non si sa chi sia.
    const name = nonEmptyStr(row.name);
    if (name === null) {
      skipped.push({ kind: 'member', id, reason: 'manca il nome' });
      continue;
    }

    out.push({ id, name, color: str(row.color, '#888888') });
  }

  return out;
}

function readCategories(rows: Record<string, unknown>[], skipped: ImportSkip[]): Category[] {
  const seen = new Set<string>();
  const out: Category[] = [];

  for (const row of rows) {
    const id = claimId(seen, 'category', row.id, skipped);
    if (id === null) continue;

    const name = nonEmptyStr(row.name);
    if (name === null) {
      skipped.push({ kind: 'category', id, reason: 'manca il nome' });
      continue;
    }

    out.push({
      id,
      name,
      // Gli stessi default di `readCategory`: una categoria senza icona o senza colore è
      // utilizzabile, e rifiutarla perderebbe tutte le spese che la riferiscono.
      icon: str(row.icon, '📦'),
      color: str(row.color, '#888888'),
      archived: bool(row.archived),
    });
  }

  return out;
}

/**
 * Le spese, con le due verifiche che non si possono rimandare.
 *
 * - **Le quote devono sommare all'importo.** È l'invariante che `assertSplitBalances`
 *   protegge in scrittura, e l'unica che, violata, produce un numero sbagliato invece di
 *   una riga strana: i saldi di tutto il gruppo diventano falsi e non c'è modo di risalire
 *   alla spesa che li ha rotti.
 * - **I riferimenti ai membri devono esistere nel file.** Una spesa pagata da un id che
 *   non è nella lista Persone è una spesa pagata da nessuno: comparirebbe nei totali e
 *   sparirebbe dai saldi, che è il modo peggiore di sbagliare — visibile in un posto e non
 *   nell'altro. È lo stesso difetto dei membri duplicati dello Step 11, con un'altra
 *   origine.
 *
 * La categoria invece **non** è obbligatoria e un riferimento morto non fa scartare la
 * spesa: `categoryId` è già nullabile nel modello, e una spesa senza categoria è una spesa
 * valida. Si azzera il riferimento e si segnala.
 */
function readExpenses(
  rows: Record<string, unknown>[],
  memberIds: ReadonlySet<string>,
  categoryIds: ReadonlySet<string>,
  skipped: ImportSkip[],
): Expense[] {
  const seen = new Set<string>();
  const out: Expense[] = [];

  for (const row of rows) {
    const id = claimId(seen, 'expense', row.id, skipped);
    if (id === null) continue;

    const amountCents = cents(row.amountCents);
    if (amountCents === null) {
      skipped.push({ kind: 'expense', id, reason: 'importo non intero in centesimi' });
      continue;
    }
    if (amountCents < 0) {
      skipped.push({ kind: 'expense', id, reason: 'importo negativo' });
      continue;
    }

    const paidBy = nonEmptyStr(row.paidBy);
    if (paidBy === null) {
      skipped.push({ kind: 'expense', id, reason: 'non dice chi ha pagato' });
      continue;
    }
    if (!memberIds.has(paidBy)) {
      skipped.push({ kind: 'expense', id, reason: 'pagata da una persona che non è nel file' });
      continue;
    }

    const date = nonEmptyStr(row.date);
    if (date === null) {
      skipped.push({ kind: 'expense', id, reason: 'manca la data' });
      continue;
    }

    const split = readSplit(row.split, amountCents, memberIds);
    if (typeof split === 'string') {
      skipped.push({ kind: 'expense', id, reason: split });
      continue;
    }

    const rawCategory = nullableStr(row.categoryId);
    const categoryId = rawCategory !== null && categoryIds.has(rawCategory) ? rawCategory : null;
    if (rawCategory !== null && categoryId === null) {
      skipped.push({
        kind: 'expense',
        id,
        reason: 'categoria non presente nel file: la spesa entra senza categoria',
      });
    }

    // `createdAt`/`updatedAt` mancanti non fanno scartare: sono metadati d'ordinamento, e
    // `listExpenses` li usa solo per rompere la parità con la data. Si ripiega sulla data,
    // che c'è di sicuro — una stringa vuota manderebbe la spesa in fondo a ogni elenco.
    const createdAt = str(row.createdAt) || date;

    out.push({
      id,
      amountCents,
      currency: str(row.currency, 'EUR'),
      date,
      categoryId,
      note: str(row.note),
      // Assenti nei file v1, e i fallback sono gli stessi di `readExpense`: è la stessa
      // additività dello Step 23 vista dal lato della lettura.
      store: str(row.store),
      tags: strArray(row.tags),
      paidBy,
      split,
      createdAt,
      updatedAt: str(row.updatedAt) || createdAt,
      // **Il tombstone si conserva.** Perderlo farebbe ricomparire, dentro il gruppo nuovo,
      // spese che qualcuno aveva cancellato di proposito — ed è esattamente la ragione per
      // cui `snapshot()` le include nell'export.
      deletedAt: nullableStr(row.deletedAt),
    });
  }

  return out;
}

/**
 * Lo split, o la frase che dice perché non va bene.
 *
 * Restituisce una stringa invece di sollevare: chi chiama la mette nel report e passa alla
 * spesa dopo, che è il comportamento giusto per un file in cui una riga sola è rotta.
 */
function readSplit(
  raw: unknown,
  amountCents: Cents,
  memberIds: ReadonlySet<string>,
): ExpenseSplit | string {
  const split = record(raw);
  if (split === null) return 'la divisione non è leggibile';
  if (!isSplitMode(split.mode)) return 'modalità di divisione sconosciuta';

  const shares = record(split.shares);
  if (shares === null) return 'le quote non sono leggibili';

  const clean: Record<string, Cents> = {};
  let sum = 0;
  for (const [memberId, value] of Object.entries(shares)) {
    if (!memberIds.has(memberId)) return 'una quota è intestata a una persona che non è nel file';
    const share = cents(value);
    if (share === null) return 'una quota non è un intero in centesimi';
    clean[memberId] = share;
    sum += share;
  }

  if (Object.keys(clean).length === 0) return 'la divisione non ha quote';
  if (sum !== amountCents) {
    return `le quote sommano a ${sum} invece di ${amountCents} centesimi`;
  }

  return { mode: split.mode, shares: clean };
}

/**
 * I budget, che sono l'unico record senza un id proprio.
 *
 * La chiave è `<categoryId>:<YYYY-MM>` e i due pezzi vanno verificati entrambi: un mese
 * malformato produce una riga che `readBudget` scarterebbe a ogni lettura — invisibile
 * nell'app e presente nel documento, cioè un peso che si sincronizza senza servire a nulla.
 *
 * **La categoria deve esistere**, e qui il criterio è più severo che per le spese: una
 * spesa senza categoria resta una spesa, un budget senza categoria non è niente. Non
 * comparirebbe in nessuna schermata e non potrebbe essere cancellato.
 */
function readBudgets(
  rows: Record<string, unknown>[],
  categoryIds: ReadonlySet<string>,
  skipped: ImportSkip[],
): Budget[] {
  const seen = new Set<string>();
  const out: Budget[] = [];

  for (const row of rows) {
    const categoryId = nonEmptyStr(row.categoryId);
    const month = nonEmptyStr(row.month);
    const label = `${categoryId ?? '?'}:${month ?? '?'}`;

    if (categoryId === null || month === null) {
      skipped.push({ kind: 'budget', id: label, reason: 'categoria o mese mancanti' });
      continue;
    }
    if (!MONTH_PATTERN.test(month)) {
      skipped.push({ kind: 'budget', id: label, reason: 'mese non in formato AAAA-MM' });
      continue;
    }
    if (!categoryIds.has(categoryId)) {
      skipped.push({ kind: 'budget', id: label, reason: 'categoria non presente nel file' });
      continue;
    }
    if (seen.has(label)) {
      skipped.push({ kind: 'budget', id: label, reason: 'budget ripetuto nel file' });
      continue;
    }

    const limitCents = cents(row.limitCents);
    if (limitCents === null || limitCents < 0) {
      skipped.push({ kind: 'budget', id: label, reason: 'limite non valido' });
      continue;
    }

    seen.add(label);
    out.push({ categoryId, month, limitCents });
  }

  return out;
}

/**
 * I pareggi, con le stesse due regole di `addSettlement`.
 *
 * Importo positivo e due membri diversi: un pareggio da zero non salda niente e uno verso
 * sé stessi sposterebbe un saldo di zero facendolo comparire nello storico. Sono le
 * condizioni che lo store fa rispettare in scrittura, e un file non deve poterle aggirare
 * solo perché entra da un'altra porta.
 */
function readSettlements(
  rows: Record<string, unknown>[],
  memberIds: ReadonlySet<string>,
  skipped: ImportSkip[],
): Settlement[] {
  const seen = new Set<string>();
  const out: Settlement[] = [];

  for (const row of rows) {
    const id = claimId(seen, 'settlement', row.id, skipped);
    if (id === null) continue;

    const fromMember = nonEmptyStr(row.fromMember);
    const toMember = nonEmptyStr(row.toMember);
    if (fromMember === null || toMember === null) {
      skipped.push({ kind: 'settlement', id, reason: 'manca chi paga o chi riceve' });
      continue;
    }
    if (!memberIds.has(fromMember) || !memberIds.has(toMember)) {
      skipped.push({ kind: 'settlement', id, reason: 'riguarda una persona che non è nel file' });
      continue;
    }
    if (fromMember === toMember) {
      skipped.push({ kind: 'settlement', id, reason: 'stessa persona da entrambe le parti' });
      continue;
    }

    const amountCents = cents(row.amountCents);
    if (amountCents === null || amountCents <= 0) {
      skipped.push({ kind: 'settlement', id, reason: 'importo non valido' });
      continue;
    }

    const date = nonEmptyStr(row.date);
    if (date === null) {
      skipped.push({ kind: 'settlement', id, reason: 'manca la data' });
      continue;
    }

    out.push({
      id,
      fromMember,
      toMember,
      amountCents,
      date,
      note: str(row.note),
      createdAt: str(row.createdAt) || date,
      deletedAt: nullableStr(row.deletedAt),
    });
  }

  return out;
}

/** Quanti record entrerebbero in tutto: serve a dire «non c'è niente da importare». */
export function totalKept(counts: ImportCounts): number {
  return counts.expenses + counts.categories + counts.members + counts.budgets + counts.settlements;
}
