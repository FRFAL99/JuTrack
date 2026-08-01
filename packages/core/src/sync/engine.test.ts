/**
 * Test del motore di sincronizzazione.
 *
 * Lo scenario che conta è quello reale: due dispositivi che si scambiano spese passando
 * da un relay che non può leggerle. Il relay finto replica i vincoli di quello vero
 * (log append-only, `since` esclusivo, paginazione, limiti) — un fake più permissivo
 * darebbe test verdi e sincronizzazione rotta in produzione.
 */
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { deriveVaultKeys, generateVaultKey } from '../crypto/keys';
import { testRandom } from '../crypto/testing';
import { buildSplit, VaultStore } from '../model/store';
import { SyncEngine } from './engine';
import { RelayClient, RelayError } from './relay-client';
import { FakeRelay, MemoryCursorStore } from './testing';
import type { HttpClient, SyncEngineOptions } from './types';

const ME = 'membro-a';
const YOU = 'membro-b';

/**
 * Attese e sveglie non fanno nulla, se non è il test a chiederlo.
 *
 * `schedule` neutralizzato: senza, ogni scrittura lascerebbe in giro un timer vero che
 * si risveglia a test finito. I test che verificano proprio quel meccanismo lo passano
 * esplicitamente.
 */
const INERT: SyncEngineOptions = {
  sleep: async () => undefined,
  schedule: () => () => undefined,
};

/** Un dispositivo: documento, store applicativo e motore di sync sullo stesso relay. */
function makeDevice(relay: FakeRelay, keys = SHARED_KEYS, options: SyncEngineOptions = {}) {
  const doc = new Y.Doc();
  const store = new VaultStore(doc, { random: testRandom });
  const cursors = new MemoryCursorStore();
  const client = new RelayClient('https://relay.test', keys, relay, testRandom);
  const engine = new SyncEngine(doc, client, cursors, { ...INERT, ...options });
  return { doc, store, engine, cursors };
}

const SHARED_KEYS = deriveVaultKeys(generateVaultKey(testRandom));

/**
 * `sleep` che registra le attese e non finisce mai da sola.
 *
 * Serve a osservare il ciclo continuo un giro alla volta: finché il test non chiama
 * `wake()`, il motore resta fermo dove l'attesa lo ha lasciato.
 */
function frozenSleep() {
  const waited: number[] = [];
  return {
    waited,
    sleep: (ms: number): Promise<void> => {
      waited.push(ms);
      return new Promise<void>(() => undefined);
    },
  };
}

/** Lascia girare tutte le promise già risolte prima di guardare il risultato. */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function addExpense(store: VaultStore, cents: number, note: string): void {
  store.addExpense({
    amountCents: cents,
    date: '2026-08-01',
    note,
    paidBy: ME,
    split: buildSplit('equal', cents, [ME, YOU]),
  });
}

describe('sincronizzazione fra due dispositivi', () => {
  it('propaga le spese da A a B', async () => {
    const relay = new FakeRelay();
    const a = makeDevice(relay);
    const b = makeDevice(relay);
    await a.engine.start();
    await b.engine.start();

    addExpense(a.store, 1230, 'spesa alimentare');
    await a.engine.syncOnce();
    await b.engine.syncOnce();

    expect(b.store.listExpenses()).toHaveLength(1);
    expect(b.store.listExpenses()[0]?.note).toBe('spesa alimentare');
  });

  it('unisce spese create offline su entrambi', async () => {
    // Lo scenario centrale del progetto: entrambi in aereo, poi la rete torna.
    const relay = new FakeRelay();
    const a = makeDevice(relay);
    const b = makeDevice(relay);
    await a.engine.start();
    await b.engine.start();

    addExpense(a.store, 100, 'da A 1');
    addExpense(a.store, 200, 'da A 2');
    addExpense(b.store, 300, 'da B 1');

    // Due giri per parte: il primo invia, il secondo riceve ciò che l'altro ha inviato.
    await a.engine.syncOnce();
    await b.engine.syncOnce();
    await a.engine.syncOnce();
    await b.engine.syncOnce();

    expect(a.store.listExpenses()).toHaveLength(3);
    expect(b.store.listExpenses()).toHaveLength(3);
    expect(a.store.listExpenses()).toEqual(b.store.listExpenses());
  });

  it('non rimanda indietro gli update ricevuti dal relay', async () => {
    // Senza il controllo sull'origine si creerebbe un ciclo infinito: A applica
    // l'update di B, lo considera locale e lo rispedisce, e così via.
    const relay = new FakeRelay();
    const a = makeDevice(relay);
    const b = makeDevice(relay);
    await a.engine.start();
    await b.engine.start();

    addExpense(a.store, 1000, 'una sola');
    await a.engine.syncOnce();
    await b.engine.syncOnce();

    const afterFirstExchange = relay.storedCount;
    await b.engine.syncOnce();
    await b.engine.syncOnce();

    expect(relay.storedCount).toBe(afterFirstExchange);
    expect(b.engine.pendingCount).toBe(0);
  });

  it('propaga le cancellazioni', async () => {
    const relay = new FakeRelay();
    const a = makeDevice(relay);
    const b = makeDevice(relay);
    await a.engine.start();
    await b.engine.start();

    addExpense(a.store, 500, 'da cancellare');
    await a.engine.syncOnce();
    await b.engine.syncOnce();
    expect(b.store.listExpenses()).toHaveLength(1);

    a.store.deleteExpense(a.store.listExpenses()[0]?.id as string);
    await a.engine.syncOnce();
    await b.engine.syncOnce();

    expect(b.store.listExpenses()).toHaveLength(0);
  });

  it('converge su modifiche concorrenti allo stesso campo', async () => {
    const relay = new FakeRelay();
    const a = makeDevice(relay);
    const b = makeDevice(relay);
    await a.engine.start();
    await b.engine.start();

    addExpense(a.store, 1000, 'originale');
    await a.engine.syncOnce();
    await b.engine.syncOnce();

    const id = a.store.listExpenses()[0]?.id as string;
    a.store.updateExpense(id, { note: 'versione A' });
    b.store.updateExpense(id, { note: 'versione B' });

    await a.engine.syncOnce();
    await b.engine.syncOnce();
    await a.engine.syncOnce();
    await b.engine.syncOnce();

    expect(a.store.getExpense(id)?.note).toBe(b.store.getExpense(id)?.note);
    expect(a.store.listExpenses()).toHaveLength(1);
  });
});

describe('avvio su un documento che ha già contenuto', () => {
  it('pubblica lo stato già presente nel documento', async () => {
    // Il bug che ha reso la sincronizzazione unilaterale alla prima prova con due
    // telefoni veri. La persistenza ricarica il documento **prima** che il motore
    // esista, con un'origine sua, quindi nulla di quello storico passa da
    // `onLocalUpdate`: senza catch-up, il telefono che aveva già dei dati resta muto e
    // il ciclo riporta comunque `synced`.
    const relay = new FakeRelay();
    const a = makeDevice(relay);
    const b = makeDevice(relay);

    addExpense(a.store, 100, 'scritta prima del motore');
    addExpense(a.store, 200, 'anche questa');

    await a.engine.start();
    await b.engine.start();
    await a.engine.syncOnce();
    await b.engine.syncOnce();

    expect(b.store.listExpenses()).toHaveLength(2);
    expect(
      b.store
        .listExpenses()
        .map((e) => e.note)
        .sort(),
    ).toEqual(['anche questa', 'scritta prima del motore']);
  });

  it('non ripubblica a ogni avvio ciò che è già sul relay', async () => {
    // Il rovescio del catch-up: senza ricordare cosa è stato pubblicato, ogni apertura
    // dell'app rispedirebbe l'intero documento e il log del relay crescerebbe da solo.
    const relay = new FakeRelay();
    const doc = new Y.Doc();
    const store = new VaultStore(doc, { random: testRandom });
    const cursors = new MemoryCursorStore();
    const client = new RelayClient('https://relay.test', SHARED_KEYS, relay, testRandom);

    const first = new SyncEngine(doc, client, cursors, INERT);
    await first.start();
    addExpense(store, 100, 'una sola');
    await first.syncOnce();
    first.stop();
    expect(relay.storedCount).toBe(1);

    const second = new SyncEngine(doc, client, cursors, INERT);
    await second.start();
    expect(second.pendingCount).toBe(0);

    await second.syncOnce();
    expect(relay.storedCount).toBe(1);
  });

  it('un documento vuoto non pubblica nulla', async () => {
    // Un delta vuoto pesa due byte: senza la soglia, ogni avvio a vault appena creato
    // scriverebbe un blob inutile sul relay.
    const relay = new FakeRelay();
    const a = makeDevice(relay);

    await a.engine.start();
    expect(a.engine.pendingCount).toBe(0);

    await a.engine.syncOnce();
    expect(relay.storedCount).toBe(0);
  });

  it('non considera pubblicato ciò che il relay non ha accettato', async () => {
    // Registrare lo state vector a coda ancora piena cancellerebbe quegli update dal
    // catch-up del prossimo avvio: sparirebbero in silenzio.
    const relay = new FakeRelay();
    const a = makeDevice(relay);

    relay.failAllWith = { status: 500 };
    addExpense(a.store, 100, 'mai arrivata');
    await a.engine.start();
    await a.engine.syncOnce();

    expect(a.cursors.pushedStateVectorWrites).toBe(0);
    expect(await a.cursors.getPushedStateVector()).toBeNull();
  });

  it('pubblica lo storico anche dopo un avvio in cui la rete mancava', async () => {
    const relay = new FakeRelay();
    const doc = new Y.Doc();
    const store = new VaultStore(doc, { random: testRandom });
    const cursors = new MemoryCursorStore();
    const client = new RelayClient('https://relay.test', SHARED_KEYS, relay, testRandom);

    addExpense(store, 100, 'scritta senza rete');
    relay.failAllWith = { status: 503 };
    const first = new SyncEngine(doc, client, cursors, INERT);
    await first.start();
    await first.syncOnce();
    first.stop();

    relay.failAllWith = null;
    const second = new SyncEngine(doc, client, cursors, INERT);
    await second.start();
    await second.syncOnce();

    const b = makeDevice(relay);
    await b.engine.start();
    await b.engine.syncOnce();
    expect(b.store.listExpenses()).toHaveLength(1);
  });
});

describe('coda offline', () => {
  it('conserva gli update quando il relay non risponde', async () => {
    const relay = new FakeRelay();
    const a = makeDevice(relay);
    await a.engine.start();

    relay.failAllWith = { status: 500 };
    addExpense(a.store, 1000, 'creata offline');
    await a.engine.syncOnce();

    expect(a.engine.getState().phase).toBe('error');
    expect(a.engine.pendingCount).toBe(1);
    expect(relay.storedCount).toBe(0);
  });

  it('invia la coda quando il relay torna disponibile', async () => {
    const relay = new FakeRelay();
    const a = makeDevice(relay);
    const b = makeDevice(relay);
    await a.engine.start();
    await b.engine.start();

    relay.failAllWith = { status: 503 };
    addExpense(a.store, 100, 'offline 1');
    addExpense(a.store, 200, 'offline 2');
    await a.engine.syncOnce();
    expect(a.engine.pendingCount).toBe(2);

    relay.failAllWith = null;
    await a.engine.syncOnce();

    expect(a.engine.pendingCount).toBe(0);
    expect(a.engine.getState().phase).toBe('synced');

    await b.engine.syncOnce();
    expect(b.store.listExpenses()).toHaveLength(2);
  });

  it('riprende la coda salvata dopo un riavvio dell app', async () => {
    const relay = new FakeRelay();
    const doc = new Y.Doc();
    const store = new VaultStore(doc, { random: testRandom });
    const cursors = new MemoryCursorStore();
    const client = new RelayClient('https://relay.test', SHARED_KEYS, relay, testRandom);

    const first = new SyncEngine(doc, client, cursors, INERT);
    await first.start();
    relay.failAllWith = { status: 500 };
    addExpense(store, 1000, 'prima del riavvio');
    await first.syncOnce();
    first.stop();
    expect(first.pendingCount).toBe(1);

    // Nuovo motore sullo stesso store persistito: la coda deve sopravvivere.
    const second = new SyncEngine(doc, client, cursors, INERT);
    await second.start();
    expect(second.pendingCount).toBeGreaterThanOrEqual(1);

    relay.failAllWith = null;
    await second.syncOnce();

    // Ciò che conta è che la spesa arrivi all'altro dispositivo, non quanti blob siano
    // serviti: il catch-up può ripubblicarla insieme al resto dello stato.
    const b = makeDevice(relay);
    await b.engine.start();
    await b.engine.syncOnce();
    expect(b.store.listExpenses()).toHaveLength(1);
    expect(b.store.listExpenses()[0]?.note).toBe('prima del riavvio');
  });

  it('rimuove dalla coda solo gli update accettati', async () => {
    // Il relay accetta al massimo 100 blob per richiesta: con 150 in coda, il primo
    // giro ne invia 100 e il secondo i restanti. Rimuoverli tutti dopo il primo
    // significherebbe perdere 50 spese in silenzio.
    const relay = new FakeRelay();
    const a = makeDevice(relay);
    await a.engine.start();

    for (let i = 0; i < 150; i++) addExpense(a.store, 100 + i, `spesa ${i}`);
    expect(a.engine.pendingCount).toBe(150);

    await a.engine.syncOnce();

    expect(a.engine.pendingCount).toBe(0);
    expect(relay.storedCount).toBe(150);
  });
});

describe('paginazione', () => {
  it('scarica tutti gli update oltre il limite per risposta', async () => {
    // Il relay restituisce al massimo 200 update per volta: senza seguire `hasMore`
    // il dispositivo si fermerebbe ai primi 200, perdendo il resto.
    const relay = new FakeRelay();
    const a = makeDevice(relay);
    const b = makeDevice(relay);
    await a.engine.start();
    await b.engine.start();

    for (let i = 0; i < 250; i++) addExpense(a.store, 100 + i, `spesa ${i}`);
    await a.engine.syncOnce();
    expect(relay.storedCount).toBe(250);

    const outcome = await b.engine.syncOnce();

    expect(outcome?.pulled).toBe(250);
    expect(b.store.listExpenses()).toHaveLength(250);
  });
});

describe('gestione degli errori', () => {
  it('segnala lo stato di errore con il messaggio', async () => {
    const relay = new FakeRelay();
    const a = makeDevice(relay);
    await a.engine.start();

    relay.failAllWith = { status: 500 };
    await a.engine.syncOnce();

    const state = a.engine.getState();
    expect(state.phase).toBe('error');
    if (state.phase === 'error') {
      // Il messaggio va mostrato: un sync che fallisce in silenzio fa credere
      // all'utente che i due telefoni siano allineati quando non lo sono.
      expect(state.message).toContain('500');
    }
  });

  it('classifica 403 come errore permanente', () => {
    expect(new RelayError(403, 'token errato').permanent).toBe(true);
    expect(new RelayError(401, 'non autenticato').permanent).toBe(true);
    expect(new RelayError(413, 'troppo grande').permanent).toBe(true);
    // 500 e 429 sono transitori: ritentare ha senso.
    expect(new RelayError(500, 'errore server').permanent).toBe(false);
    expect(new RelayError(429, 'troppe richieste').permanent).toBe(false);
  });

  it('torna allo stato sincronizzato dopo un errore transitorio', async () => {
    const relay = new FakeRelay();
    const a = makeDevice(relay);
    await a.engine.start();

    relay.failNextWith = { status: 500 };
    await a.engine.syncOnce();
    expect(a.engine.getState().phase).toBe('error');

    await a.engine.syncOnce();
    expect(a.engine.getState().phase).toBe('synced');
  });

  it('notifica i cambi di stato a chi è in ascolto', async () => {
    const relay = new FakeRelay();
    const a = makeDevice(relay);
    await a.engine.start();

    const phases: string[] = [];
    a.engine.subscribe((state) => phases.push(state.phase));

    await a.engine.syncOnce();

    expect(phases).toEqual(['syncing', 'synced']);
  });

  it('non avvia due cicli in parallelo', async () => {
    // Due cicli concorrenti invierebbero gli stessi update due volte.
    const relay = new FakeRelay();
    const a = makeDevice(relay);
    await a.engine.start();
    addExpense(a.store, 1000, 'una sola');

    await Promise.all([a.engine.syncOnce(), a.engine.syncOnce(), a.engine.syncOnce()]);

    expect(relay.storedCount).toBe(1);
  });
});

describe('rete assente e accesso rifiutato', () => {
  it('distingue «non raggiungibile» da «rifiutato»', async () => {
    // Un errore di rete non è un errore del relay: mostrare all'utente il messaggio
    // grezzo di `fetch` non gli dice nulla, mentre «offline» sì — e la UI lo gestisce
    // già. Prima questo stato esisteva nei tipi ma non veniva mai emesso.
    const unreachable: HttpClient = {
      request: () => Promise.reject(new Error('Network request failed')),
    };
    const doc = new Y.Doc();
    const client = new RelayClient('https://relay.test', SHARED_KEYS, unreachable, testRandom);
    const engine = new SyncEngine(doc, client, new MemoryCursorStore(), INERT);

    await engine.start();
    await engine.syncOnce();

    expect(engine.getState().phase).toBe('offline');
  });

  it('ferma il ciclo quando il relay rifiuta l accesso', async () => {
    // Un 403 è definitivo: la chiave non apre quel vault. Prima portava solo il backoff
    // a cinque minuti, e il dispositivo restava a ripetere la stessa richiesta per
    // sempre mostrando uno stato che sembrava in attesa di risolversi.
    const relay = new FakeRelay();
    const clock = frozenSleep();
    const a = makeDevice(relay, SHARED_KEYS, { sleep: clock.sleep });
    await a.engine.start();

    relay.failAllWith = { status: 403 };
    void a.engine.runForever();
    await settle();

    expect(a.engine.getState().phase).toBe('blocked');
    const requests = relay.requests.length;

    a.engine.wake();
    await settle();
    await settle();

    expect(relay.requests.length).toBe(requests);
  });

  it('un 500 resta ritentabile', () => {
    expect(new RelayError(403, 'accesso negato').fatal).toBe(true);
    expect(new RelayError(401, 'non autenticato').fatal).toBe(true);
    // 400 e 413 dipendono dalla richiesta: una diversa può riuscire.
    expect(new RelayError(413, 'troppo grande').fatal).toBe(false);
    expect(new RelayError(500, 'errore server').fatal).toBe(false);
  });
});

describe('ciclo continuo', () => {
  it('resta in attesa finché non lo si sveglia', async () => {
    const relay = new FakeRelay();
    const clock = frozenSleep();
    const a = makeDevice(relay, SHARED_KEYS, { sleep: clock.sleep });
    await a.engine.start();

    void a.engine.runForever();
    await settle();
    const afterFirst = relay.requests.length;
    expect(afterFirst).toBeGreaterThan(0);

    await settle();
    expect(relay.requests.length).toBe(afterFirst);

    a.engine.wake();
    await settle();
    expect(relay.requests.length).toBeGreaterThan(afterFirst);

    a.engine.stop();
  });

  it('una modifica locale accorcia l attesa invece di rimandare al poll', async () => {
    // Senza sonno interrompibile il push immediato non avrebbe effetto: la spesa
    // resterebbe in coda fino alla fine dell'attesa in corso.
    const relay = new FakeRelay();
    const clock = frozenSleep();
    const debounce: { fire: (() => void) | null; delays: number[] } = { fire: null, delays: [] };
    const a = makeDevice(relay, SHARED_KEYS, {
      sleep: clock.sleep,
      debounceMs: 400,
      schedule: (fn, ms) => {
        debounce.fire = fn;
        debounce.delays.push(ms);
        return () => (debounce.fire = null);
      },
    });
    await a.engine.start();

    void a.engine.runForever();
    await settle();
    const beforeWrite = relay.requests.length;

    addExpense(a.store, 100, 'appena creata');
    await settle();
    // Non parte subito: si aspetta il debounce, così una raffica fa una richiesta sola.
    expect(relay.requests.length).toBe(beforeWrite);
    expect(debounce.delays).toEqual([400]);

    debounce.fire?.();
    await settle();

    expect(relay.storedCount).toBe(1);
    a.engine.stop();
  });

  it('una raffica di scritture produce una sola richiesta', async () => {
    const relay = new FakeRelay();
    const clock = frozenSleep();
    const debounce: { fire: (() => void) | null; scheduled: number; cancelled: number } = {
      fire: null,
      scheduled: 0,
      cancelled: 0,
    };
    const a = makeDevice(relay, SHARED_KEYS, {
      sleep: clock.sleep,
      schedule: (fn) => {
        debounce.scheduled++;
        debounce.fire = fn;
        return () => debounce.cancelled++;
      },
    });
    await a.engine.start();

    void a.engine.runForever();
    await settle();
    const postsBefore = relay.requests.filter((r) => r.method === 'POST').length;

    addExpense(a.store, 100, 'una');
    addExpense(a.store, 200, 'due');
    addExpense(a.store, 300, 'tre');

    // Ogni update riparte da capo: tre programmate, due annullate, una che scatta.
    expect(debounce.scheduled).toBe(3);
    expect(debounce.cancelled).toBe(2);

    debounce.fire?.();
    await settle();

    expect(relay.requests.filter((r) => r.method === 'POST').length).toBe(postsBefore + 1);
    expect(relay.storedCount).toBe(3);
    a.engine.stop();
  });

  it('rallenta il poll fuori dalla finestra attiva', async () => {
    const relay = new FakeRelay();
    const clock = frozenSleep();
    let now = 1_000_000;
    const a = makeDevice(relay, SHARED_KEYS, {
      sleep: clock.sleep,
      now: () => now,
      activePollMs: 3_000,
      idlePollMs: 30_000,
      activeWindowMs: 120_000,
    });
    await a.engine.start();

    void a.engine.runForever();
    await settle();
    // L'app si è appena aperta: è un momento attivo.
    expect(clock.waited).toEqual([3_000]);

    now += 200_000;
    a.engine.wake();
    await settle();
    expect(clock.waited).toEqual([3_000, 30_000]);

    // Una modifica locale riporta dentro la finestra attiva.
    addExpense(a.store, 100, 'appena creata');
    a.engine.wake();
    await settle();
    expect(clock.waited).toEqual([3_000, 30_000, 3_000]);

    a.engine.stop();
  });

  it('in background non interroga il relay, e al ritorno riparte subito', async () => {
    const relay = new FakeRelay();
    const clock = frozenSleep();
    const a = makeDevice(relay, SHARED_KEYS, { sleep: clock.sleep });
    await a.engine.start();

    void a.engine.runForever();
    await settle();
    const inForeground = relay.requests.length;

    a.engine.pause();
    a.engine.wake();
    await settle();
    await settle();
    expect(relay.requests.length).toBe(inForeground);

    a.engine.resume();
    await settle();
    expect(relay.requests.length).toBeGreaterThan(inForeground);

    a.engine.stop();
  });

  it('il ritorno in primo piano azzera il backoff', async () => {
    // Dopo qualche errore il backoff arriva a cinque minuti: senza azzerarlo, riaprire
    // l'app con la rete tornata non cambierebbe nulla per parecchio tempo.
    const relay = new FakeRelay();
    const clock = frozenSleep();
    const a = makeDevice(relay, SHARED_KEYS, {
      sleep: clock.sleep,
      initialBackoffMs: 2_000,
    });
    await a.engine.start();
    relay.failAllWith = { status: 500 };

    void a.engine.runForever();
    await settle();
    a.engine.wake();
    await settle();
    a.engine.wake();
    await settle();
    // La prima attesa è già il doppio della base, poi raddoppia ancora.
    expect(clock.waited).toEqual([4_000, 8_000, 16_000]);

    a.engine.resume();
    await settle();

    expect(clock.waited).toEqual([4_000, 8_000, 16_000, 4_000]);
    a.engine.stop();
  });
});

describe('blob non decifrabili', () => {
  it('un buco nel log blocca gli update successivi dello stesso dispositivo', async () => {
    // Comportamento di Yjs, verificato: gli struct che dipendono da un update mancante
    // restano in sospeso. Un blob corrotto non perde una sola spesa — **ferma tutte
    // quelle registrate dopo** da quel dispositivo. È la ragione per cui esiste il
    // recupero tramite snapshot.
    const relay = new FakeRelay();
    const a = makeDevice(relay);
    const b = makeDevice(relay);
    await a.engine.start();
    await b.engine.start();

    addExpense(a.store, 100, 'prima');
    addExpense(a.store, 200, 'seconda');
    addExpense(a.store, 300, 'terza');
    await a.engine.syncOnce();

    relay.corruptAt(1);

    const outcome = await b.engine.syncOnce();

    expect(outcome?.undecryptable).toBe(1);
    // Solo la prima: «seconda» è illeggibile e «terza» resta in attesa di lei.
    expect(b.store.listExpenses()).toHaveLength(1);
    expect(b.store.listExpenses()[0]?.note).toBe('prima');
  });

  it('ripubblica lo stato completo quando rileva corruzione', async () => {
    const relay = new FakeRelay();
    const a = makeDevice(relay);
    const b = makeDevice(relay);
    await a.engine.start();
    await b.engine.start();

    addExpense(a.store, 100, 'prima');
    addExpense(a.store, 200, 'seconda');
    await a.engine.syncOnce();
    relay.corruptAt(1);

    const outcome = await b.engine.syncOnce();

    expect(outcome?.undecryptable).toBe(1);
    expect(outcome?.snapshotPushed).toBe(true);
  });

  it('il vault si ripara quando anche l altro dispositivo ripubblica', async () => {
    // È il meccanismo di auto-riparazione: uno snapshot completo non ha dipendenze
    // mancanti, quindi applicarlo colma il buco.
    const relay = new FakeRelay();
    const a = makeDevice(relay);
    const b = makeDevice(relay);
    await a.engine.start();
    await b.engine.start();

    addExpense(a.store, 100, 'prima');
    addExpense(a.store, 200, 'seconda');
    addExpense(a.store, 300, 'terza');
    await a.engine.syncOnce();
    relay.corruptAt(1);

    await b.engine.syncOnce();
    expect(b.store.listExpenses()).toHaveLength(1);

    // A ripubblica il proprio stato completo.
    await a.engine.pushSnapshot();
    await b.engine.syncOnce();

    // Tutte e tre le spese recuperate, nessuna duplicata.
    expect(b.store.listExpenses()).toHaveLength(3);
    expect(
      b.store
        .listExpenses()
        .map((e) => e.note)
        .sort(),
    ).toEqual(['prima', 'seconda', 'terza']);
  });

  it('avanza il cursore anche se una pagina è interamente corrotta', async () => {
    // Senza avanzare il cursore, quella pagina verrebbe riletta a ogni giro e la
    // sincronizzazione resterebbe bloccata per sempre.
    const relay = new FakeRelay();
    const a = makeDevice(relay);
    const b = makeDevice(relay);
    await a.engine.start();
    await b.engine.start();

    addExpense(a.store, 100, 'unica');
    await a.engine.syncOnce();
    relay.corruptAt(0);

    await b.engine.syncOnce();
    expect(await b.cursors.getCursor()).toBeGreaterThan(0);
  });

  it('non salta gli update validi che seguono una pagina illeggibile', async () => {
    // Il cursore avanzava a `head`, cioè alla fine dell'**intero** log, non della
    // pagina appena letta. Con `hasMore` acceso, tutti gli update validi delle pagine
    // successive sparivano in silenzio — e il ciclo riportava `synced`.
    //
    // Le spese leggibili vengono da un **terzo** dispositivo: se venissero da quello
    // corrotto resterebbero comunque in sospeso per il buco nella sua sequenza, e il
    // test misurerebbe quello invece del cursore.
    const relay = new FakeRelay();
    relay.maxUpdatesPerResponse = 2;
    const a = makeDevice(relay);
    const c = makeDevice(relay);
    const b = makeDevice(relay);
    await a.engine.start();
    await c.engine.start();
    await b.engine.start();

    addExpense(a.store, 100, 'da A una');
    addExpense(a.store, 200, 'da A due');
    await a.engine.syncOnce();
    addExpense(c.store, 300, 'da C una');
    addExpense(c.store, 400, 'da C due');
    await c.engine.syncOnce();
    expect(relay.storedCount).toBe(4);

    // La prima pagina è interamente illeggibile, la seconda no.
    relay.corruptAt(0);
    relay.corruptAt(1);

    const outcome = await b.engine.syncOnce();

    expect(outcome?.undecryptable).toBe(2);
    expect(
      b.store
        .listExpenses()
        .map((e) => e.note)
        .sort(),
    ).toEqual(['da C due', 'da C una']);
  });
});

describe('isolamento fra vault', () => {
  it('un vault diverso non decifra i dati altrui', async () => {
    const relay = new FakeRelay();
    const a = makeDevice(relay);
    await a.engine.start();
    addExpense(a.store, 1000, 'riservata');
    await a.engine.syncOnce();

    // Stesso relay e stesso identificatore di trasporto, ma chiavi diverse.
    const otherKeys = deriveVaultKeys(generateVaultKey(testRandom));
    const intruder = makeDevice(relay, { ...otherKeys, vaultId: SHARED_KEYS.vaultId });
    await intruder.engine.start();

    const outcome = await intruder.engine.syncOnce();

    expect(outcome?.undecryptable).toBeGreaterThan(0);
    expect(intruder.store.listExpenses()).toHaveLength(0);
  });
});
