import { describe, expect, it } from 'vitest';
import {
  describeNeed,
  isWidgetId,
  unmetNeeds,
  widgets,
  widgetSpec,
  WIDGET_IDS,
  type WidgetNeed,
} from './widgets';

describe('widgets', () => {
  it('ogni id del registro ha titolo e sottotitolo', () => {
    // Il titolo è anche l'etichetta di sezione a schermo, e il sottotitolo è l'unica cosa
    // che nel selettore dice a cosa serve un widget che non si sta guardando.
    for (const widget of widgets()) {
      expect(widget.title.length).toBeGreaterThan(0);
      expect(widget.subtitle.length).toBeGreaterThan(0);
    }
  });

  it('non ci sono due widget con lo stesso id', () => {
    expect(new Set(WIDGET_IDS).size).toBe(widgets().length);
  });

  it('nessun titolo è ripetuto', () => {
    // Due righe con lo stesso nome nel selettore non si possono distinguere.
    expect(new Set(widgets().map((widget) => widget.title)).size).toBe(widgets().length);
  });

  it('ogni bisogno dichiarato ha una frase che lo spiega', () => {
    for (const widget of widgets()) {
      for (const need of widget.needs) {
        expect(describeNeed(need).length).toBeGreaterThan(0);
      }
    }
  });
});

describe('isWidgetId', () => {
  it('riconosce gli id del registro e rifiuta tutto il resto', () => {
    expect(isWidgetId('total')).toBe(true);
    expect(isWidgetId('grafico-che-non-esiste')).toBe(false);
    expect(isWidgetId(42)).toBe(false);
    expect(isWidgetId(null)).toBe(false);
    expect(isWidgetId(undefined)).toBe(false);
  });
});

describe('widgetSpec', () => {
  it('trova la scheda di un id noto', () => {
    expect(widgetSpec('budget')?.title).toBe('Budget');
  });
});

describe('unmetNeeds', () => {
  const full = { members: 2, stores: 3, tags: 4 };

  it('un widget senza bisogni può sempre disegnare', () => {
    const spec = widgetSpec('daily');
    expect(
      unmetNeeds(spec as ReturnType<typeof widgets>[number], { members: 1, stores: 0, tags: 0 }),
    ).toEqual([]);
  });

  it('con una persona sola manca il confronto fra persone', () => {
    // Una persona sola non è «zero membri»: il gruppo esiste, ma non c'è nessuno con cui
    // confrontarsi. La soglia è due.
    const spec = widgetSpec('members') as ReturnType<typeof widgets>[number];
    expect(unmetNeeds(spec, { ...full, members: 1 })).toEqual(['members' as WidgetNeed]);
    expect(unmetNeeds(spec, full)).toEqual([]);
  });

  it('senza negozi e senza tag mancano le due classifiche', () => {
    const stores = widgetSpec('stores') as ReturnType<typeof widgets>[number];
    const tags = widgetSpec('tags') as ReturnType<typeof widgets>[number];
    expect(unmetNeeds(stores, { ...full, stores: 0 })).toEqual(['store' as WidgetNeed]);
    expect(unmetNeeds(tags, { ...full, tags: 0 })).toEqual(['tags' as WidgetNeed]);
    expect(unmetNeeds(stores, full)).toEqual([]);
    expect(unmetNeeds(tags, full)).toEqual([]);
  });
});
