import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { VaultStore } from '@jutrack/core';
import { resolveMyMemberId } from '@/state/membership';

/**
 * La funzione del bug dei membri duplicati.
 *
 * Alla prima prova con due telefoni veri comparivano quattro membri invece di due, e il
 * saldo era di conseguenza sbagliato: ogni dispositivo si inventava un id casuale per sé
 * stesso. Adesso il membro nasce dal profilo — ed è questa funzione a decidere quando,
 * invece, la domanda va lasciata all'utente.
 */
describe('chi sono io in questo gruppo', () => {
  const PROFILE = 'profilo-mio';

  function storeWith(memberIds: string[]): VaultStore {
    const store = new VaultStore(new Y.Doc(), {
      random: { getRandomBytes: () => new Uint8Array(16) },
    });
    for (const id of memberIds) store.setMember(id, { name: id });
    return store;
  }

  it('in un gruppo creato qui sono il mio profilo', () => {
    expect(
      resolveMyMemberId({
        store: storeWith([]),
        origin: 'created',
        linkedMemberId: null,
        profileId: PROFILE,
      }),
    ).toBe(PROFILE);
  });

  it('entrando in un gruppo dove il mio profilo c’è già, sono quello', () => {
    // La domanda è già stata risposta da un avvio precedente: rifarla ogni volta
    // sarebbe un dialogo a ogni apertura del gruppo.
    expect(
      resolveMyMemberId({
        store: storeWith([PROFILE, 'altro']),
        origin: 'joined',
        linkedMemberId: null,
        profileId: PROFILE,
      }),
    ).toBe(PROFILE);
  });

  it('entrando in un gruppo altrui la domanda resta aperta', () => {
    // È il caso che conta: potrei essere nuovo, oppure essere già dentro con un altro
    // nome perché ho ripristinato il backup della chiave. Scegliere da soli qui è ciò
    // che produceva due membri al posto di uno.
    expect(
      resolveMyMemberId({
        store: storeWith(['qualcun-altro']),
        origin: 'joined',
        linkedMemberId: null,
        profileId: PROFILE,
      }),
    ).toBeNull();
  });

  it('un ricollegamento già registrato vince su tutto', () => {
    // È una risposta che l'utente ha dato: non va scavalcata dal profilo, altrimenti chi
    // ha ripristinato un backup ricomparirebbe come una seconda persona accanto a sé.
    expect(
      resolveMyMemberId({
        store: storeWith([PROFILE, 'vecchio-me']),
        origin: 'joined',
        linkedMemberId: 'vecchio-me',
        profileId: PROFILE,
      }),
    ).toBe('vecchio-me');
  });
});
