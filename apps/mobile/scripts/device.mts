/**
 * Un telefono senza schermo.
 *
 * Monta **i moduli veri dell'app** — `ensureSchema`, il profilo, `GroupRegistry`,
 * `SqliteYPersistence`, `SqliteSyncStore`, `resolveMyMemberId`, `seedDefaults` — su
 * SQLite vero e contro il relay vero. Non reimplementa nulla di ciò che decide i numeri:
 * è la differenza fra provare l'app e provare una cosa che le somiglia.
 *
 * **Perché conta.** Dei due bug che rendevano sbagliati i saldi alla prima prova con due
 * telefoni, uno stava nel core (`SyncEngine.start`) e uno nell'**app**: il membro nasceva
 * da un id casuale per dispositivo invece che dal profilo. Un secondo dispositivo che si
 * scrivesse da sé la logica dei membri farebbe la cosa giusta mentre l'app fa quella
 * sbagliata, e direbbe verde. Questo no: chiama `resolveMyMemberId`, la funzione vera.
 *
 * Riproduce `ProfileProvider` + `GroupsProvider` + `VaultProvider` senza React. Quello
 * che resta fuori è solo ciò che è React o nativo: schermate, navigazione, deep link,
 * `Share`, fotocamera, e SecureStore — sostituito qui da un file con permessi a 600.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import * as Y from 'yjs';
import {
  RelayClient,
  SqliteYPersistence,
  SyncEngine,
  VaultStore,
  type HttpClient,
  type RandomSource,
  type SecureKeyStore,
  type SyncState,
  type VaultKeys,
} from '@jutrack/core';
import { randomBytes } from '@noble/ciphers/utils.js';
import { SqliteAppMeta, type KeyValueStore } from '@/platform/app-meta';
import { SqliteSyncStore } from '@/platform/sync-store';
import {
  GroupRegistry,
  httpRelayGateway,
  updatesTableName,
  type GroupRecord,
} from '@/state/groups';
import { resolveMyMemberId } from '@/state/membership';
import {
  createProfile,
  loadProfile,
  saveProfile,
  PROFILE_COLORS,
  type Profile,
} from '@/state/profile';
import { ensureSchema } from '@/state/schema';
import { seedDefaults } from '@/state/seed';
import { NodeSqliteDatabase } from '@/testing/sqlite';

export const RELAY_URL =
  process.env.JUTRACK_RELAY_URL ?? 'https://jutrack-relay.jutrack-relayfrfal.workers.dev';

export const random: RandomSource = { getRandomBytes: (n) => randomBytes(n) };

/**
 * `fetch` con il conteggio delle richieste e un interruttore «modalità aereo».
 *
 * Il conteggio è ciò che rende **osservabile** la scala di poll dello Step 16; l'aereo
 * è ciò che rende provabile l'`offlineRetryMs` dello Step 17 senza staccare la rete di
 * tutta la macchina. Fallisce come fallisce `fetch` senza connessione: un errore che non
 * è un `RelayError`, che è esattamente la distinzione su cui poggia lo Step 17.
 */
export class CountingHttp implements HttpClient {
  gets = 0;
  posts = 0;
  offline = false;
  /** Intervallo fra una richiesta e la precedente, in millisecondi. */
  readonly gaps: number[] = [];
  onRequest: ((method: string, gapMs: number) => void) | null = null;
  private lastAt = Date.now();

  async request(
    url: string,
    init: { method: 'GET' | 'POST' | 'DELETE'; headers: Record<string, string>; body?: string },
  ): Promise<{ status: number; text: () => Promise<string> }> {
    const now = Date.now();
    const gap = now - this.lastAt;
    this.lastAt = now;
    this.gaps.push(gap);
    this.onRequest?.(init.method, gap);

    if (this.offline) throw new Error('Network request failed');

    if (init.method === 'GET') this.gets++;
    if (init.method === 'POST') this.posts++;
    const response = await fetch(url, {
      method: init.method,
      headers: init.headers,
      ...(init.body === undefined ? {} : { body: init.body }),
    });
    return { status: response.status, text: () => response.text() };
  }
}

/**
 * SecureStore, sostituito da un file.
 *
 * È l'unica sostituzione che tocca materiale crittografico, ed è inevitabile: il Keystore
 * di sistema non esiste in Node. Le chiavi restano in chiaro, quindi questo strumento va
 * usato su gruppi di prova e basta.
 */
function fileKeyStore(path: string): SecureKeyStore {
  const read = (): Record<string, string> =>
    existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as Record<string, string>) : {};
  const write = (values: Record<string, string>): void => {
    writeFileSync(path, JSON.stringify(values, null, 2), { mode: 0o600 });
  };
  return {
    get: async (key) => read()[key] ?? null,
    set: async (key, value) => {
      const values = read();
      values[key] = value;
      write(values);
    },
    delete: async (key) => {
      const values = read();
      delete values[key];
      write(values);
    },
  };
}

/** Un gruppo aperto: è ciò che `VaultProvider` chiama `runtime`. */
export interface OpenGroup {
  record: GroupRecord;
  doc: Y.Doc;
  store: VaultStore;
  engine: SyncEngine;
  keys: VaultKeys;
  /** `null` se il gruppo è di qualcun altro e non si sa ancora chi sono io: vedi Step 12. */
  myMemberId: string | null;
  close(): Promise<void>;
}

export class HeadlessDevice {
  private constructor(
    readonly name: string,
    readonly db: NodeSqliteDatabase,
    readonly meta: KeyValueStore,
    readonly keyStore: SecureKeyStore,
    readonly registry: GroupRegistry,
    readonly profile: Profile,
    readonly http: CountingHttp,
  ) {}

  /**
   * Avvia il dispositivo, nell'ordine in cui lo fa l'app.
   *
   * `ensureSchema` **prima** di tutto — è la ripartenza pulita dello Step 12 — e il
   * profilo **prima** del registro: `ProfileProvider` sta sopra `GroupsProvider` proprio
   * perché il profilo deve esistere prima che un vault si monti, altrimenti resta una
   * finestra in cui «io» non esisto ed è lì che nascevano i duplicati.
   */
  static async start(dir: string, name: string): Promise<HeadlessDevice> {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    const db = new NodeSqliteDatabase(join(dir, 'app.db'));
    const meta = await SqliteAppMeta.open(db);
    const keyStore = fileKeyStore(join(dir, 'keystore.json'));

    await ensureSchema(db, meta, keyStore);

    let profile = await loadProfile(meta);
    if (profile === null) {
      profile = createProfile(name, PROFILE_COLORS[0] ?? '#7c9cff', random);
      await saveProfile(meta, profile);
    }

    const http = new CountingHttp();
    const registry = await GroupRegistry.open({
      db,
      keyStore,
      random,
      relay: httpRelayGateway(RELAY_URL, http, random),
    });

    return new HeadlessDevice(name, db, meta, keyStore, registry, profile, http);
  }

  /**
   * Monta un gruppo: documento, persistenza, motore, membro.
   *
   * È `VaultProvider.boot()` senza React, passaggio per passaggio e con gli stessi
   * moduli. Se un giorno diverge, la prova smette di dire la verità — quindi qualunque
   * modifica a `VaultProvider` va guardata anche da qui.
   */
  async open(vaultId: string): Promise<OpenGroup> {
    const record = await this.registry.get(vaultId);
    if (record === null) throw new Error(`gruppo sconosciuto: ${vaultId}`);
    const keys = await this.registry.keys(vaultId);
    if (keys === null) throw new Error(`chiave non leggibile per ${vaultId}`);

    const doc = new Y.Doc();
    const persistence = new SqliteYPersistence(this.db, doc, {
      tableName: updatesTableName(vaultId),
    });
    await persistence.load();

    const store = new VaultStore(doc, { random });
    // Chi **entra** in un gruppo altrui non semina le categorie: le riceve col primo
    // sync. Seminarle era la ragione delle sedici invece di otto.
    seedDefaults(store, { seedCategories: record.origin !== 'joined' });

    const syncStore = await SqliteSyncStore.open(this.db, vaultId);
    const client = new RelayClient(RELAY_URL, keys, this.http, random);
    const engine = new SyncEngine(doc, client, syncStore);

    // La funzione vera dell'app, non una sua copia: è il punto di tutto l'esercizio.
    const myMemberId = resolveMyMemberId({
      store,
      origin: record.origin,
      linkedMemberId: record.myMemberId,
      profileId: this.profile.profileId,
    });
    // Idempotente: rieseguirla a ogni avvio non duplica nulla, e un cambio di nome
    // raggiunge l'altro dispositivo da solo.
    if (myMemberId !== null) {
      store.setMember(myMemberId, { name: this.profile.name, color: this.profile.color });
    }

    await this.registry.touch(vaultId);
    await engine.start();
    void engine.runForever();

    return {
      record,
      doc,
      store,
      engine,
      keys,
      myMemberId,
      close: async () => {
        engine.stop();
        await persistence.destroy();
      },
    };
  }

  /** Crea un gruppo e lo apre, come fa l'app dopo «Crea un gruppo». */
  async createGroup(name: string): Promise<OpenGroup> {
    const record = await this.registry.create(name);
    const group = await this.open(record.vaultId);
    // Il nome autorevole sta dentro il vault: senza, l'altro dispositivo vedrebbe un
    // gruppo senza nome finché non lo rinomina qualcuno.
    group.store.setGroupName(name);
    return group;
  }

  /**
   * Entra in un gruppo con la chiave di un invito, come fa `useAdoptPairing`.
   *
   * Attenzione: chi entra in un gruppo **altrui** esce da qui con `myMemberId === null`,
   * e finché resta così **non gli viene scritto alcun membro**. Non è una mancanza: è la
   * domanda «chi sei in questo gruppo?» dello Step 12, che l'app pone con
   * `GroupIdentityGate` prima di scrivere. Va risposta con `chooseIdentity`.
   */
  async joinGroup(key: Uint8Array, name: string): Promise<OpenGroup> {
    const record = await this.registry.join(key, name);
    return this.open(record.vaultId);
  }

  /**
   * Risponde a «chi sei in questo gruppo?», come il bottone di `GroupIdentityGate`.
   *
   * `memberId` è il `profileId` per «sono nuovo», o l'id di un membro esistente per «ero
   * già qui, con questo nome» — il caso di chi ha ripristinato la chiave su un telefono
   * nuovo. Rimonta il gruppo perché è ciò che fa l'app: `linkedMemberId` è una dipendenza
   * dell'effetto di `VaultProvider`.
   */
  async chooseIdentity(group: OpenGroup, memberId: string): Promise<OpenGroup> {
    await this.registry.setMyMemberId(group.record.vaultId, memberId);
    await group.close();
    return this.open(group.record.vaultId);
  }

  close(): void {
    this.db.close();
  }
}

/** Aspetta che `condition` diventi vera, o si arrende dopo `timeoutMs`. */
export async function until(
  condition: () => boolean,
  { timeoutMs = 30_000, everyMs = 250 } = {},
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (condition()) return true;
    await new Promise((resolve) => setTimeout(resolve, everyMs));
  }
  return condition();
}

/** Descrizione compatta di uno stato di sync, per i log. */
export function describeSync(state: SyncState): string {
  switch (state.phase) {
    case 'synced':
      return 'sincronizzato';
    case 'offline':
      return 'senza rete';
    case 'error':
      return `errore: ${state.message}`;
    case 'blocked':
      return `bloccato: ${state.message}`;
    default:
      return state.phase;
  }
}
