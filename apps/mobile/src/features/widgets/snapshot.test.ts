import { describe, expect, it } from 'vitest';
import type { Transfer } from '@jutrack/core';
import {
  balanceSnapshot,
  parseSnapshot,
  sameSnapshot,
  serializeSnapshot,
  type BalanceSnapshot,
} from './snapshot';

const IO = 'membro-io';
const JUJU = 'membro-juju';
const TERZO = 'membro-terzo';

const NAMES: Record<string, string> = { [IO]: 'Io', [JUJU]: 'Juju', [TERZO]: 'Bea' };
const nameOf = (id: string): string => NAMES[id] ?? 'qualcuno';

function transfer(fromMember: string, toMember: string, amountCents: number): Transfer {
  return { fromMember, toMember, amountCents };
}

function snapshotOf(transfers: Transfer[], memberCount = 2): BalanceSnapshot {
  return balanceSnapshot({
    groupName: 'Casa',
    transfers,
    myMemberId: IO,
    memberCount,
    nameOf,
    symbol: '€',
  });
}

describe('balanceSnapshot', () => {
  it('mette l’importo nella riga grande e il resto nella didascalia', () => {
    // È la differenza con `describeMyBalance`, che scrive «Juju ti deve 25,00 €» in una riga
    // sola: qui il numero è la riga grande, quindi non può ricomparire anche sotto.
    const snapshot = snapshotOf([transfer(JUJU, IO, 2500)]);
    expect(snapshot.amount).toBe('25,00 €');
    expect(snapshot.caption).toBe('Juju ti deve');
    expect(snapshot.tone).toBe('credit');
  });

  it('dice a chi devo, quando è una persona sola', () => {
    const snapshot = snapshotOf([transfer(IO, JUJU, 2500)]);
    expect(snapshot.amount).toBe('25,00 €');
    expect(snapshot.caption).toBe('Devi a Juju');
    expect(snapshot.tone).toBe('debt');
  });

  it('somma più controparti senza elencarle', () => {
    const snapshot = snapshotOf([transfer(JUJU, IO, 2500), transfer(TERZO, IO, 1000)], 3);
    expect(snapshot.amount).toBe('35,00 €');
    expect(snapshot.caption).toBe('In 2 ti devono');
  });

  it('dice «Siete pari» con un importo a zero, non con un trattino', () => {
    // Il widget ha una riga grande e quella riga è sempre denaro: lasciarla vuota quando i
    // conti tornano la farebbe sembrare in attesa di caricare.
    const snapshot = snapshotOf([]);
    expect(snapshot.amount).toBe('0,00 €');
    expect(snapshot.caption).toBe('Siete pari');
    expect(snapshot.tone).toBe('even');
  });

  it('da solo in un gruppo non si è pari con nessuno', () => {
    // La card sulla home nasconde il saldo quando il membro è uno solo; il widget non ha
    // niente da mostrare al suo posto, e «Siete pari» parlerebbe di gente che non c'è.
    const snapshot = snapshotOf([], 1);
    expect(snapshot.caption).toBe('Solo tu in questo gruppo');
    expect(snapshot.tone).toBe('even');
  });

  it('usa il simbolo della valuta scelta nel profilo', () => {
    // Il task headless non ha il profilo: se il simbolo non entrasse qui, non entrerebbe
    // da nessuna parte.
    const snapshot = balanceSnapshot({
      groupName: 'Casa',
      transfers: [transfer(JUJU, IO, 2500)],
      myMemberId: IO,
      memberCount: 2,
      nameOf,
      symbol: '£',
    });
    expect(snapshot.amount).toBe('25,00 £');
  });

  it('porta con sé il nome del gruppo aperto', () => {
    expect(snapshotOf([]).group).toBe('Casa');
  });
});

describe('parseSnapshot', () => {
  it('rilegge quello che ha scritto', () => {
    const snapshot = { balance: snapshotOf([transfer(JUJU, IO, 2500)]) };
    expect(parseSnapshot(serializeSnapshot(snapshot))).toEqual(snapshot);
  });

  it('legge «non lo so» dove non c’è ancora niente', () => {
    expect(parseSnapshot(null)).toEqual({ balance: null });
  });

  it('non cade su un foglietto illeggibile', () => {
    expect(parseSnapshot('{')).toEqual({ balance: null });
    expect(parseSnapshot('[]')).toEqual({ balance: null });
    expect(parseSnapshot('"Casa"')).toEqual({ balance: null });
  });

  it('scarta un saldo a cui manca una delle tre righe', () => {
    // Mezza riga disegnata si legge come un guasto; «apri l'app» si legge come un'attesa.
    const raw = JSON.stringify({ balance: { group: 'Casa', amount: '25,00 €' } });
    expect(parseSnapshot(raw).balance).toBeNull();
  });

  it('ripiega sul neutro se il segno non si capisce, invece di buttare il saldo', () => {
    // Il segno decide un colore, le tre stringhe decidono il contenuto: perdere il colore
    // costa molto meno che perdere il numero.
    const raw = JSON.stringify({
      balance: { group: 'Casa', amount: '25,00 €', caption: 'Juju ti deve', tone: 'rosso' },
    });
    expect(parseSnapshot(raw).balance?.tone).toBe('even');
    expect(parseSnapshot(raw).balance?.amount).toBe('25,00 €');
  });

  it('legge il saldo anche da un foglietto con campi che non conosce', () => {
    // Lo Step 35 ne aggiungerà uno accanto: un telefono rimasto indietro deve continuare a
    // disegnare il saldo, non a spegnersi perché è comparsa una chiave in più.
    const raw = JSON.stringify({
      balance: { group: 'Casa', amount: '25,00 €', caption: 'Juju ti deve', tone: 'credit' },
      month: { total: '120,00 €' },
    });
    expect(parseSnapshot(raw).balance?.caption).toBe('Juju ti deve');
  });
});

describe('sameSnapshot', () => {
  it('riconosce due foglietti identici, e non sveglia il widget', () => {
    const a = { balance: snapshotOf([transfer(JUJU, IO, 2500)]) };
    const b = { balance: snapshotOf([transfer(JUJU, IO, 2500)]) };
    expect(sameSnapshot(a, b)).toBe(true);
  });

  it('vede la differenza quando cambia il saldo', () => {
    const a = { balance: snapshotOf([transfer(JUJU, IO, 2500)]) };
    const b = { balance: snapshotOf([transfer(JUJU, IO, 3000)]) };
    expect(sameSnapshot(a, b)).toBe(false);
  });

  it('vede la differenza quando cambia il gruppo aperto', () => {
    // Cambiare gruppo non cambia i numeri di nessuno dei due, ma cambia quale dei due si
    // guarda: se questo confronto non lo vedesse, il widget resterebbe sul gruppo di prima.
    const a = { balance: snapshotOf([]) };
    const b = {
      balance: balanceSnapshot({
        groupName: 'Vacanza',
        transfers: [],
        myMemberId: IO,
        memberCount: 2,
        nameOf,
        symbol: '€',
      }),
    };
    expect(sameSnapshot(a, b)).toBe(false);
  });

  it('vede la differenza fra «non lo so» e un saldo', () => {
    expect(sameSnapshot({ balance: null }, { balance: snapshotOf([]) })).toBe(false);
  });
});
