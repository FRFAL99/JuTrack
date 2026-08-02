/**
 * Un secondo telefono, che però gira in un terminale.
 *
 * Serve a provare la sincronizzazione avendo **un solo dispositivo fisico**. Non è un
 * simulatore e non finge nulla: usa `@jutrack/core` così com'è — stesso crypto, stesso
 * `SyncEngine`, stessa scala di poll, stesso formato d'invito — contro il relay vero. Per
 * il relay e per il telefono questo processo è indistinguibile da un altro telefono.
 *
 * È possibile solo perché il core è indipendente dalla piattaforma per vincolo
 * architetturale (`packages/core` non importa nulla da react-native o expo, e una regola
 * ESLint lo impone). Qui quel vincolo si ripaga.
 *
 * **Cosa NON prova:** l'interfaccia, `expo-sqlite`, SecureStore, la consegna del deep
 * link da parte di Android, il foglio di condivisione, la fotocamera. Tutto ciò che sta
 * sopra il core resta da guardare col telefono in mano.
 *
 * Uso:
 *   npm run peer -- crea "Casa"        crea un gruppo e stampa l'invito da aprire sul telefono
 *   npm run peer -- entra "<link>"     entra nel gruppo di un invito generato dal telefono
 *   npm run peer -- apri               riapre l'ultimo gruppo e riparte
 *   npm run peer -- invito             ristampa un invito per il gruppo salvato
 *
 * Opzioni: `--profilo <nome>` per tenere più peer distinti, `--verbose` per vedere ogni
 * richiesta al relay (è così che si guarda la scala di poll dello Step 16 mentre lavora).
 */
import { createInterface } from 'node:readline/promises';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from '@noble/ciphers/utils.js';
import * as Y from 'yjs';
import {
  buildSplit,
  computeBalances,
  createInviteLink,
  deriveVaultKeys,
  formatMoney,
  generateVaultKey,
  parseAmount,
  parseInvite,
  RelayClient,
  SyncEngine,
  VaultStore,
  type Expense,
  type HttpClient,
  type Member,
  type RandomSource,
  type SyncCursorStore,
  type SyncState,
} from '@jutrack/core';

const RELAY_URL =
  process.env.JUTRACK_RELAY_URL ?? 'https://jutrack-relay.jutrack-relayfrfal.workers.dev';

const HERE = dirname(fileURLToPath(import.meta.url));
const STATE_DIR = join(HERE, '..', '.jutrack-peer');

const random: RandomSource = { getRandomBytes: (n) => randomBytes(n) };
const toB64 = (bytes: Uint8Array): string => Buffer.from(bytes).toString('base64');
const fromB64 = (s: string): Uint8Array => new Uint8Array(Buffer.from(s, 'base64'));

/** Tutto ciò che un «telefono» deve ricordare fra due avvii. */
interface PeerState {
  /** La chiave del vault. **In chiaro**: vedi l'avvertenza in fondo al file. */
  key: string;
  memberId: string;
  memberName: string;
  cursor: number;
  pending: string[];
  pushedStateVector: string | null;
  /** Stato completo del documento Yjs, che qui fa le veci di `expo-sqlite`. */
  doc: string | null;
}

// ---------------------------------------------------------------- persistenza

/**
 * Cursore, coda e documento in un file JSON.
 *
 * Fa il lavoro che sul telefono fanno `SqliteSyncStore` e `SqliteYPersistence`. Riscrive
 * tutto il file a ogni salvataggio: con qualche decina di spese non vale la pena fare di
 * meglio, e la coda resta durevole fra due avvii — che è la proprietà da riprodurre.
 */
class FileStore implements SyncCursorStore {
  constructor(
    private readonly path: string,
    private state: PeerState,
  ) {}

  get snapshot(): PeerState {
    return this.state;
  }

  save(): void {
    writeFileSync(this.path, JSON.stringify(this.state, null, 2), { mode: 0o600 });
  }

  rememberDoc(doc: Y.Doc): void {
    this.state.doc = toB64(Y.encodeStateAsUpdate(doc));
    this.save();
  }

  async getCursor(): Promise<number> {
    return this.state.cursor;
  }
  async setCursor(seq: number): Promise<void> {
    this.state.cursor = seq;
    this.save();
  }
  async getPending(): Promise<Uint8Array[]> {
    return this.state.pending.map(fromB64);
  }
  async setPending(updates: Uint8Array[]): Promise<void> {
    this.state.pending = updates.map(toB64);
    this.save();
  }
  async getPushedStateVector(): Promise<Uint8Array | null> {
    return this.state.pushedStateVector === null ? null : fromB64(this.state.pushedStateVector);
  }
  async setPushedStateVector(stateVector: Uint8Array): Promise<void> {
    this.state.pushedStateVector = toB64(stateVector);
    this.save();
  }
}

// ------------------------------------------------------------------- rete

/**
 * `fetch` con il conteggio delle richieste.
 *
 * Il conteggio non è un vezzo: è il modo di **vedere** la scala di poll dello Step 16 e
 * l'`offlineRetryMs` dello Step 17 mentre lavorano, invece di dedurli dai test.
 */
class CountingHttp implements HttpClient {
  gets = 0;
  posts = 0;
  private lastAt = Date.now();

  constructor(private readonly verbose: boolean) {}

  async request(
    url: string,
    init: { method: 'GET' | 'POST' | 'DELETE'; headers: Record<string, string>; body?: string },
  ): Promise<{ status: number; text: () => Promise<string> }> {
    const now = Date.now();
    const gap = ((now - this.lastAt) / 1000).toFixed(1);
    this.lastAt = now;
    if (init.method === 'GET') this.gets++;
    if (init.method === 'POST') this.posts++;
    if (this.verbose) log(`· ${init.method} al relay (${gap} s dalla precedente)`, 'grigio');

    const response = await fetch(url, {
      method: init.method,
      headers: init.headers,
      ...(init.body === undefined ? {} : { body: init.body }),
    });
    return { status: response.status, text: () => response.text() };
  }
}

// ------------------------------------------------------------------ stampa

const COLORS = {
  grigio: '\x1b[90m',
  verde: '\x1b[32m',
  giallo: '\x1b[33m',
  rosso: '\x1b[31m',
  ciano: '\x1b[36m',
  neutro: '\x1b[0m',
} as const;

function orario(): string {
  return new Date().toTimeString().slice(0, 8);
}

function log(message: string, color: keyof typeof COLORS = 'neutro'): void {
  console.log(`${COLORS[color]}${orario()} ${message}${COLORS.neutro}`);
}

// ------------------------------------------------------------- avvio del peer

interface Peer {
  doc: Y.Doc;
  store: VaultStore;
  engine: SyncEngine;
  file: FileStore;
  http: CountingHttp;
  vaultId: string;
}

async function boot(state: PeerState, path: string, verbose: boolean): Promise<Peer> {
  const keys = deriveVaultKeys(fromB64(state.key));
  const doc = new Y.Doc();
  // Come fa la persistenza sul telefono: il documento si ricarica **prima** che il motore
  // esista, con un'origine sua. È esattamente la situazione che rende necessario il
  // catch-up di `start()`, quindi riprodurla non è un dettaglio.
  if (state.doc !== null) Y.applyUpdate(doc, fromB64(state.doc), 'persistenza');

  const file = new FileStore(path, state);
  const store = new VaultStore(doc, { random });

  // Il membro nasce da un id stabile salvato nel file, come il `profileId` sul telefono.
  // È idempotente: rieseguirlo a ogni avvio non duplica nulla. Se qui si generasse un id
  // nuovo a ogni avvio si riprodurrebbe il bug dei membri duplicati dello Step 11 — e
  // sarebbe il peer a sbagliare, non l'app.
  store.setMember(state.memberId, { name: state.memberName, color: '#7c9cff' });

  const http = new CountingHttp(verbose);
  const client = new RelayClient(RELAY_URL, keys, http, random);
  const engine = new SyncEngine(doc, client, file);

  doc.on('update', () => file.rememberDoc(doc));
  engine.subscribe((s) => reportSyncState(s));

  await engine.start();
  void engine.runForever();

  return { doc, store, engine, file, http, vaultId: keys.vaultId };
}

let lastPhase: SyncState['phase'] | null = null;
function reportSyncState(state: SyncState): void {
  // Solo i cambi di fase: `syncing`/`synced` a ogni giro sarebbero rumore.
  if (state.phase === lastPhase || state.phase === 'syncing') return;
  lastPhase = state.phase;
  if (state.phase === 'offline') log('⚠ relay non raggiungibile — si riprova', 'giallo');
  if (state.phase === 'error') log(`⚠ il relay ha risposto male: ${state.message}`, 'giallo');
  if (state.phase === 'blocked') log(`✖ accesso rifiutato: ${state.message}`, 'rosso');
}

/**
 * Stampa ciò che arriva dall'altro telefono, appena arriva.
 *
 * Confronto contro l'istantanea precedente invece di leggere gli update: qui interessa
 * *cosa è cambiato per l'utente*, non quali struct Yjs sono passati.
 */
function watch(peer: Peer): void {
  let expenses = new Map(peer.store.listExpenses().map((e) => [e.id, e]));
  let members = new Map(peer.store.listMembers().map((m) => [m.id, m]));

  peer.doc.on('update', (_update: Uint8Array, origin: unknown) => {
    // Il motore applica ciò che scarica con sé stesso come origine: è così che si
    // distingue «arrivato dall'altro telefono» da «l'ho appena scritto io». Senza, ogni
    // riga sarebbe una freccia in entrata e la prova non direbbe più nulla.
    const remote = origin === peer.engine;
    const nextExpenses = new Map(peer.store.listExpenses().map((e) => [e.id, e]));
    const nextMembers = new Map(peer.store.listMembers().map((m) => [m.id, m]));

    for (const [id, member] of nextMembers) {
      if (!members.has(id)) log(`👤 nuovo membro: ${member.name}  (${id.slice(0, 8)}…)`, 'ciano');
    }
    if (remote) {
      for (const [id, expense] of nextExpenses) {
        const before = expenses.get(id);
        if (before === undefined) log(`← ${describe(expense, nextMembers)}`, 'verde');
        else if (before.updatedAt !== expense.updatedAt)
          log(`✎ modificata dall'altro: ${describe(expense, nextMembers)}`, 'verde');
      }
      for (const id of expenses.keys()) {
        if (!nextExpenses.has(id)) log('✖ una spesa è stata cancellata dall’altro', 'verde');
      }
    }

    expenses = nextExpenses;
    members = nextMembers;
  });
}

function describe(expense: Expense, members: Map<string, Member>): string {
  const who = members.get(expense.paidBy)?.name ?? expense.paidBy.slice(0, 8);
  const note = expense.note === null || expense.note === '' ? '(senza nota)' : expense.note;
  return `${formatMoney(expense.amountCents)} · ${note} · pagata da ${who}`;
}

// ------------------------------------------------------------------- comandi

function printState(peer: Peer): void {
  const members = peer.store.listMembers();
  const expenses = peer.store.listExpenses();
  const balances = computeBalances(
    expenses,
    peer.store.listSettlements(),
    members.map((m) => m.id),
  );

  console.log(`\n  Gruppo: ${peer.store.getGroupName() ?? '(senza nome)'}`);
  console.log(`  vault:  ${peer.vaultId}`);
  console.log(`\n  Membri (${members.length}):`);
  for (const m of members) {
    const mine = m.id === peer.file.snapshot.memberId ? '  ← sono io' : '';
    console.log(`    · ${m.name}  (${m.id.slice(0, 8)}…)${mine}`);
  }
  console.log(`\n  Spese (${expenses.length}):`);
  const byId = new Map(members.map((m) => [m.id, m]));
  for (const e of expenses) console.log(`    · ${e.date}  ${describe(e, byId)}`);
  console.log('\n  Saldi:');
  for (const b of balances) {
    const name = byId.get(b.memberId)?.name ?? b.memberId.slice(0, 8);
    console.log(`    · ${name}: ${formatMoney(b.netCents)}`);
  }
  console.log(
    `\n  Richieste al relay da quando è partito: ${peer.http.gets} GET, ${peer.http.posts} POST\n`,
  );
}

function addExpense(peer: Peer, rest: string): void {
  const [rawAmount, ...noteParts] = rest.split(' ');
  const cents = rawAmount === undefined ? null : parseAmount(rawAmount);
  if (cents === null || cents <= 0) {
    log('Serve un importo: «spesa 12,30 pizza»', 'rosso');
    return;
  }

  const members = peer.store.listMembers().map((m) => m.id);
  const expense = peer.store.addExpense({
    amountCents: cents,
    date: new Date().toISOString().slice(0, 10),
    note: noteParts.join(' '),
    paidBy: peer.file.snapshot.memberId,
    split: buildSplit('equal', cents, members),
  });
  log(
    `→ registrata ${formatMoney(expense.amountCents)}, divisa fra ${members.length} — parte al prossimo giro`,
    'verde',
  );
}

function printInvite(peer: Peer): void {
  const invite = createInviteLink(fromB64(peer.file.snapshot.key), {
    baseUrl: RELAY_URL,
    name: peer.store.getGroupName() ?? 'Gruppo di prova',
    now: Date.now(),
  });
  console.log('\n  Aprilo sul telefono, o incollalo in «Incolla un invito»:\n');
  console.log(`    ${COLORS.ciano}${invite.url}${COLORS.neutro}\n`);
  console.log(`  In forma di URI (Gruppi → incolla):\n\n    ${invite.joinUri}\n`);
  console.log(`  Scade il ${new Date(invite.expiresAt).toLocaleString('it-IT')}\n`);
}

const AIUTO = `
  spesa <importo> [nota]   registra una spesa (es. «spesa 12,30 pizza»)
  stato                    membri, spese, saldi e richieste fatte
  invito                   ristampa un invito per questo gruppo
  aiuto                    questo elenco
  esci                     chiude
`;

// -------------------------------------------------------------------- main

function readFlag(argv: string[], name: string): string | null {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? null : (argv[i + 1] ?? null);
}

function statePath(profile: string): string {
  return join(STATE_DIR, `${profile}.json`);
}

function loadState(path: string): PeerState {
  if (!existsSync(path)) {
    console.error(
      `Nessun gruppo salvato in ${path}.\nUsa «npm run peer -- crea "Nome"» oppure «npm run peer -- entra "<link>"».`,
    );
    process.exit(1);
  }
  return JSON.parse(readFileSync(path, 'utf8')) as PeerState;
}

function freshState(key: Uint8Array, name: string): PeerState {
  return {
    key: toB64(key),
    // Opaco e stabile, come il `profileId` del telefono.
    memberId: Buffer.from(random.getRandomBytes(16)).toString('hex'),
    memberName: name,
    cursor: 0,
    pending: [],
    pushedStateVector: null,
    doc: null,
  };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const command = argv[0] ?? 'aiuto';
  const profile = readFlag(argv, 'profilo') ?? 'default';
  const verbose = argv.includes('--verbose');
  const path = statePath(profile);
  mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 });

  if (command === 'aiuto' || command === '--help' || command === '-h') {
    console.log(`
  Un secondo telefono, in un terminale. Parla col relay vero.

  npm run peer -- crea "Casa"       crea un gruppo e stampa l'invito
  npm run peer -- entra "<link>"    entra con un invito generato dal telefono
  npm run peer -- apri              riapre l'ultimo gruppo
  npm run peer -- invito            ristampa un invito per il gruppo salvato

  --profilo <nome>   tiene più peer distinti (default: «default»)
  --nome <nome>      come si chiama questo membro (default: «Peer-<profilo>»)
  --verbose          stampa ogni richiesta al relay, con l'intervallo
`);
    return;
  }

  let state: PeerState;
  let announce: (peer: Peer) => void = () => undefined;

  // Due membri che si chiamano entrambi «Peer» rendono illeggibile il saldo, che è
  // proprio il numero da controllare a mano.
  const peerName = readFlag(argv, 'nome') ?? `Peer-${profile}`;

  if (command === 'crea') {
    const groupName = argv[1] ?? 'Gruppo di prova';
    state = freshState(generateVaultKey(random), peerName);
    announce = (peer) => {
      peer.store.setGroupName(groupName);
      log(`Gruppo «${groupName}» creato. Ecco l'invito da aprire sul telefono:`, 'ciano');
      printInvite(peer);
    };
  } else if (command === 'entra') {
    const link = argv[1];
    if (link === undefined) {
      console.error('Serve il link: npm run peer -- entra "https://…/j#v=1&k=…"');
      process.exit(1);
    }
    const parsed = parseInvite(link, Date.now());
    if (!parsed.ok) {
      console.error(`Invito non valido (${parsed.reason}).`);
      process.exit(1);
    }
    state = freshState(parsed.key, peerName);
    announce = () => log(`Entrato nel gruppo «${parsed.name ?? 'senza nome'}»`, 'ciano');
  } else if (command === 'apri' || command === 'invito') {
    state = loadState(path);
  } else {
    console.error(`Comando sconosciuto: ${command}. Prova «npm run peer -- aiuto».`);
    process.exit(1);
  }

  const peer = await boot(state, path, verbose);
  peer.file.save();

  if (command === 'invito') {
    printInvite(peer);
    peer.engine.stop();
    return;
  }

  log(`Relay: ${RELAY_URL}`, 'grigio');
  log(`vault ${peer.vaultId}`, 'grigio');
  announce(peer);
  watch(peer);
  printState(peer);
  console.log(`  Comandi: ${AIUTO.trim().split('\n')[0]?.trim()} … («aiuto» per l'elenco)\n`);

  const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: '> ' });
  rl.prompt();

  rl.on('line', (line) => {
    const trimmed = line.trim();
    const [verb, ...rest] = trimmed.split(' ');
    if (verb === 'esci' || verb === 'q') rl.close();
    else if (verb === 'stato') printState(peer);
    else if (verb === 'invito') printInvite(peer);
    else if (verb === 'spesa') addExpense(peer, rest.join(' '));
    else if (verb === 'aiuto') console.log(AIUTO);
    else if (trimmed !== '') log(`Non conosco «${verb}». Prova «aiuto».`, 'rosso');
    rl.prompt();
  });

  await new Promise<void>((resolve) => rl.on('close', resolve));
  peer.engine.stop();
  log('Chiuso. Lo stato è salvato: «npm run peer -- apri» riprende da qui.', 'grigio');
}

await main();

/*
 * **La chiave del vault sta in chiaro in `.jutrack-peer/`.**
 *
 * Sul telefono vive in SecureStore, cioè nel Keystore di sistema; qui è un file JSON con
 * i permessi a 600. È accettabile perché questo è uno strumento di prova, su gruppi di
 * prova, sulla macchina di chi sviluppa — e la cartella è in `.gitignore`. Non va usato
 * per un gruppo che contiene dati veri.
 */
