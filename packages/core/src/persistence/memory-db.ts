import type { SqlValue, SqliteDatabase } from './types';

/**
 * `SqliteDatabase` in memoria per i test.
 *
 * Non è un motore SQL: riconosce solo le poche istruzioni usate da `SqliteYPersistence`.
 * L'alternativa sarebbe stata una dipendenza da un SQLite reale nei test, che avrebbe
 * rallentato la suite senza aggiungere garanzie — la correttezza dello schema si verifica
 * comunque sul dispositivo.
 *
 * Se `SqliteYPersistence` inizierà a usare SQL diverso, qui fallirà rumorosamente invece
 * di restituire risultati silenziosamente sbagliati.
 */
export class MemoryDatabase implements SqliteDatabase {
  private rows: { seq: number; data: Uint8Array }[] = [];
  private nextSeq = 1;

  /** Conteggio delle istruzioni eseguite, per verificare nei test che si compatti. */
  executeCount = 0;

  async execute(sql: string, params: readonly SqlValue[] = []): Promise<void> {
    this.executeCount++;
    const normalized = sql.trim().replace(/\s+/g, ' ');

    if (/^CREATE TABLE IF NOT EXISTS/i.test(normalized)) return;

    if (/^INSERT INTO \w+ \(data\) VALUES \(\?\)$/i.test(normalized)) {
      const blob = params[0];
      if (!(blob instanceof Uint8Array)) {
        throw new Error('INSERT richiede un Uint8Array come parametro');
      }
      this.rows.push({ seq: this.nextSeq++, data: blob });
      return;
    }

    if (/^DELETE FROM \w+ WHERE seq < \(SELECT MAX\(seq\) FROM \w+\)$/i.test(normalized)) {
      const max = this.rows.reduce((m, r) => Math.max(m, r.seq), 0);
      this.rows = this.rows.filter((r) => r.seq >= max);
      return;
    }

    if (/^DELETE FROM \w+$/i.test(normalized)) {
      this.rows = [];
      return;
    }

    throw new Error(`MemoryDatabase: istruzione non riconosciuta: ${normalized}`);
  }

  async query<T>(sql: string): Promise<T[]> {
    const normalized = sql.trim().replace(/\s+/g, ' ');

    if (/^SELECT data FROM \w+ ORDER BY seq ASC$/i.test(normalized)) {
      return this.rows
        .slice()
        .sort((a, b) => a.seq - b.seq)
        .map((r) => ({ data: r.data })) as T[];
    }

    if (/^SELECT COUNT\(\*\) AS n FROM \w+$/i.test(normalized)) {
      return [{ n: this.rows.length }] as T[];
    }

    throw new Error(`MemoryDatabase: query non riconosciuta: ${normalized}`);
  }

  /** Numero di righe attualmente memorizzate. */
  get rowCount(): number {
    return this.rows.length;
  }

  /** Copia dei blob memorizzati, per ispezione nei test. */
  snapshotRows(): Uint8Array[] {
    return this.rows.map((r) => r.data);
  }
}
