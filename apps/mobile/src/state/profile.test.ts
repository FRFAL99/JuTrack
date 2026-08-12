import { describe, expect, it } from 'vitest';
import type { RandomSource } from '@jutrack/core';
import { MemoryKeyValueStore } from '@/platform/app-meta';
import {
  createProfile,
  loadProfile,
  MAX_PROFILE_NAME,
  normalizeProfileName,
  saveProfile,
  type Profile,
} from './profile';

/**
 * Byte prevedibili ma **diversi a ogni chiamata**.
 *
 * Costanti farebbero passare un test che si aspetta due profili distinti pur avendoli
 * generati identici. Qui non serve entropia vera: la casualità della sorgente reale è
 * verificata nel core.
 */
const random: RandomSource = (() => {
  let counter = 0;
  return {
    getRandomBytes: (n) => {
      counter++;
      return Uint8Array.from({ length: n }, (_, i) => (counter * 31 + i) & 0xff);
    },
  };
})();

describe('normalizeProfileName', () => {
  it('toglie gli spazi di troppo', () => {
    expect(normalizeProfileName('  Francesco   Fallavena ')).toBe('Francesco Fallavena');
  });

  it('rifiuta un nome che non contiene nulla', () => {
    expect(normalizeProfileName('')).toBeNull();
    expect(normalizeProfileName('   ')).toBeNull();
  });

  it('taglia i nomi troppo lunghi invece di rifiutarli', () => {
    // Rifiutare costringerebbe a cancellare a mano; tagliare lascia un nome usabile.
    const long = 'a'.repeat(MAX_PROFILE_NAME + 10);
    expect(normalizeProfileName(long)).toHaveLength(MAX_PROFILE_NAME);
  });
});

describe('createProfile', () => {
  it('genera un identificatore diverso per ogni profilo', () => {
    // Due persone non devono mai collidere: gli id sono casuali e generati una volta
    // sola, non derivati dal nome — due «Francesco» restano due persone diverse.
    const a = createProfile('Francesco', '#3B5BDB', random);
    const b = createProfile('Francesco', '#3B5BDB', random);
    expect(a.profileId).not.toBe(b.profileId);
    expect(a.profileId).toMatch(/^[0-9a-f]{32}$/);
  });

  it('non lascia trapelare il nome nell identificatore', () => {
    // `profileId` è **opaco**: è ciò che permetterà di agganciare un provider
    // d'identità senza cambiare la chiave con cui i membri sono scritti nei vault.
    const profile = createProfile('Francesco', '#3B5BDB', random);
    expect(profile.profileId.toLowerCase()).not.toContain('francesco');
  });

  it('normalizza il nome e rifiuta quello vuoto', () => {
    expect(createProfile('  Giulia  ', '#C2255C', random).name).toBe('Giulia');
    expect(() => createProfile('   ', '#C2255C', random)).toThrow(/non può essere vuoto/);
  });
});

describe('persistenza del profilo', () => {
  it('rilegge quello che ha scritto', async () => {
    const meta = new MemoryKeyValueStore();
    const profile = createProfile('Francesco', '#3B5BDB', random);
    await saveProfile(meta, profile);

    expect(await loadProfile(meta)).toEqual(profile);
  });

  it('conserva il campo identity, previsto ma non ancora usato', async () => {
    const meta = new MemoryKeyValueStore();
    const profile = createProfile('Francesco', '#3B5BDB', random, {
      provider: 'google',
      subject: 'sub-123',
    });
    await saveProfile(meta, profile);

    expect((await loadProfile(meta))?.identity).toEqual({ provider: 'google', subject: 'sub-123' });
  });

  it('conserva la valuta scelta', async () => {
    const meta = new MemoryKeyValueStore();
    const profile: Profile = { ...createProfile('Francesco', '#3B5BDB', random), currency: 'CHF' };
    await saveProfile(meta, profile);

    expect((await loadProfile(meta))?.currency).toBe('CHF');
  });

  it.each([
    ['manca', '{"profileId":"abc","name":"X","color":"#000"}'],
    ['è vuota', '{"profileId":"abc","name":"X","color":"#000","currency":""}'],
    ['non è una stringa', '{"profileId":"abc","name":"X","color":"#000","currency":42}'],
  ])('torna al default, senza perdere il profilo, se la valuta %s', async (_case, raw) => {
    // A differenza di `profileId`, una valuta illeggibile non manda all'onboarding: è una
    // preferenza di formattazione, e rifare l'onboarding per un simbolo costerebbe molto
    // più di quanto vale. Il profilo si carica, il campo resta assente, vale l'euro.
    const meta = new MemoryKeyValueStore();
    await meta.set('profile', raw);

    const loaded = await loadProfile(meta);
    expect(loaded).not.toBeNull();
    expect(loaded?.currency).toBeUndefined();
  });

  it('restituisce null quando non c è ancora nulla', async () => {
    expect(await loadProfile(new MemoryKeyValueStore())).toBeNull();
  });

  it.each([
    ['non è JSON', 'non-json'],
    ['non è un oggetto', '"stringa"'],
    ['ha profileId vuoto', '{"profileId":"","name":"X","color":"#000"}'],
    ['non ha profileId', '{"name":"X","color":"#000"}'],
    ['non ha nome', '{"profileId":"abc","color":"#000"}'],
  ])('tratta come assente un profilo che %s', async (_case, raw) => {
    // Meglio rifare l'onboarding che proseguire con un profileId vuoto: quello
    // scriverebbe un membro senza id dentro il vault, e il danno si propagherebbe
    // all'altro telefono senza potersi disfare.
    const meta = new MemoryKeyValueStore();
    await meta.set('profile', raw);
    expect(await loadProfile(meta)).toBeNull();
  });
});

describe('forma del profilo', () => {
  it('non contiene materiale crittografico', () => {
    // Il profilo vive in SQLite, non in SecureStore: è la ragione per cui deve restare
    // fatto solo di dati banali. Se un giorno ci finisse una chiave, questo test
    // dovrebbe fallire prima che ci finisca in produzione.
    const profile: Profile = createProfile('Francesco', '#3B5BDB', random);
    expect(Object.keys(profile).sort()).toEqual(['color', 'name', 'profileId']);
  });
});
