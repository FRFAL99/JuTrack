import { describe, expect, it } from 'vitest';
import type { RandomSource } from '@jutrack/core';
import { MemoryKeyValueStore } from '@/platform/app-meta';
import {
  createProfile,
  loadMyMemberId,
  loadProfile,
  loadVaultOrigin,
  markVaultOrigin,
  MAX_PROFILE_NAME,
  normalizeProfileName,
  saveProfile,
  setMyMemberId,
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

const VAULT = 'vault-di-prova';

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

describe('il mio membro in un vault', () => {
  it('di norma è il profileId', async () => {
    const meta = new MemoryKeyValueStore();
    expect(await loadMyMemberId(meta, VAULT, 'profilo-1')).toBe('profilo-1');
  });

  it('può essere ricollegato a un membro già esistente', async () => {
    // Serve a chi ripristina il backup della chiave su un telefono nuovo: il profilo
    // è nuovo, ma dentro quel vault è già qualcuno.
    const meta = new MemoryKeyValueStore();
    await setMyMemberId(meta, VAULT, 'membro-vecchio');
    expect(await loadMyMemberId(meta, VAULT, 'profilo-1')).toBe('membro-vecchio');
  });

  it('resta separato fra vault diversi', async () => {
    const meta = new MemoryKeyValueStore();
    await setMyMemberId(meta, VAULT, 'membro-vecchio');
    expect(await loadMyMemberId(meta, 'altro-vault', 'profilo-1')).toBe('profilo-1');
  });
});

describe('origine del vault', () => {
  it('distingue chi ha creato da chi è entrato', async () => {
    const meta = new MemoryKeyValueStore();
    await markVaultOrigin(meta, VAULT, 'created');
    await markVaultOrigin(meta, 'altro-vault', 'joined');

    expect(await loadVaultOrigin(meta, VAULT)).toBe('created');
    expect(await loadVaultOrigin(meta, 'altro-vault')).toBe('joined');
  });

  it('restituisce null se non risulta nulla', async () => {
    // È il caso di chi usa l'app senza vault: nel dubbio si semina, perché un tracker
    // locale senza categorie sarebbe inutilizzabile.
    expect(await loadVaultOrigin(new MemoryKeyValueStore(), VAULT)).toBeNull();
  });

  it('ignora un valore che non riconosce', async () => {
    const meta = new MemoryKeyValueStore();
    await meta.set(`vault_origin:${VAULT}`, 'qualcosaltro');
    expect(await loadVaultOrigin(meta, VAULT)).toBeNull();
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
