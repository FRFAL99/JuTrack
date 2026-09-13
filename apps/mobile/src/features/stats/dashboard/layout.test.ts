import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LAYOUT,
  hiddenInChapter,
  moveWithin,
  parseLayout,
  serializeLayout,
  showAllIn,
  toggleWidget,
  visibleInChapter,
  visibleWidgets,
  type DashboardLayout,
} from './layout';
import { WIDGET_IDS } from './widgets';

const LAYOUT: DashboardLayout = [
  { id: 'total', visible: true },
  { id: 'daily', visible: false },
  { id: 'budget', visible: true },
];

describe('DEFAULT_LAYOUT', () => {
  it('contiene solo id presenti nel registro', () => {
    for (const item of DEFAULT_LAYOUT) {
      expect(WIDGET_IDS).toContain(item.id);
    }
  });

  it('riproduce la schermata di prima: tutti accesi, nell’ordine del registro', () => {
    // Chi aggiorna l'app non deve comporre niente per ritrovarsi a casa: un default più
    // corto sarebbe una sottrazione fatta d'ufficio.
    expect(visibleWidgets(DEFAULT_LAYOUT)).toEqual(WIDGET_IDS);
  });

  it('non nomina due volte lo stesso widget', () => {
    expect(new Set(DEFAULT_LAYOUT.map((item) => item.id)).size).toBe(DEFAULT_LAYOUT.length);
  });
});

describe('parseLayout', () => {
  it('rilegge quello che ha scritto', () => {
    expect(parseLayout(serializeLayout(LAYOUT))).toEqual(LAYOUT);
  });

  it('un layout assente resta assente', () => {
    expect(parseLayout(null)).toBeNull();
  });

  it('un JSON malformato vale come layout assente', () => {
    // Illeggibile e mai scritto portano alla stessa schermata giusta: proseguire con metà
    // elenco sarebbe peggio che ricominciare dal default.
    expect(parseLayout('{[non è json')).toBeNull();
    expect(parseLayout('"una stringa"')).toBeNull();
    expect(parseLayout('{"id":"total"}')).toBeNull();
  });

  it('un id sconosciuto viene scartato', () => {
    // Serve a non rompersi quando un widget viene tolto dal codice.
    const raw = JSON.stringify([
      { id: 'total', visible: true },
      { id: 'grafico-che-non-esiste-piu', visible: true },
    ]);
    expect(parseLayout(raw)).toEqual([{ id: 'total', visible: true }]);
  });

  it('una riga senza un visible booleano vale come riga assente', () => {
    const raw = JSON.stringify([
      { id: 'total', visible: 'sì' },
      { id: 'budget', visible: false },
    ]);
    expect(parseLayout(raw)).toEqual([{ id: 'budget', visible: false }]);
  });

  it('un doppione tiene la prima occorrenza', () => {
    const raw = JSON.stringify([
      { id: 'total', visible: true },
      { id: 'total', visible: false },
    ]);
    expect(parseLayout(raw)).toEqual([{ id: 'total', visible: true }]);
  });

  it('un elenco in cui non sopravvive niente vale come assente', () => {
    expect(parseLayout(JSON.stringify([{ id: 'sconosciuto', visible: true }]))).toBeNull();
    expect(parseLayout('[]')).toBeNull();
  });
});

describe('visibleWidgets', () => {
  it('un widget aggiunto al registro non compare in un layout già salvato', () => {
    // È la regola opposta a «gli id sconosciuti si scartano», e sono la stessa: il layout
    // salvato è una scelta, non una cache. Un widget nuovo non deve **riapparire** in coda
    // a una dashboard da cui qualcosa era stato deliberatamente tolto.
    const saved = parseLayout(JSON.stringify([{ id: 'total', visible: true }]));
    expect(saved).not.toBeNull();
    expect(visibleWidgets(saved as DashboardLayout)).toEqual(['total']);
  });

  it('salta gli spenti e conserva l’ordine', () => {
    expect(visibleWidgets(LAYOUT)).toEqual(['total', 'budget']);
  });
});

describe('toggleWidget', () => {
  it('accende e spegne lasciando il widget dov’è', () => {
    const off = toggleWidget(LAYOUT, 'total');
    expect(off[0]).toEqual({ id: 'total', visible: false });
    expect(off.map((item) => item.id)).toEqual(LAYOUT.map((item) => item.id));
    expect(toggleWidget(off, 'total')).toEqual(LAYOUT);
  });

  it('non tocca l’elenco ricevuto', () => {
    toggleWidget(LAYOUT, 'total');
    expect(LAYOUT[0]?.visible).toBe(true);
  });

  it('un id che non c’è non cambia niente', () => {
    expect(toggleWidget(LAYOUT, 'heatmap')).toEqual(LAYOUT);
  });
});

describe('moveWithin', () => {
  /** Mese: total, daily, budget. Abitudini: year, weekdays. `daily` è spento. */
  const MIXED: DashboardLayout = [
    { id: 'total', visible: true },
    { id: 'year', visible: true },
    { id: 'daily', visible: false },
    { id: 'budget', visible: true },
    { id: 'weekdays', visible: true },
  ];

  it('scambia due widget vicini dello stesso capitolo', () => {
    expect(moveWithin(MIXED, 'budget', -1, 'month').map((item) => item.id)).toEqual([
      'budget',
      'year',
      'daily',
      'total',
      'weekdays',
    ]);
  });

  it('salta i widget di altri capitoli e quelli spenti', () => {
    // È la regola **opposta** a quella del vecchio `moveWidget`, e per la stessa ragione: si
    // sposta su ciò che si sta guardando. In modifica si guarda un capitolo e solo i suoi
    // accesi, quindi uno scambio con la riga di sopra nell'elenco intero sposterebbe il
    // widget senza che a schermo cambi niente.
    expect(visibleInChapter(MIXED, 'month')).toEqual(['total', 'budget']);
    expect(visibleInChapter(moveWithin(MIXED, 'total', 1, 'month'), 'month')).toEqual([
      'budget',
      'total',
    ]);
  });

  it('non rimescola gli altri capitoli', () => {
    // Uno scambio e non un'estrazione e reinserimento: `year` e `weekdays` restano dove
    // sono anche riordinando «Mese» da sopra e da sotto di loro.
    const next = moveWithin(MIXED, 'total', 1, 'month');
    expect(visibleInChapter(next, 'habits')).toEqual(['year', 'weekdays']);
    expect(next.map((item) => item.id).filter((id) => id === 'daily')).toEqual(['daily']);
  });

  it('ai bordi del capitolo non succede niente', () => {
    expect(moveWithin(MIXED, 'total', -1, 'month')).toEqual(MIXED);
    expect(moveWithin(MIXED, 'budget', 1, 'month')).toEqual(MIXED);
  });

  it('un widget spento, o di un altro capitolo, o assente non si muove', () => {
    expect(moveWithin(MIXED, 'daily', -1, 'month')).toEqual(MIXED);
    expect(moveWithin(MIXED, 'year', 1, 'month')).toEqual(MIXED);
    expect(moveWithin(MIXED, 'heatmap', -1, 'month')).toEqual(MIXED);
  });

  it('non tocca l’elenco ricevuto', () => {
    moveWithin(MIXED, 'budget', -1, 'month');
    expect(MIXED.map((item) => item.id)).toEqual(['total', 'year', 'daily', 'budget', 'weekdays']);
  });
});

describe('hiddenInChapter e showAllIn', () => {
  const LAYOUT_OFF: DashboardLayout = [
    { id: 'total', visible: false },
    { id: 'budget', visible: false },
    { id: 'year', visible: false },
    { id: 'daily', visible: true },
  ];

  it('il cassetto elenca gli spenti del solo capitolo, nell’ordine del layout', () => {
    expect(hiddenInChapter(LAYOUT_OFF, 'month')).toEqual(['total', 'budget']);
    expect(hiddenInChapter(LAYOUT_OFF, 'habits')).toEqual(['year']);
    expect(hiddenInChapter(LAYOUT_OFF, 'together')).toEqual([]);
  });

  it('«Rimetti tutti» riaccende solo il capitolo che si sta guardando', () => {
    // Rimettere in un colpo anche ciò che vive altrove sarebbe di nuovo un effetto che non
    // si vede mentre lo si decide.
    const next = showAllIn(LAYOUT_OFF, 'month');
    // `daily` era già acceso e sta anche lui in «Mese»: riaccendere tutti non lo sposta.
    expect(visibleInChapter(next, 'month')).toEqual(['total', 'budget', 'daily']);
    expect(hiddenInChapter(next, 'habits')).toEqual(['year']);
  });

  it('spento e riacceso, il widget torna al suo posto', () => {
    const off = toggleWidget(DEFAULT_LAYOUT, 'heatmap');
    expect(hiddenInChapter(off, 'month')).toEqual(['heatmap']);
    expect(showAllIn(off, 'month')).toEqual(DEFAULT_LAYOUT);
  });
});

describe('visibleInChapter', () => {
  it('tiene solo gli accesi del capitolo chiesto', () => {
    const layout: DashboardLayout = [
      { id: 'total', visible: true }, // Mese
      { id: 'year', visible: true }, // Abitudini
      { id: 'paid', visible: true }, // Fra di voi
      { id: 'weekdays', visible: false }, // Abitudini, spento
    ];
    expect(visibleInChapter(layout, 'month')).toEqual(['total']);
    expect(visibleInChapter(layout, 'habits')).toEqual(['year']);
    expect(visibleInChapter(layout, 'together')).toEqual(['paid']);
  });

  it('conserva l ordine del layout anche coi widget di altri capitoli in mezzo', () => {
    // Il capitolo **filtra e non riordina**: è la ragione per cui i capitoli non hanno
    // richiesto nessuna migrazione del formato salvato.
    const layout: DashboardLayout = [
      { id: 'weekdays', visible: true },
      { id: 'total', visible: true },
      { id: 'months', visible: true },
    ];
    expect(visibleInChapter(layout, 'habits')).toEqual(['weekdays', 'months']);
  });

  it('i tre capitoli insieme danno esattamente i widget accesi', () => {
    // Nessun widget acceso può restare fuori da tutti e tre: sarebbe invisibile senza che
    // niente lo dica.
    const shown = visibleWidgets(DEFAULT_LAYOUT);
    const byChapter = [
      ...visibleInChapter(DEFAULT_LAYOUT, 'month'),
      ...visibleInChapter(DEFAULT_LAYOUT, 'habits'),
      ...visibleInChapter(DEFAULT_LAYOUT, 'together'),
    ];
    expect([...byChapter].sort()).toEqual([...shown].sort());
  });

  it('un capitolo con tutto spento è vuoto, non è un errore', () => {
    expect(visibleInChapter([{ id: 'total', visible: false }], 'month')).toEqual([]);
  });
});
