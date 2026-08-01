import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { VaultStore, type RandomSource } from '@jutrack/core';
import { seedDefaults } from './seed';

/** Byte prevedibili ma diversi a ogni chiamata: qui servono solo id non collidenti. */
const random: RandomSource = (() => {
  let counter = 0;
  return {
    getRandomBytes: (n) => {
      counter++;
      return Uint8Array.from({ length: n }, (_, i) => (counter * 31 + i) & 0xff);
    },
  };
})();

const makeStore = (): VaultStore => new VaultStore(new Y.Doc(), { random });

describe('seedDefaults', () => {
  it('crea le categorie di default al primo avvio', () => {
    const store = makeStore();
    seedDefaults(store);
    expect(store.listCategories()).toHaveLength(8);
  });

  it('non le ricrea agli avvii successivi', () => {
    const store = makeStore();
    seedDefaults(store);
    seedDefaults(store);
    expect(store.listCategories()).toHaveLength(8);
  });

  it('non semina nulla per chi è entrato nel vault di qualcun altro', () => {
    // È la metà della duplicazione osservata sul campo: il secondo telefono ha il
    // documento vuoto finché non arriva il primo sync, semina le sue otto categorie, e
    // quando i due documenti si uniscono ne risultano sedici.
    const store = makeStore();
    seedDefaults(store, { seedCategories: false });
    expect(store.listCategories()).toHaveLength(0);
  });

  it('non crea alcun membro', () => {
    // Prima ne creava uno chiamato «Io» con un id casuale, su ogni dispositivo: dopo il
    // sync erano due persone diverse, e il calcolo di chi deve quanto all'altro era
    // sbagliato. Ora il membro nasce dal profilo, con il profileId come id.
    const store = makeStore();
    seedDefaults(store);
    expect(store.listMembers()).toHaveLength(0);
  });

  it('due dispositivi che seminano lo stesso vault non raddoppiano le categorie', () => {
    // Il caso reale: A crea il vault e semina, B entra e non semina. Dopo il sync le
    // categorie restano otto.
    const creator = new Y.Doc();
    const joiner = new Y.Doc();
    seedDefaults(new VaultStore(creator, { random }));
    seedDefaults(new VaultStore(joiner, { random }), { seedCategories: false });

    Y.applyUpdate(joiner, Y.encodeStateAsUpdate(creator));
    Y.applyUpdate(creator, Y.encodeStateAsUpdate(joiner));

    expect(new VaultStore(joiner, { random }).listCategories()).toHaveLength(8);
    expect(new VaultStore(creator, { random }).listCategories()).toHaveLength(8);
  });
});
