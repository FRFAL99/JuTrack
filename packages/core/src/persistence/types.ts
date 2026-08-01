/**
 * Interfaccia minima verso un database SQLite.
 *
 * Volutamente ridotta all'osso: è tutto ciò che serve alla persistenza, e mantenerla
 * piccola rende banale implementarla sia con `expo-sqlite` sul telefono sia in memoria
 * nei test. Il core non conosce nessuna delle due.
 */
export interface SqliteDatabase {
  /** Esegue un'istruzione senza risultato (DDL, INSERT, DELETE). */
  execute(sql: string, params?: readonly SqlValue[]): Promise<void>;
  /** Esegue una query e restituisce le righe. */
  query<T = Record<string, SqlValue>>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
}

export type SqlValue = string | number | null | Uint8Array;
