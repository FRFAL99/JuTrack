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

const ME = 'membro-a';
const YOU = 'membro-b';

/** Un dispositivo: documento, store applicativo e motore di sync sullo stesso relay. */
function makeDevice(relay: FakeRelay, keys = SHARED_KEYS) {
  const doc = new Y.Doc();
  const store = new VaultStore(doc, { random: testRandom });
  const cursors = new MemoryCursorStore();
  const client = new RelayClient('https://relay.test', keys, relay, testRandom);
  const engine = new SyncEngine(doc, client, cursors, { sleep: async () => undefined });
  return { doc, store, engine, cursors };
}

const SHARED_KEYS = deriveVaultKeys(generateVaultKey(testRandom));

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

    const first = new SyncEngine(doc, client, cursors, { sleep: async () => undefined });
    await first.start();
    relay.failAllWith = { status: 500 };
    addExpense(store, 1000, 'prima del riavvio');
    await first.syncOnce();
    first.stop();
    expect(first.pendingCount).toBe(1);

    // Nuovo motore sullo stesso store persistito: la coda deve sopravvivere.
    const second = new SyncEngine(doc, client, cursors, { sleep: async () => undefined });
    await second.start();
    expect(second.pendingCount).toBe(1);

    relay.failAllWith = null;
    await second.syncOnce();
    expect(relay.storedCount).toBe(1);
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
