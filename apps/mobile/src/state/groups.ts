import * as Y from 'yjs';
import {
  assertVaultKey,
  bytesToHex,
  deriveVaultKeys,
  generateVaultKey,
  hexToBytes,
  RelayClient,
  SqliteYPersistence,
  type HttpClient,
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

/**
 * Ciò che il registro sa fare **sul relay**, ridotto al minimo.
 *
 * Un'interfaccia invece del `RelayClient` diretto per una ragione pratica: i test del
 * registro girano su SQLite vero ma senza rete, e devono poter osservare che la
 * cancellazione remota sia stata chiesta — e con quali chiavi — senza inventarsi un
 * server finto.
 */
export interface RelayGateway {
  deleteVault(keys: VaultKeys): Promise<void>;
}

/** Il gateway vero: un `RelayClient` costruito sulle chiavi del gruppo da cancellare. */
export function httpRelayGateway(
  baseUrl: string,
  http: HttpClient,
  random: RandomSource,
): RelayGateway {
  return {
    deleteVault: (keys) => new RelayClient(baseUrl, keys, http, random).deleteVault(),
  };
}

export interface GroupRegistryDeps {
  db: SqliteDatabase;
  keyStore: SecureKeyStore;
  random: RandomSource;
  /** Assente nei test di sola logica locale: senza, `forget` rifiuta `wipeRelay`. */
  relay?: RelayGateway;
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
  private readonly relay: RelayGateway | null;
  private readonly now: () => Date;

  private constructor(deps: GroupRegistryDeps) {
    this.db = deps.db;
    this.keyStore = deps.keyStore;
    this.random = deps.random;
    this.relay = deps.relay ?? null;
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
   * telefono — chi chiama deve aver chiesto conferma. Chi ha ancora la chiave continua a
   * leggere: la revoca non esiste in un sistema dove la chiave *è* il diritto di accesso.
   *
   * Con `wipeRelay` si cancella prima anche la copia sul relay. **In quest'ordine**: la
   * richiesta va autenticata con il token derivato dalla chiave, e la chiave sta per
   * essere cancellata da questo telefono. Se la rete non risponde non si tocca nulla di
   * locale — meglio un gruppo ancora in elenco, da cui riprovare a uscire, che un vault
   * orfano sul relay senza più nessuno che possieda la chiave per cancellarlo.
   */
  async forget(vaultId: string, { wipeRelay = false } = {}): Promise<void> {
    if (wipeRelay) {
      if (this.relay === null) {
        throw new Error('cancellazione dal relay non disponibile: nessun gateway configurato');
      }
      const keys = await this.keys(vaultId);
      if (keys === null) {
        throw new Error(
          'La chiave di questo gruppo non è leggibile: senza, il relay non accetta la ' +
            'cancellazione. Si può comunque uscire lasciando la copia sul relay, che scade da sé.',
        );
      }
      await this.relay.deleteVault(keys);
    }

    await this.keyStore.delete(groupKeyStorageKey(vaultId));
    await SqliteSyncStore.forget(this.db, vaultId);
    await this.db.execute(`DROP TABLE IF EXISTS ${updatesTableName(vaultId)}`);
    await this.db.execute('DELETE FROM groups WHERE vault_id = ?', [vaultId]);
  }

  /**
   * Ricrea il gruppo con una chiave nuova, portandosi dietro tutta la sua storia.
   *
   * È l'unica forma di esclusione possibile. Cancellare il vault dal relay non toglie a
   * nessuno ciò che ha già scaricato, e il `vaultId` torna perfino disponibile a chi
   * conserva la chiave: l'unico modo di lasciare qualcuno fuori è spostare il gruppo su
   * una chiave che quel qualcuno non ha, e reinvitare chi resta.
   *
   * **I membri restano tutti**, escluso compreso. Non è una dimenticanza: le spese
   * puntano ai membri con `paidBy` e con le quote, e togliere una persona dall'elenco
   * cambierebbe i saldi già calcolati — che è esattamente ciò che il gruppo non deve
   * fare. Chi è stato escluso resta nella storia; semplicemente non riceve più nulla.
   *
   * Il gruppo vecchio **non** viene toccato qui: uscirne è una decisione a parte, e
   * separarla significa che un'interruzione fra le due lascia due gruppi leggibili
   * invece di nessuno.
   */
  async regenerate(vaultId: string, state: Uint8Array, name?: string): Promise<GroupRecord> {
    const source = await this.get(vaultId);
    if (source === null) throw new Error('gruppo da rigenerare non trovato nel registro');

    const fresh = await this.register(
      generateVaultKey(this.random),
      name ?? source.name,
      // `created`: la chiave nasce qui, e nel gruppo nuovo si è per definizione
      // quello che l'ha creato. Il seed delle categorie che ne discende è comunque
      // inerte — il documento copiato le contiene già.
      'created',
    );

    // Il ricollegamento va portato dietro: lo stato copiato conserva gli id dei membri,
    // quindi chi in questo gruppo non era il proprio `profileId` — un ripristino da
    // backup — tornerebbe a esserlo, e comparirebbe due volte accanto a sé stesso.
    if (source.myMemberId !== null) {
      await this.setMyMemberId(fresh.vaultId, source.myMemberId);
    }

    await this.seedDocument(fresh.vaultId, state);

    return { ...fresh, myMemberId: source.myMemberId };
  }

  /**
   * Crea un gruppo nuovo che nasce **già pieno**, da uno stato Yjs costruito altrove.
   *
   * È la porta d'ingresso dell'import di un export JSON, e la differenza con `regenerate`
   * è tutta in ciò che non c'è: là si continua la storia di un gruppo esistente, qui non
   * c'è alcun gruppo di partenza — il file non porta con sé una chiave, e non potrebbe,
   * perché l'export JSON è in chiaro. Vedi il commento in cima a `export/json.ts`.
   *
   * **La chiave è nuova, quindi il vault è un altro**, e va detto a chi importa invece di
   * lasciarglielo scoprire: il gruppo ricostruito non si riaggancia a quello da cui il file
   * proveniva, non riceverà gli aggiornamenti degli altri telefoni, e per tornare a
   * condividerlo serve un invito nuovo. Un file in chiaro **non deve** poter riaprire un
   * vault: se bastasse a rientrare, chiunque lo riceva entrerebbe nel gruppo.
   *
   * `origin` resta `created`, ed è esatto in entrambi i sensi che contano: la chiave nasce
   * qui, e il seme delle categorie di default è comunque inerte perché il documento le
   * contiene già — se l'export ne aveva.
   */
  async createFromState(name: string, state: Uint8Array): Promise<GroupRecord> {
    const fresh = await this.register(generateVaultKey(this.random), name, 'created');
    await this.seedDocument(fresh.vaultId, state);
    return fresh;
  }

  /**
   * Scrive uno stato Yjs nel log di un gruppo appena registrato.
   *
   * `load()` crea la tabella (vuota) e si mette in ascolto: l'update applicato dopo viene
   * scritto come qualunque altro. `destroy()` attende che sia davvero su disco, prima che
   * qualcuno apra il gruppo nuovo e lo trovi ancora senza dati.
   */
  private async seedDocument(vaultId: string, state: Uint8Array): Promise<void> {
    const doc = new Y.Doc();
    const persistence = new SqliteYPersistence(this.db, doc, {
      tableName: updatesTableName(vaultId),
    });
    await persistence.load();
    Y.applyUpdate(doc, state);
    await persistence.destroy();
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
