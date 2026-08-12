import { describe, expect, it } from 'vitest';
import type { Transfer } from '@jutrack/core';
import {
  balanceSnapshot,
  changedWidgets,
  dueForRefresh,
  monthSnapshot,
  parseSnapshot,
  REFRESH_COOLDOWN_MS,
  serializeSnapshot,
  type BalanceSnapshot,
  type WidgetSnapshot,
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

function monthOf(totalCents: number, monthTitle = 'agosto'): WidgetSnapshot['month'] {
  return monthSnapshot({ groupName: 'Casa', totalCents, monthTitle, symbol: '€' });
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

describe('monthSnapshot', () => {
  it('nomina il mese invece di dire «questo mese»', () => {
    // È la frase che il tempo non può smentire: il primo di settembre, un widget fermo a
    // ieri direbbe comunque il vero — «speso in agosto» sopra il totale di agosto.
    expect(monthOf(34050)?.caption).toBe('Speso in agosto');
  });

  it('regge tutti i mesi senza scegliere fra «a» e «ad»', () => {
    expect(monthOf(0, 'gennaio')?.caption).toBe('Speso in gennaio');
    expect(monthOf(0, 'ottobre')?.caption).toBe('Speso in ottobre');
  });

  it('porta l’anno quando la schermata glielo dà', () => {
    // `formatMonthTitle` aggiunge l'anno solo se non è quello in corso: qui non si decide
    // niente, si scrive quello che arriva.
    expect(monthOf(0, 'agosto 2025')?.caption).toBe('Speso in agosto 2025');
  });

  it('mostra un totale a zero come importo, non come assenza', () => {
    // «0,00 €» in un mese appena cominciato è un'informazione; un trattino sarebbe un
    // guasto.
    expect(monthOf(0)?.amount).toBe('0,00 €');
  });

  it('usa il simbolo della valuta scelta nel profilo', () => {
    const snapshot = monthSnapshot({
      groupName: 'Casa',
      totalCents: 34050,
      monthTitle: 'agosto',
      symbol: '£',
    });
    expect(snapshot.amount).toBe('340,50 £');
  });
});

describe('parseSnapshot', () => {
  it('rilegge quello che ha scritto', () => {
    const snapshot = { balance: snapshotOf([transfer(JUJU, IO, 2500)]), month: monthOf(34050) };
    expect(parseSnapshot(serializeSnapshot(snapshot))).toEqual(snapshot);
  });

  it('legge «non lo so» dove non c’è ancora niente', () => {
    expect(parseSnapshot(null)).toEqual({ balance: null, month: null });
  });

  it('non cade su un foglietto illeggibile', () => {
    expect(parseSnapshot('{')).toEqual({ balance: null, month: null });
    expect(parseSnapshot('[]')).toEqual({ balance: null, month: null });
    expect(parseSnapshot('"Casa"')).toEqual({ balance: null, month: null });
  });

  it('scarta un widget a cui manca una delle tre righe', () => {
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

  it('legge il saldo da un foglietto scritto prima che il mese esistesse', () => {
    // È la promessa che lo Step 34 aveva fatto al 35: il campo nuovo entra accanto, e un
    // telefono rimasto indietro continua a disegnare il saldo invece di spegnersi.
    const raw = JSON.stringify({
      balance: { group: 'Casa', amount: '25,00 €', caption: 'Juju ti deve', tone: 'credit' },
    });
    expect(parseSnapshot(raw).balance?.caption).toBe('Juju ti deve');
    expect(parseSnapshot(raw).month).toBeNull();
  });

  it('non lascia che un mese scritto male porti via il saldo', () => {
    const raw = JSON.stringify({
      balance: { group: 'Casa', amount: '25,00 €', caption: 'Juju ti deve', tone: 'credit' },
      month: 'agosto',
    });
    expect(parseSnapshot(raw).balance).not.toBeNull();
    expect(parseSnapshot(raw).month).toBeNull();
  });
});

describe('changedWidgets', () => {
  const empty: WidgetSnapshot = { balance: null, month: null };

  it('non sveglia nessuno quando non è cambiato niente', () => {
    const snapshot = { balance: snapshotOf([transfer(JUJU, IO, 2500)]), month: monthOf(34050) };
    const identical = { balance: snapshotOf([transfer(JUJU, IO, 2500)]), month: monthOf(34050) };
    expect(changedWidgets(snapshot, identical)).toEqual([]);
  });

  it('sveglia il solo mese quando una spesa non tocca il saldo', () => {
    // Una spesa che pago io e tengo per me sposta il totale del mese e non il saldo: è il
    // caso per cui questa funzione risponde «quali» invece di «sì o no».
    const before = { balance: snapshotOf([]), month: monthOf(1000) };
    const after = { balance: snapshotOf([]), month: monthOf(2500) };
    expect(changedWidgets(before, after)).toEqual(['MonthTotal']);
  });

  it('sveglia il solo saldo quando cambia un pareggio', () => {
    // Un pareggio azzera un debito senza aggiungere spese: il totale del mese resta quello.
    const before = { balance: snapshotOf([transfer(JUJU, IO, 2500)]), month: monthOf(1000) };
    const after = { balance: snapshotOf([]), month: monthOf(1000) };
    expect(changedWidgets(before, after)).toEqual(['Balance']);
  });

  it('sveglia entrambi quando cambia il gruppo aperto', () => {
    // Cambiare gruppo non cambia i numeri di nessuno dei due gruppi, ma cambia quale dei due
    // si guarda: se il confronto non lo vedesse, i widget resterebbero sul gruppo di prima.
    const before = { balance: snapshotOf([]), month: monthOf(1000) };
    const after = {
      balance: balanceSnapshot({
        groupName: 'Vacanza',
        transfers: [],
        myMemberId: IO,
        memberCount: 2,
        nameOf,
        symbol: '€',
      }),
      month: monthSnapshot({
        groupName: 'Vacanza',
        totalCents: 1000,
        monthTitle: 'agosto',
        symbol: '€',
      }),
    };
    expect(changedWidgets(before, after)).toEqual(['Balance', 'MonthTotal']);
  });

  it('vede la differenza fra «non lo so» e un numero', () => {
    expect(changedWidgets(empty, { balance: snapshotOf([]), month: monthOf(0) })).toEqual([
      'Balance',
      'MonthTotal',
    ]);
  });
});

describe('dueForRefresh', () => {
  const ORA = 1_760_000_000_000;

  it('parte se non è mai stato fatto un giro', () => {
    expect(dueForRefresh(null, ORA)).toBe(true);
  });

  it('aspetta se il giro è appena stato fatto', () => {
    // È il caso di tutti i giorni: due widget sulla home sono **due** risvegli, e senza
    // questa riga sarebbero due giri di rete identici a distanza di un istante.
    expect(dueForRefresh(String(ORA - 60_000), ORA)).toBe(false);
  });

  it('riparte appena passata la soglia', () => {
    expect(dueForRefresh(String(ORA - REFRESH_COOLDOWN_MS), ORA)).toBe(true);
  });

  it('resta sotto la soglia un istante prima', () => {
    expect(dueForRefresh(String(ORA - REFRESH_COOLDOWN_MS + 1), ORA)).toBe(false);
  });

  it('parte su un valore illeggibile invece di restare fermo per sempre', () => {
    // La direzione dell'errore che costa meno: un giro di troppo una volta sola, invece di
    // widget che non si aggiornano mai e non dicono perché.
    expect(dueForRefresh('ieri', ORA)).toBe(true);
    expect(dueForRefresh('', ORA)).toBe(true);
    expect(dueForRefresh('0', ORA)).toBe(true);
  });

  it('parte anche se l’ultimo giro risulta nel futuro', () => {
    // Capita spostando l'orologio del telefono: aspettare vorrebbe dire widget fermi fino a
    // quando quell'istante arriva davvero.
    expect(dueForRefresh(String(ORA + 3_600_000), ORA)).toBe(true);
  });
});
