import { describe, expect, it } from 'vitest';
import type { Expense, Member, Settlement } from '@jutrack/core';
import { composeSnapshot } from './compose';

const IO = 'membro-io';
const JUJU = 'membro-juju';

function member(id: string, name: string): Member {
  return { id, name, color: '#000000' };
}

/** Una spesa pagata da uno e divisa a metà, che è il caso di cui i widget parlano. */
function shared(amountCents: number, paidBy: string, date = '2026-08-10'): Expense {
  const half = amountCents / 2;
  return {
    id: `spesa-${amountCents}-${paidBy}-${date}`,
    amountCents,
    currency: 'EUR',
    date,
    categoryId: null,
    note: '',
    store: '',
    tags: [],
    paidBy,
    split: { mode: 'equal', shares: { [IO]: half, [JUJU]: half } },
    createdAt: `${date}T10:00:00.000Z`,
    updatedAt: `${date}T10:00:00.000Z`,
    deletedAt: null,
  };
}

const MEMBERS = [member(IO, 'Io'), member(JUJU, 'Juju')];
const NO_SETTLEMENTS: Settlement[] = [];

/** Un giorno d'agosto abbastanza avanti da far comparire il ritmo. */
const OGGI = '2026-08-20';

function compose(args: {
  expenses: Expense[];
  monthExpenses?: Expense[];
  members?: Member[];
  today?: string;
}) {
  return composeSnapshot({
    groupName: 'Casa',
    vaultId: 'vault-casa',
    expenses: args.expenses,
    monthExpenses: args.monthExpenses ?? args.expenses,
    settlements: NO_SETTLEMENTS,
    members: args.members ?? MEMBERS,
    myMemberId: IO,
    monthTitle: 'agosto',
    symbol: '€',
    today: args.today ?? OGGI,
  });
}

describe('composeSnapshot', () => {
  // È il conto che l'app e il task headless devono fare **uguale**: verificarlo qui vale per
  // tutti e due i chiamanti, ed è la ragione per cui questa funzione esiste.

  it('riempie tutti e due i widget in un colpo solo', () => {
    const snapshot = compose({ expenses: [shared(2000, IO)] });
    expect(snapshot.balance).not.toBeNull();
    expect(snapshot.month).not.toBeNull();
  });

  it('dice che mi devono la metà di quello che ho anticipato', () => {
    const snapshot = compose({ expenses: [shared(2000, IO)] });
    expect(snapshot.balance?.amount).toBe('10,00 €');
    expect(snapshot.balance?.caption).toBe('Juju ti deve');
    expect(snapshot.balance?.tone).toBe('credit');
  });

  it('conta nel totale del mese quello che ha pagato chiunque', () => {
    // Il totale è del gruppo e non la mia quota: 20 + 10 fanno 30, anche se dieci li ha
    // anticipati Juju.
    const snapshot = compose({ expenses: [shared(2000, IO), shared(1000, JUJU)] });
    expect(snapshot.month?.amount).toBe('30,00 €');
    expect(snapshot.month?.caption).toBe('Speso in agosto');
  });

  it('conta il saldo su tutta la storia e il totale sul solo mese', () => {
    // È la differenza fra i due numeri, e l'unico modo di sbagliarla è passare la stessa
    // lista a entrambi: il calendario azzera un totale mensile, non un debito.
    const luglio = shared(4000, IO, '2026-07-02');
    const agosto = shared(2000, IO, '2026-08-10');
    const snapshot = compose({ expenses: [luglio, agosto], monthExpenses: [agosto] });
    expect(snapshot.balance?.amount).toBe('30,00 €'); // metà di 60,00, su tutta la storia
    expect(snapshot.month?.amount).toBe('20,00 €'); // il solo agosto
  });

  it('porta il nome del gruppo su entrambi i widget', () => {
    const snapshot = compose({ expenses: [] });
    expect(snapshot.balance?.group).toBe('Casa');
    expect(snapshot.month?.group).toBe('Casa');
  });

  it('regge un gruppo senza spese', () => {
    const snapshot = compose({ expenses: [] });
    expect(snapshot.balance?.caption).toBe('Siete pari');
    expect(snapshot.month?.amount).toBe('0,00 €');
  });

  it('regge un gruppo di una persona sola', () => {
    // Il task headless lo incontra come lo incontra l'app: il saldo non ha controparti, e il
    // widget che serve a quella persona è il totale del mese.
    const snapshot = compose({ expenses: [], members: [member(IO, 'Io')] });
    expect(snapshot.balance?.caption).toBe('Solo tu in questo gruppo');
  });
});

describe('la striscia degli ultimi giorni', () => {
  // Decisione 3 del piano v10: si calcola **nell'app** e finisce nel foglietto come tracciato,
  // perché il task headless che disegna non ha le spese — ha solo il foglietto.

  it('esce come tracciato, senza colore e senza <svg> attorno', () => {
    // Il colore non può stare qui: Android sceglie il tema **quando disegna**, che può essere
    // ore dopo. Se un giorno questo tracciato arrivasse colorato, il widget mostrerebbe il
    // tema di ieri per metà delle volte in cui viene guardato.
    const snapshot = compose({ expenses: [shared(2000, IO, '2026-08-19')] });
    expect(snapshot.month?.sparkPath).toMatch(/^M[\d.,\sL-]+$/);
    expect(snapshot.month?.sparkPath).not.toContain('<svg');
    expect(snapshot.month?.sparkPath).not.toContain('#');
  });

  it('copre quattordici giorni, uno per punto', () => {
    const snapshot = compose({ expenses: [shared(2000, IO, '2026-08-19')] });
    // Un `M` e tredici `L`: i giorni vuoti ci sono comunque, perché ometterli comprimerebbe
    // l'asse del tempo e due punti affiancati sembrerebbero giorni consecutivi.
    expect(snapshot.month?.sparkPath?.match(/[ML]/g)).toHaveLength(14);
  });

  it('non c’è quando non si è speso niente', () => {
    // Un'area alta zero è un trattino sul fondo, e si legge come un grafico rotto invece che
    // come una settimana tranquilla.
    expect(compose({ expenses: [] }).month?.sparkPath).toBeUndefined();
  });

  it('non c’è quando le spese sono tutte fuori dalla finestra', () => {
    // Il saldo le conta — un debito non lo azzera il calendario — ma la striscia parla degli
    // ultimi quattordici giorni e basta.
    const snapshot = compose({ expenses: [shared(2000, IO, '2026-07-02')] });
    expect(snapshot.balance?.amount).toBe('10,00 €');
    expect(snapshot.month?.sparkPath).toBeUndefined();
  });

  it('si scala sul massimo del periodo: il giorno più caro tocca il bordo alto', () => {
    // Il fondoscala è il massimo osservato e non uno zero fisso: una striscia dice il
    // **ritmo**, e con un fondoscala fisso due settimane da pochi euro darebbero una riga
    // schiacciata sul fondo.
    const snapshot = compose({
      expenses: [shared(2000, IO, '2026-08-19'), shared(1000, IO, '2026-08-18')],
    });
    // In SVG la y cresce verso il basso: il giorno più caro ha la y più piccola, cioè zero.
    expect(snapshot.month?.sparkPath).toContain(',0');
  });
});

describe('il ritmo del mese', () => {
  it('proietta il totale a fine mese, arrotondato all’euro', () => {
    // 60,00 € in venti giorni fanno 3,00 € al giorno, che per trentuno giorni d'agosto fanno
    // 93,00 €. La tilde nella frase dice che è una moltiplicazione, non una previsione.
    const snapshot = compose({
      expenses: [shared(4000, IO, '2026-08-10'), shared(2000, IO, '2026-08-19')],
    });
    expect(snapshot.month?.pace).toBe('Di questo passo, ~93,00 € a fine mese');
  });

  it('non c’è nei primi giorni del mese', () => {
    // Il 1° la proiezione moltiplica per trentuno quello che si è speso in un giorno solo, e
    // una spesa grossa fatta il primo darebbe un numero enorme e falso — proprio quando non
    // si ha ancora nessun altro dato per non crederci.
    const snapshot = compose({
      expenses: [shared(20000, IO, '2026-08-01')],
      today: '2026-08-01',
    });
    expect(snapshot.month?.pace).toBeUndefined();
  });

  it('non c’è l’ultimo giorno del mese, quando non c’è più niente da proiettare', () => {
    const snapshot = compose({
      expenses: [shared(2000, IO, '2026-08-19')],
      today: '2026-08-31',
    });
    expect(snapshot.month?.pace).toBeUndefined();
  });

  it('non c’è quando non si è speso niente', () => {
    expect(compose({ expenses: [] }).month?.pace).toBeUndefined();
  });
});

describe('i campi nuovi non toccano quelli di prima', () => {
  it('non dà al saldo la striscia né il ritmo', () => {
    // Decisione 2: i campi nuovi sono **aggiunte**, e ciascuna solo dove ha senso. Il saldo
    // ha preso l'identificativo del gruppo (Step 72, per il «+») e nient'altro: non ha una
    // serie storica da cui ricavare una striscia, e un ritmo di un saldo non vuol dire nulla.
    const snapshot = compose({ expenses: [shared(2000, IO, '2026-08-19')] });
    expect(Object.keys(snapshot.balance ?? {}).sort()).toEqual([
      'amount',
      'caption',
      'group',
      'tone',
      'vaultId',
    ]);
  });

  it('non mette striscia e ritmo quando non hanno niente da dire', () => {
    // Un campo `undefined` scritto nel foglietto sarebbe una chiave in più in `app_meta` a
    // ogni spesa, e `changedWidgets` confronta il JSON: una chiave che compare e scompare
    // farebbe ridisegnare la home per niente. L'identificativo del gruppo resta, perché il
    // «+» deve funzionare anche in un gruppo in cui non si è ancora speso niente.
    const snapshot = compose({ expenses: [] });
    expect(Object.keys(snapshot.month ?? {}).sort()).toEqual([
      'amount',
      'caption',
      'group',
      'vaultId',
    ]);
  });
});
