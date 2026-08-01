/**
 * Compatibilità con Hermes.
 *
 * Hermes — il motore JavaScript di React Native — non fornisce diversi global che
 * esistono in Node e nel browser. Expo ne installa alcuni (`TextDecoder`, `URL`,
 * `structuredClone`) ma **non `TextEncoder`**: vedi `expo/src/winter/runtime.native.ts`.
 *
 * Questo test rimuove quei global e verifica che il core continui a funzionare. Esiste
 * perché la loro assenza ha già causato un crash all'avvio dell'app, con
 * `TextEncoder is not defined` proveniente da `utf8ToBytes` di `@noble/hashes` —
 * invisibile a typecheck, test e bundler, perché in Node quei global ci sono.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import {
  buildSplit,
  deriveVaultKeys,
  exportBackup,
  generateVaultKey,
  importBackup,
  open,
  seal,
  VaultStore,
  type ScryptParams,
} from './index';
import { fixedRandom } from './crypto/testing';

/** Global presenti in Node ma assenti su Hermes. */
const ABSENT_ON_HERMES = ['TextEncoder', 'crypto', 'Buffer'] as const;

const saved = new Map<string, unknown>();
const random = fixedRandom();

beforeEach(() => {
  for (const name of ABSENT_ON_HERMES) {
    if (name in globalThis) {
      saved.set(name, (globalThis as Record<string, unknown>)[name]);
      delete (globalThis as Record<string, unknown>)[name];
    }
  }
});

afterEach(() => {
  for (const [name, value] of saved) {
    (globalThis as Record<string, unknown>)[name] = value;
  }
  saved.clear();
});

describe('senza i global assenti su Hermes', () => {
  it('la simulazione è effettiva: i global sono davvero rimossi', () => {
    // Senza questo controllo tutti i test seguenti passerebbero comunque, e la
    // suite darebbe una falsa garanzia di compatibilità.
    expect(typeof TextEncoder).toBe('undefined');
    expect('crypto' in globalThis).toBe(false);
  });

  it('deriva le chiavi del vault', () => {
    const keys = deriveVaultKeys(generateVaultKey(random));
    expect(keys.vaultId).toMatch(/^[0-9a-f]{32}$/);
    expect(keys.contentKey).toHaveLength(32);
  });

  it('cifra e decifra un blob', () => {
    const keys = deriveVaultKeys(generateVaultKey(random));
    const payload = Uint8Array.from([1, 2, 3, 4, 5]);
    const blob = seal(keys.contentKey, keys.vaultId, payload, random);
    expect(open(keys.contentKey, keys.vaultId, blob)).toEqual(payload);
  });

  it('crea un Y.Doc e ci registra una spesa', () => {
    // `new Y.Doc()` genera il clientID con lib0/random, che su React Native passa
    // dallo shim su expo-crypto configurato in metro.config.js.
    const store = new VaultStore(new Y.Doc(), { random });
    const me = 'membro-a';
    store.addExpense({
      amountCents: 1230,
      date: '2026-08-01',
      note: 'spesa con emoji 🛒 e accenti: caffè',
      paidBy: me,
      split: buildSplit('single', 1230, [me]),
    });
    expect(store.listExpenses()[0]?.amountCents).toBe(1230);
  });

  it('gestisce categorie con emoji e accenti', () => {
    // I nomi delle categorie contengono emoji per impostazione predefinita: se la
    // codifica UTF-8 sbagliasse le coppie surrogate, i byte cambierebbero.
    const store = new VaultStore(new Y.Doc(), { random });
    store.addCategory({ name: 'Caffè ☕', icon: '☕' });
    expect(store.listCategories()[0]?.name).toBe('Caffè ☕');
  });

  it('esporta e reimporta un backup protetto da passphrase', async () => {
    // scrypt riceve la passphrase come byte: è il percorso in cui serviva TextEncoder.
    const fast: ScryptParams = { logN: 12, r: 8, p: 1 };
    const vaultKey = generateVaultKey(random);
    const backup = await exportBackup(vaultKey, 'passphrase con accenti: perché', random, fast);
    expect(await importBackup(backup, 'passphrase con accenti: perché')).toEqual(vaultKey);
  });

  it('due documenti convergono', () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();
    const storeA = new VaultStore(docA, { random });
    const me = 'membro-a';
    storeA.addExpense({
      amountCents: 500,
      date: '2026-08-01',
      paidBy: me,
      split: buildSplit('single', 500, [me]),
    });

    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));
    expect(new VaultStore(docB, { random }).listExpenses()).toHaveLength(1);
  });
});
