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
