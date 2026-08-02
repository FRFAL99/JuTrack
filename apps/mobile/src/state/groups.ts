import {
  assertVaultKey,
  bytesToHex,
  deriveVaultKeys,
  generateVaultKey,
  hexToBytes,
  type RandomSource,
  type SecureKeyStore,
  type SqliteDatabase,
  type VaultKeys,
} from '@jutrack/core';
// Import puntuali e non dal barrel `@/platform`: quello espone anche il keystore e il
// database, che importano moduli nativi. Il registro è logica pura, e deve poter girare
// nei test senza trascinarsi dietro React Native.
import { groupKeyStorageKey } from '@/platform/key-names';
import { SqliteSyncStore } from '@/platform/sync-store';
import type { VaultOrigin } from './profile';

/**
 * Il registro dei gruppi di questo telefono.
 *
 * Un gruppo è **un vault**: una `vaultKey`, un `vaultId`, un Durable Object, un documento
 * Yjs. Fino allo Step 11 ce n'era uno solo, cablato in uno slot fisso di SecureStore e in
 * tabelle senza colonna vault; entrare in un vault significava uscire dal precedente.
 *
 * Qui i gruppi diventano un elenco: una chiave per gruppo in SecureStore, una riga per
 * gruppo in SQLite, e un `vaultId` che accompagna ogni tabella di sync e di persistenza.
 *
 * **Il nome nella riga è una copia.** L'autorevole sta dentro il vault
 * (`VaultStore.getGroupName`), così rinominare un gruppo raggiunge l'altro telefono come
 * qualunque altra modifica. La copia esiste per un motivo pratico: disegnare la lista dei
 * gruppi senza aprire e ricostruire ogni documento Yjs. All'apertura, se le due divergono,
 * è la copia ad aggiornarsi.
 */
export interface GroupRecord {
  vaultId: string;
  /** Copia locale del nome. L'autorevole è dentro il vault. */
  name: string;
  /**
   * Nato qui o entrati in quello di qualcun altro.
   *
   * Registrato al momento in cui la chiave viene creata o adottata, mai dopo: guardando
   * un documento pieno di dati sincronizzati i due casi sono indistinguibili. Decide una
   * cosa sola, ma che si vede: chi entra **non semina** le categorie di default.
   */
  origin: VaultOrigin;
  /**
   * Il membro che rappresenta me in questo gruppo. Di norma è il `profileId`.
   *
   * Diverso solo dopo un ricollegamento: chi ripristina il backup della chiave su un
   * telefono nuovo ha un `profileId` nuovo, e senza questa colonna comparirebbe come una
   * seconda persona accanto a sé stesso — il bug dei membri duplicati, di ritorno.
   */
  myMemberId: string | null;
  createdAt: string;
  /** `null` finché non lo si è mai aperto. Ordina la lista. */
  lastOpenedAt: string | null;
}

interface GroupRow {
  vault_id: string;
  name: string;
  origin: string;
  my_member_id: string | null;
  created_at: string;
  last_opened_at: string | null;
}

export interface GroupRegistryDeps {
  db: SqliteDatabase;
  keyStore: SecureKeyStore;
  random: RandomSource;
  /** Iniettabile per rendere i test deterministici. */
  now?: () => Date;
}

/** Limite del nome di un gruppo: sta in una riga di lista anche sui telefoni stretti. */
export const MAX_GROUP_NAME = 32;

/** Nome del primo gruppo, creato da solo subito dopo l'onboarding del profilo. */
export const FIRST_GROUP_NAME = 'Le mie spese';

/** Toglie gli spazi di troppo e taglia; `null` se non resta nulla di utile. */
export function normalizeGroupName(raw: string): string | null {
  const collapsed = raw.trim().replace(/\s+/g, ' ');
  if (collapsed === '') return null;
  return collapsed.slice(0, MAX_GROUP_NAME);
}

export class GroupRegistry {
  private readonly db: SqliteDatabase;
  private readonly keyStore: SecureKeyStore;
  private readonly random: RandomSource;
  private readonly now: () => Date;

  private constructor(deps: GroupRegistryDeps) {
    this.db = deps.db;
    this.keyStore = deps.keyStore;
    this.random = deps.random;
    this.now = deps.now ?? (() => new Date());
  }

  static async open(deps: GroupRegistryDeps): Promise<GroupRegistry> {
    await deps.db.execute(
      `CREATE TABLE IF NOT EXISTS groups (
         vault_id TEXT PRIMARY KEY,
         name TEXT NOT NULL,
         origin TEXT NOT NULL,
         my_member_id TEXT,
         created_at TEXT NOT NULL,
         last_opened_at TEXT
       )`,
    );
    return new GroupRegistry(deps);
  }

  /** I gruppi, dall'ultimo aperto. Chi non è mai stato aperto va in fondo, per data. */
  async list(): Promise<GroupRecord[]> {
    const rows = await this.db.query<GroupRow>(
      `SELECT * FROM groups
         ORDER BY last_opened_at IS NULL, last_opened_at DESC, created_at DESC`,
    );
    return rows.map(toRecord);
  }

  async get(vaultId: string): Promise<GroupRecord | null> {
    const rows = await this.db.query<GroupRow>('SELECT * FROM groups WHERE vault_id = ?', [
      vaultId,
    ]);
    const row = rows[0];
    return row === undefined ? null : toRecord(row);
  }

  /**
   * Crea un gruppo nuovo con una chiave nuova.
   *
   * Non serve rete: la chiave è 32 byte casuali e il `vaultId` si deriva da lei. Il relay
   * scopre il vault alla prima scrittura. Chi crea semina le categorie di default.
   */
  async create(name: string): Promise<GroupRecord> {
    const key = generateVaultKey(this.random);
    return this.register(key, name, 'created');
  }

  /**
   * Entra in un gruppo esistente adottandone la chiave.
   *
   * **Aggiunge**, non sostituisce: i gruppi che c'erano restano. Se il gruppo c'è già la
   * riga esistente viene restituita così com'è — rientrare in un gruppo di cui si fa già
   * parte non deve riscriverne l'origine, o chi l'ha creato si ritroverebbe `joined` e
   * smetterebbe di seminare le categorie in un documento ancora vuoto.
   */
  async join(key: Uint8Array, name: string): Promise<GroupRecord> {
    const { vaultId } = deriveVaultKeys(key);
    const existing = await this.get(vaultId);
    if (existing !== null) return existing;
    return this.register(key, name, 'joined');
  }

  private async register(key: Uint8Array, name: string, origin: VaultOrigin): Promise<GroupRecord> {
    const keys = deriveVaultKeys(key);
    const record: GroupRecord = {
      vaultId: keys.vaultId,
      name: normalizeGroupName(name) ?? FIRST_GROUP_NAME,
      origin,
      myMemberId: null,
      createdAt: this.now().toISOString(),
      lastOpenedAt: null,
    };

    // La chiave prima della riga. All'inverso, un'interruzione fra le due lascerebbe un
    // gruppo in elenco di cui non si possiede più la chiave: illeggibile e non
    // sincronizzabile, ma visibile. Una chiave senza riga è invece invisibile e innocua,
    // e viene sovrascritta dal tentativo successivo.
    await this.keyStore.set(groupKeyStorageKey(keys.vaultId), bytesToHex(key));
    await this.db.execute(
      `INSERT INTO groups (vault_id, name, origin, my_member_id, created_at, last_opened_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      [record.vaultId, record.name, record.origin, null, record.createdAt, null],
    );
    return record;
  }

  /** Aggiorna la copia locale del nome. Il nome dentro il vault lo scrive `VaultStore`. */
  async rename(vaultId: string, name: string): Promise<void> {
    await this.db.execute('UPDATE groups SET name = ? WHERE vault_id = ?', [name, vaultId]);
  }

  async setMyMemberId(vaultId: string, memberId: string): Promise<void> {
    await this.db.execute('UPDATE groups SET my_member_id = ? WHERE vault_id = ?', [
      memberId,
      vaultId,
    ]);
  }

  /** Segna il gruppo come aperto adesso: è ciò che ordina la lista. */
  async touch(vaultId: string): Promise<void> {
    await this.db.execute('UPDATE groups SET last_opened_at = ? WHERE vault_id = ?', [
      this.now().toISOString(),
      vaultId,
    ]);
  }

  /**
   * Esce da un gruppo: chiave, righe di sync, log del documento, riga di registro.
   *
   * Senza un backup della chiave i dati di quel gruppo diventano irrecuperabili da questo
   * telefono — chi chiama deve aver chiesto conferma. I dati sul relay restano, e chi ha
   * ancora la chiave continua a leggerli: la revoca non esiste in un sistema dove la
   * chiave *è* il diritto di accesso.
   */
  async forget(vaultId: string): Promise<void> {
    await this.keyStore.delete(groupKeyStorageKey(vaultId));
    await SqliteSyncStore.forget(this.db, vaultId);
    await this.db.execute(`DROP TABLE IF EXISTS ${updatesTableName(vaultId)}`);
    await this.db.execute('DELETE FROM groups WHERE vault_id = ?', [vaultId]);
  }

  /** Le chiavi d'uso di un gruppo, `null` se la chiave manca o è illeggibile. */
  async keys(vaultId: string): Promise<VaultKeys | null> {
    const key = await this.keyBytes(vaultId);
    return key === null ? null : deriveVaultKeys(key);
  }

  /**
   * La chiave radice così com'è, senza derivarla.
   *
   * Serve solo all'invito: è la radice, non le derivate, a dover finire nel QR o nel link.
   * Ovunque altrove si usa `keys`, che restituisce già le chiavi d'uso.
   */
  async keyBytes(vaultId: string): Promise<Uint8Array | null> {
    const hex = await this.keyStore.get(groupKeyStorageKey(vaultId));
    if (hex === null) return null;
    try {
      const key = hexToBytes(hex);
      // Una chiave illeggibile è peggio di nessuna chiave: proseguire produrrebbe un
      // `vaultId` sbagliato, cioè un vault vuoto dall'aria funzionante — e un invito
      // generato da lì porterebbe l'altro telefono in un vault che non esiste.
      assertVaultKey(key);
      return key;
    } catch {
      return null;
    }
  }
}

/**
 * La tabella di persistenza di un gruppo.
 *
 * Un documento Yjs per gruppo, quindi un log per gruppo: `SqliteYPersistence` accetta già
 * `tableName` proprio per questo. Il `vaultId` è 32 caratteri esadecimali derivati dalla
 * chiave, quindi è un identificatore SQL valido per costruzione — nessuna interpolazione
 * di testo scelto dall'utente finisce in un nome di tabella.
 */
export function updatesTableName(vaultId: string): string {
  return `y_updates_${vaultId}`;
}

function toRecord(row: GroupRow): GroupRecord {
  return {
    vaultId: row.vault_id,
    name: row.name,
    origin: row.origin === 'joined' ? 'joined' : 'created',
    myMemberId: row.my_member_id,
    createdAt: row.created_at,
    lastOpenedAt: row.last_opened_at,
  };
}
