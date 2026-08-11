import { describe, expect, it } from 'vitest';
import {
  anchorMonth,
  customPeriod,
  describeBounds,
  describeRange,
  monthPeriod,
  periodLabel,
  presetPeriod,
  previousPeriod,
  startsAtMonthStart,
} from './period';

/** Un mercoledì di metà mese: né il primo né l'ultimo giorno, così i confini si vedono. */
const TODAY = '2026-08-11';
/** `Date` di riferimento per le etichette, che nascondono l'anno quando è quello in corso. */
const NOW = new Date(2026, 7, 11, 12);

describe('presetPeriod', () => {
  it('«ultimi 7 giorni» include oggi e i sei precedenti', () => {
    // Sette giorni in tutto: il 5 è il primo, l'11 è il settimo. Partire da -7 ne
    // prenderebbe otto, ed è l'errore che questo test esiste per fermare.
    expect(presetPeriod('last7', TODAY)).toEqual({ id: 'last7', from: '2026-08-05', to: TODAY });
  });

  it('«ultimi 30 giorni» arriva a oggi e comincia ventinove giorni prima', () => {
    expect(presetPeriod('last30', TODAY)).toEqual({ id: 'last30', from: '2026-07-13', to: TODAY });
  });

  it('«questo mese» parte dal primo e arriva a oggi, non a fine mese', () => {
    expect(presetPeriod('thisMonth', TODAY)).toEqual({
      id: 'thisMonth',
      from: '2026-08-01',
      to: TODAY,
    });
  });

  it('«mese scorso» è il mese intero, primo e ultimo giorno compresi', () => {
    expect(presetPeriod('lastMonth', TODAY)).toEqual({
      id: 'lastMonth',
      from: '2026-07-01',
      to: '2026-07-31',
    });
  });

  it('«mese scorso» a gennaio torna a dicembre dell’anno prima', () => {
    expect(presetPeriod('lastMonth', '2026-01-09')).toEqual({
      id: 'lastMonth',
      from: '2025-12-01',
      to: '2025-12-31',
    });
  });

  it('«mese scorso» a marzo si ferma al 28 se l’anno non è bisestile', () => {
    expect(presetPeriod('lastMonth', '2026-03-15').to).toBe('2026-02-28');
    expect(presetPeriod('lastMonth', '2028-03-15').to).toBe('2028-02-29');
  });

  it('«ultimi 12 mesi» parte dal primo giorno del dodicesimo mese indietro', () => {
    // Settembre 2025 è il dodicesimo contando all'indietro da agosto 2026 compreso.
    expect(presetPeriod('last12Months', TODAY)).toEqual({
      id: 'last12Months',
      from: '2025-09-01',
      to: TODAY,
    });
  });

  it('«quest’anno» parte dal primo gennaio e arriva a oggi', () => {
    expect(presetPeriod('thisYear', TODAY)).toEqual({
      id: 'thisYear',
      from: '2026-01-01',
      to: TODAY,
    });
  });
});

describe('customPeriod', () => {
  it('un intervallo personalizzato invertito viene raddrizzato invece di dare zero risultati', () => {
    // Chi tocca prima il 20 e poi il 3 intende dal 3 al 20. Un intervallo invertito non
    // sarebbe un errore visibile: sarebbe una schermata vuota che sembra un guasto.
    expect(customPeriod('2026-08-20', '2026-08-03')).toEqual({
      id: 'custom',
      from: '2026-08-03',
      to: '2026-08-20',
    });
  });

  it('lascia stare un intervallo già nel verso giusto', () => {
    expect(customPeriod('2026-08-03', '2026-08-20')).toEqual({
      id: 'custom',
      from: '2026-08-03',
      to: '2026-08-20',
    });
  });

  it('un giorno solo è un intervallo valido', () => {
    expect(customPeriod('2026-08-03', '2026-08-03')).toEqual({
      id: 'custom',
      from: '2026-08-03',
      to: '2026-08-03',
    });
  });
});

describe('monthPeriod', () => {
  it('un mese passato è il mese intero', () => {
    expect(monthPeriod('2026-03', TODAY)).toEqual({
      id: 'custom',
      from: '2026-03-01',
      to: '2026-03-31',
    });
  });

  it('il mese in corso si ferma a oggi, come il preset', () => {
    expect(monthPeriod('2026-08', TODAY)).toEqual(presetPeriod('thisMonth', TODAY));
  });
});

describe('anchorMonth', () => {
  it('è il mese in cui il periodo finisce, non quello in cui comincia', () => {
    // Le barre mensili e i budget si appendono qui: un periodo a cavallo di due mesi
    // racconta l'ultimo, che è quello che si sta guardando.
    expect(anchorMonth(presetPeriod('last30', TODAY))).toBe('2026-08');
  });
});

describe('previousPeriod', () => {
  it('un mese intero si confronta con il mese intero prima', () => {
    expect(previousPeriod(presetPeriod('lastMonth', TODAY))).toEqual({
      from: '2026-06-01',
      to: '2026-06-30',
    });
  });

  it('un mese in corso si confronta con lo stesso tratto del mese prima', () => {
    // Non con luglio intero: a metà agosto qualunque mese finito vincerebbe sempre, e la
    // riga direbbe «-60%» ogni singolo mese fino all'ultimo giorno.
    expect(previousPeriod(presetPeriod('thisMonth', TODAY))).toEqual({
      from: '2026-07-01',
      to: '2026-07-11',
    });
  });

  it('il tratto si accorcia quando il mese prima è più corto', () => {
    expect(previousPeriod({ id: 'custom', from: '2026-03-01', to: '2026-03-30' })).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    });
  });

  it('gennaio torna a dicembre dell’anno prima', () => {
    expect(previousPeriod({ id: 'custom', from: '2026-01-01', to: '2026-01-31' })).toEqual({
      from: '2025-12-01',
      to: '2025-12-31',
    });
  });

  it('un periodo qualunque si confronta con il tratto di pari lunghezza subito prima', () => {
    // Sette giorni prima dei sette scelti, e il precedente finisce il giorno prima che il
    // periodo cominci: un giorno in comune conterebbe due volte.
    expect(previousPeriod(presetPeriod('last7', TODAY))).toEqual({
      from: '2026-07-29',
      to: '2026-08-04',
    });
  });

  it('un periodo che comincia a metà mese non passa per il calendario', () => {
    expect(previousPeriod({ id: 'custom', from: '2026-08-10', to: '2026-08-12' })).toEqual({
      from: '2026-08-07',
      to: '2026-08-09',
    });
  });
});

describe('describeRange', () => {
  it('un mese civile intero si dice con il suo nome', () => {
    // Minuscolo: questa frase finisce anche in mezzo a un'altra («rispetto a marzo»). La
    // maiuscola la mette `periodLabel`, che invece comincia un chip.
    expect(describeRange('2026-03-01', '2026-03-31', NOW)).toBe('marzo');
  });

  it('un mese di un altro anno porta l’anno', () => {
    expect(describeRange('2025-03-01', '2025-03-31', NOW)).toBe('marzo 2025');
  });

  it('due giorni dello stesso mese lo nominano una volta sola', () => {
    expect(describeRange('2026-08-03', '2026-08-20', NOW)).toBe('3 – 20 agosto');
  });

  it('a cavallo di due mesi porta entrambe le date', () => {
    expect(describeRange('2026-07-29', '2026-08-04', NOW)).toBe('29 luglio – 4 agosto');
  });

  it('un giorno solo si dice una volta sola', () => {
    expect(describeRange('2026-08-03', '2026-08-03', NOW)).toBe('3 agosto');
  });
});

describe('describeBounds', () => {
  it('un mese intero non si accorcia al suo nome: qui servono i giorni', () => {
    // È la riga sotto le pillole del selettore, e dice **da che giorno a che giorno**:
    // «luglio» lo direbbe già la pillola sopra.
    expect(describeBounds('2026-07-01', '2026-07-31', NOW)).toBe('Dal 1 al 31 luglio');
  });

  it('«questo mese» a metà mese dice che finisce oggi, non a fine mese', () => {
    const period = presetPeriod('thisMonth', TODAY);
    expect(describeBounds(period.from, period.to, NOW)).toBe('Dal 1 al 11 agosto');
  });

  it('a cavallo di due mesi nomina entrambi', () => {
    expect(describeBounds('2026-07-29', '2026-08-04', NOW)).toBe('Dal 29 luglio al 4 agosto');
  });

  it('un giorno solo si dice così', () => {
    expect(describeBounds('2026-08-03', '2026-08-03', NOW)).toBe('Solo il 3 agosto');
  });
});

describe('periodLabel', () => {
  it('un preset porta la sua etichetta, non le sue date', () => {
    expect(periodLabel(presetPeriod('last30', TODAY), NOW)).toBe('Ultimi 30 giorni');
  });

  it('un intervallo scelto a mano porta le date, perché non ha un nome', () => {
    expect(periodLabel(customPeriod('2026-08-20', '2026-08-03'), NOW)).toBe('3 – 20 agosto');
  });

  it('un mese scelto dalla barra comincia con la maiuscola, perché apre un chip', () => {
    expect(periodLabel(monthPeriod('2026-03', TODAY), NOW)).toBe('Marzo');
  });
});

describe('startsAtMonthStart', () => {
  it('è vero per un mese in corso e per un mese intero', () => {
    expect(startsAtMonthStart(presetPeriod('thisMonth', TODAY))).toBe(true);
    expect(startsAtMonthStart(monthPeriod('2026-03', TODAY))).toBe(true);
  });

  it('è falso quando il periodo comincia altrove', () => {
    // È la condizione che fa comparire la nota sotto le barre mensili: i mesi sono interi
    // anche quando il periodo scelto è più corto.
    expect(startsAtMonthStart(presetPeriod('last7', TODAY))).toBe(false);
    expect(startsAtMonthStart(presetPeriod('last12Months', TODAY))).toBe(false);
  });
});
