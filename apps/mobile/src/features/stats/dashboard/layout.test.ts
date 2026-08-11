import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LAYOUT,
  moveWidget,
  parseLayout,
  serializeLayout,
  toggleWidget,
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

describe('moveWidget', () => {
  it('scambia due righe vicine', () => {
    expect(moveWidget(LAYOUT, 'budget', -1).map((item) => item.id)).toEqual([
      'total',
      'budget',
      'daily',
    ]);
  });

  it('scavalca anche un widget spento', () => {
    // Lo scambio è sull'elenco intero perché è l'elenco che si sta guardando: saltare gli
    // spenti farebbe muovere la riga di due posti invece che di uno.
    expect(moveWidget(LAYOUT, 'total', 1).map((item) => item.id)).toEqual([
      'daily',
      'total',
      'budget',
    ]);
  });

  it('moveWidget in cima o in fondo non cambia niente', () => {
    expect(moveWidget(LAYOUT, 'total', -1)).toEqual(LAYOUT);
    expect(moveWidget(LAYOUT, 'budget', 1)).toEqual(LAYOUT);
  });

  it('un id che non c’è non cambia niente', () => {
    expect(moveWidget(LAYOUT, 'heatmap', -1)).toEqual(LAYOUT);
  });

  it('non tocca l’elenco ricevuto', () => {
    moveWidget(LAYOUT, 'budget', -1);
    expect(LAYOUT.map((item) => item.id)).toEqual(['total', 'daily', 'budget']);
  });
});
