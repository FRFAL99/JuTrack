import { describe, expect, it } from 'vitest';
import type { Transfer } from '@jutrack/core';
import { describeMyBalance } from './balance-line';

const IO = 'membro-io';
const JUJU = 'membro-juju';
const TERZO = 'membro-terzo';

const NAMES: Record<string, string> = { [IO]: 'Io', [JUJU]: 'Juju', [TERZO]: 'Bea' };
const nameOf = (id: string): string => NAMES[id] ?? 'qualcuno';

function transfer(fromMember: string, toMember: string, amountCents: number): Transfer {
  return { fromMember, toMember, amountCents };
}

describe('describeMyBalance', () => {
  it('dice chi mi deve, quando è una persona sola', () => {
    const line = describeMyBalance([transfer(JUJU, IO, 2500)], IO, nameOf);
    expect(line.text).toBe('Juju ti deve 25,00 €');
    expect(line.tone).toBe('credit');
  });

  it('dice a chi devo, quando è una persona sola', () => {
    const line = describeMyBalance([transfer(IO, JUJU, 2500)], IO, nameOf);
    expect(line.text).toBe('Devi 25,00 € a Juju');
    expect(line.tone).toBe('debt');
  });

  it('somma più creditori senza elencarli', () => {
    // La card ha una riga: elencare due nomi la farebbe andare a capo, e il dettaglio
    // sta nei Grafici.
    const line = describeMyBalance(
      [transfer(JUJU, IO, 2500), transfer(TERZO, IO, 1000)],
      IO,
      nameOf,
    );
    expect(line.text).toBe('In 2 ti devono 35,00 €');
    expect(line.tone).toBe('credit');
  });

  it('somma più debitori senza elencarli', () => {
    const line = describeMyBalance(
      [transfer(IO, JUJU, 2500), transfer(IO, TERZO, 1500)],
      IO,
      nameOf,
    );
    expect(line.text).toBe('Devi 40,00 € a 2 persone');
    expect(line.tone).toBe('debt');
  });

  it('dice «Siete pari» senza trasferimenti', () => {
    const line = describeMyBalance([], IO, nameOf);
    expect(line.text).toBe('Siete pari');
    expect(line.tone).toBe('even');
  });

  it('ignora i debiti fra altre due persone', () => {
    // È la proprietà che rende questa riga «mia»: un debito fra Juju e Bea non mi
    // riguarda, e mostrarlo qui farebbe credere di dover pagare qualcosa.
    const line = describeMyBalance([transfer(JUJU, TERZO, 2500)], IO, nameOf);
    expect(line.text).toBe('Siete pari');
    expect(line.tone).toBe('even');
  });

  it('ripiega su «qualcuno» per un membro che non si sa nominare', () => {
    // Capita con una spesa che riferisce un membro mai sincronizzato: meglio una frase
    // incompleta che una schermata che solleva.
    const line = describeMyBalance([transfer('membro-ignoto', IO, 500)], IO, nameOf);
    expect(line.text).toBe('qualcuno ti deve 5,00 €');
  });

  it('preferisce il credito se per un incoerenza ci fossero entrambi', () => {
    // `simplifyDebts` non lo produce — un membro sta da un lato solo del saldo netto —
    // ma questa funzione non ha bisogno di fidarsi per dare una risposta sensata.
    const line = describeMyBalance(
      [transfer(JUJU, IO, 2500), transfer(IO, TERZO, 500)],
      IO,
      nameOf,
    );
    expect(line.tone).toBe('credit');
  });
});
