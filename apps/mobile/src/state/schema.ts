import type { SecureKeyStore, SqliteDatabase } from '@jutrack/core';
import type { KeyValueStore } from '@/platform/app-meta';
import { LEGACY_VAULT_KEY_STORAGE_KEY } from '@/platform/key-names';

/**
 * Ripartenza pulita, invece di una migrazione.
 *
 * Prima dei gruppi c'era un vault solo: uno slot fisso in SecureStore, una tabella
 * `y_updates` senza suffisso, tabelle di sync senza colonna `vault_id`. Portare quei dati
 * nel nuovo schema avrebbe richiesto di riscrivere `paidBy` e le quote di ogni spesa per
 * fondere i membri duplicati dallo Step 11 — la parte più rischiosa dell'intero piano, e
 * quella dove un errore si nota tardi e sui numeri.
 *
 * I dati sui due telefoni sono dati di prova, quindi si riparte. È una scelta dichiarata
 * in `docs/piano-v2-profili-gruppi-sync.md`, non una svista.
 *
 * L'operazione è idempotente: al secondo avvio `schema_version` è già quella corrente e
 * non succede nulla. Su un'installazione nuova non c'è niente da cancellare, e la versione
 * viene solo registrata.
 *
 * **Il vecchio vault sul relay non viene toccato.** Per cancellarlo servirebbe la chiave
 * che stiamo eliminando, e farlo all'avvio significherebbe una richiesta di rete che può
 * fallire proprio mentre l'app sta partendo. Scade da solo col TTL di 30 giorni, e nel
 * frattempo nessuno ha più la chiave per leggerlo.
 */

const SCHEMA_VERSION_KEY = 'schema_version';

/** 1 = uno slot e un vault. 2 = registro dei gruppi, tabelle per vault. */
const CURRENT_SCHEMA_VERSION = 2;

/** Le tabelle dello schema a vault unico. Quelle nuove portano tutte il `vault_id`. */
const LEGACY_TABLES = ['y_updates', 'sync_state', 'sync_pending', 'sync_meta'];

/** Le chiavi di `app_meta` legate al vault unico, ormai senza un gruppo che le riferisca. */
const LEGACY_META_PREFIXES = ['vault_origin:', 'my_member_id:'];

export interface SchemaResetOutcome {
  /** `true` se c'era davvero uno schema vecchio da eliminare. */
  wiped: boolean;
}

/**
 * Porta il database allo schema corrente, azzerando quello precedente se lo trova.
 *
 * Da chiamare **prima** di aprire qualunque gruppo: le tabelle di sync vengono ricreate
 * con la colonna `vault_id` da `SqliteSyncStore.open`, e trovarle nella forma vecchia
 * darebbe errori di colonna mancante su ogni scrittura.
 *
 * Il profilo **sopravvive**: `profileId`, nome e colore non hanno nulla a che vedere con
 * lo schema del vault, e cancellarli costringerebbe a rifare l'onboarding per nulla.
 */
export async function ensureSchema(
  db: SqliteDatabase,
  meta: KeyValueStore,
  keyStore: SecureKeyStore,
): Promise<SchemaResetOutcome> {
  const stored = await meta.get(SCHEMA_VERSION_KEY);
  const version = stored === null ? null : Number(stored);

  if (version === CURRENT_SCHEMA_VERSION) return { wiped: false };

  // Nessuna versione registrata significa una di due cose: installazione nuova, oppure
  // schema 1, che non scriveva alcuna versione. Si distinguono guardando se esiste una
  // tabella del vecchio schema — un'installazione nuova non ne ha nessuna.
  const wiped = await hasLegacyTables(db);

  if (wiped) {
    for (const table of LEGACY_TABLES) {
      await db.execute(`DROP TABLE IF EXISTS ${table}`);
    }
    await keyStore.delete(LEGACY_VAULT_KEY_STORAGE_KEY);
    await deleteLegacyMeta(db);
  }

  await meta.set(SCHEMA_VERSION_KEY, String(CURRENT_SCHEMA_VERSION));
  return { wiped };
}

async function hasLegacyTables(db: SqliteDatabase): Promise<boolean> {
  const placeholders = LEGACY_TABLES.map(() => '?').join(', ');
  const rows = await db.query<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${placeholders})`,
    LEGACY_TABLES,
  );
  return rows.length > 0;
}

/**
 * Via le chiavi di `app_meta` riferite al vault unico.
 *
 * Restare non farebbe danni — nessuno le legge più — ma un `my_member_id:<vecchioVaultId>`
 * dimenticato è esattamente il tipo di residuo che, il giorno in cui si scrive una query
 * per prefisso, torna a dire qualcosa di sbagliato su un gruppo che non esiste.
 */
async function deleteLegacyMeta(db: SqliteDatabase): Promise<void> {
  for (const prefix of LEGACY_META_PREFIXES) {
    await db.execute("DELETE FROM app_meta WHERE key LIKE ? ESCAPE '\\'", [`${prefix}%`]);
  }
}
