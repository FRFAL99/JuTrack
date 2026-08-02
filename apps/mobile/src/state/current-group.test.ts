import { describe, expect, it } from 'vitest';
import { chooseCurrentGroup, nextAfterLeave } from './current-group';
import type { GroupRecord } from './groups';

/** Un record di registro con solo i campi che queste due funzioni guardano. */
function group(vaultId: string, name = vaultId): GroupRecord {
  return {
    vaultId,
    name,
    origin: 'created',
    myMemberId: null,
    createdAt: '2026-08-02T00:00:00.000Z',
    lastOpenedAt: '2026-08-02T00:00:00.000Z',
  };
}

describe('chooseCurrentGroup', () => {
  it('senza gruppi non ne apre nessuno', () => {
    // Il caso nuovo dello Step 21: prima qui ne veniva creato uno d'ufficio.
    expect(chooseCurrentGroup([], null)).toBeNull();
    expect(chooseCurrentGroup([], 'un-vault-che-non-c-e-piu')).toBeNull();
  });

  it('riapre il gruppo ricordato, anche se non è il primo', () => {
    const list = [group('a'), group('b'), group('c')];
    expect(chooseCurrentGroup(list, 'c')).toBe('c');
  });

  it('se il gruppo ricordato non c’è più apre il primo della lista', () => {
    // Regressione del gruppo abbandonato: senza questo ramo il gruppo corrente restava un
    // id senza riga, e l'app si fermava sul caricamento fino al riavvio.
    const list = [group('a'), group('b')];
    expect(chooseCurrentGroup(list, 'sparito')).toBe('a');
  });

  it('senza nulla di ricordato, ma con dei gruppi, apre il primo', () => {
    // **È il caso che protegge chi ha già dei dati.** Un telefono aggiornato allo Step 21
    // con «Le mie spese» già dentro deve aprirlo come sempre: la modifica riguarda solo il
    // ramo della lista vuota, e qui lo si fissa.
    const list = [group('le-mie-spese'), group('casa')];
    expect(chooseCurrentGroup(list, null)).toBe('le-mie-spese');
  });
});

describe('nextAfterLeave', () => {
  it('uscendo dall’unico gruppo non ne resta nessuno', () => {
    // Prima dello Step 21 qui ne nasceva uno vuoto: ora si resta senza, ed è uno stato
    // che l'app sa disegnare.
    expect(nextAfterLeave([], 'a')).toBeNull();
    expect(nextAfterLeave([group('a')], 'a')).toBeNull();
  });

  it('con altri gruppi apre il primo dei rimasti', () => {
    expect(nextAfterLeave([group('b'), group('c')], 'a')).toBe('b');
  });

  it('non riapre il gruppo appena lasciato', () => {
    // Se il chiamante rilegge il registro prima della cancellazione, il gruppo lasciato è
    // ancora in lista: riaprirlo significherebbe rimontare il motore su tabelle appena
    // eliminate.
    expect(nextAfterLeave([group('a'), group('b')], 'a')).toBe('b');
  });
});
