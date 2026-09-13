import type { Cents } from './money';

/** Data civile in formato `YYYY-MM-DD`. Senza ora né fuso orario. */
export type IsoDate = string;

/** Istante in formato ISO 8601 UTC. */
export type IsoTimestamp = string;

/** Mese in formato `YYYY-MM`. */
export type IsoMonth = string;

export type SplitMode =
  /** Diviso in parti uguali fra tutti i partecipanti. */
  | 'equal'
  /** Diviso secondo quote esplicite. */
  | 'custom'
  /** Interamente a carico di una sola persona. */
  | 'single';

/**
 * Suddivisione di una spesa fra i membri.
 *
 * `shares` associa a ciascun membro quanto **deve**, in centesimi. L'invariante è che la
 * somma delle quote sia esattamente `amountCents`: viene verificata in scrittura, perché
 * uno split che non torna produce saldi sbagliati difficili da rintracciare a posteriori.
 */
export interface ExpenseSplit {
  mode: SplitMode;
  shares: Record<string, Cents>;
}

export interface Expense {
  id: string;
  /** Importo totale in centesimi. Sempre positivo per una spesa. */
  amountCents: Cents;
  currency: string;
  date: IsoDate;
  /** `null` se non categorizzata. */
  categoryId: string | null;
  note: string;
  /** Dove è stata fatta. Stringa vuota se non è stato detto. */
  store: string;
  /**
   * Etichette libere, normalizzate in scrittura. Array vuoto se nessuna.
   *
   * Sono un campo della spesa e non un'entità con un id: il vocabolario si deriva in
   * lettura da chi le usa (`insights/naming.ts`), così un tag esiste finché esiste una
   * spesa che lo nomina e sparisce da solo quando non ne resta nessuna. Il prezzo è che
   * non si può rinominarne uno in tutte le spese insieme.
   */
  tags: string[];
  /** Membro che ha materialmente pagato. */
  paidBy: string;
  split: ExpenseSplit;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  /** Tombstone: valorizzato quando la spesa è cancellata. Vedi docs/architecture.md. */
  deletedAt: IsoTimestamp | null;
}

export interface Category {
  id: string;
  name: string;
  /** Emoji mostrata nella lista. */
  icon: string;
  /** Colore esadecimale usato nei grafici. */
  color: string;
  /** Archiviata: non più proponibile, ma le spese passate restano valide. */
  archived: boolean;
}

/** Le due famiglie del vocabolario di un gruppo. */
export type VocabularyKind = 'tag' | 'store';

/** Tutte le famiglie, per chi deve percorrerle senza dimenticarne una (`snapshot`). */
export const VOCABULARY_KINDS: readonly VocabularyKind[] = ['tag', 'store'];

/**
 * Una voce proponibile per il negozio o per i tag di una spesa.
 *
 * **Non è un'entità che le spese riferiscono.** `Expense.store` e `Expense.tags` restano
 * testo: questo è un elenco di ciò che conviene *proporre*, non di ciò che esiste. La
 * conseguenza che serve: togliere una voce non rende orfana nessuna spesa, perché la spesa
 * si porta dietro la parola. È la differenza con `Category`, che infatti si archivia e non
 * si cancella mai.
 *
 * **L'identità è la chiave, derivata dal nome** con `tagKey`/`storeKey`, e non un id
 * casuale come per le altre entità. Due telefoni che aggiungono «Vacanza» separatamente
 * convergono così su una voce sola invece di produrne due indistinguibili; e la voce di
 * catalogo e la barra dei grafici sono la stessa identità per costruzione, perché è su
 * quella chiave che i grafici già raggruppano.
 *
 * Il prezzo, accettato: **una voce non si rinomina.** Cambiare il nome cambierebbe la
 * chiave, e le spese già registrate continuerebbero comunque a portare la parola vecchia —
 * è il limite già dichiarato per i tag. Si toglie e si riaggiunge.
 */
export interface VocabularyEntry {
  kind: VocabularyKind;
  /** Forma canonica su cui due grafie della stessa cosa si riconoscono uguali. */
  key: string;
  /** La grafia da mostrare: quella scelta la prima volta che la voce è entrata. */
  name: string;
  /** Tombstone: valorizzato quando la voce è tolta dall'elenco. */
  deletedAt: IsoTimestamp | null;
}

export interface Member {
  id: string;
  name: string;
  color: string;
}

export interface Budget {
  categoryId: string;
  month: IsoMonth;
  limitCents: Cents;
}

/**
 * Fotografia completa del contenuto di un vault.
 *
 * Vive qui e non in `export/` perché è `VaultStore.snapshot()` a produrla: se stesse nel
 * modulo d'export, il modello dipenderebbe dall'export invece del contrario. Le funzioni
 * di `export/` la consumano e restano pure — testabili senza costruire un `Y.Doc`.
 */
export interface VaultSnapshot {
  expenses: Expense[];
  categories: Category[];
  members: Member[];
  budgets: Budget[];
  settlements: Settlement[];
  /** Il vocabolario del gruppo, tombstone compresi. Assente nei file d'export fino alla v2. */
  vocabulary: VocabularyEntry[];
}

/** Pareggio: un membro salda il proprio debito verso un altro. */
export interface Settlement {
  id: string;
  fromMember: string;
  toMember: string;
  amountCents: Cents;
  date: IsoDate;
  note: string;
  createdAt: IsoTimestamp;
  deletedAt: IsoTimestamp | null;
}
