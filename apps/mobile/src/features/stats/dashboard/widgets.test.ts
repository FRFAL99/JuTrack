import { describe, expect, it } from 'vitest';
import {
  chapterNote,
  chapterOf,
  chapterTitle,
  describeNeed,
  isWidgetId,
  unmetNeeds,
  widgets,
  widgetSpec,
  CHAPTERS,
  WIDGET_CHAPTER,
  WIDGET_IDS,
  type Chapter,
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

describe('i capitoli', () => {
  it('ogni widget del registro ne ha uno', () => {
    // Il `Record` lo pretende già a compilazione; questo copre il caso in cui l'id venisse
    // tolto dal registro e lasciato qui, che TypeScript non vede.
    for (const id of WIDGET_IDS) {
      expect(CHAPTERS).toContain(WIDGET_CHAPTER[id]);
    }
    expect(Object.keys(WIDGET_CHAPTER).sort()).toEqual([...WIDGET_IDS].sort());
  });

  it('i sedici si dividono in dieci, tre e tre', () => {
    const count = (chapter: Chapter): number =>
      WIDGET_IDS.filter((id) => chapterOf(id) === chapter).length;
    expect(count('month')).toBe(10);
    expect(count('habits')).toBe(3);
    expect(count('together')).toBe(3);
    expect(count('month') + count('habits') + count('together')).toBe(WIDGET_IDS.length);
  });

  it('«Fra di voi» è esattamente chi ha bisogno di due persone', () => {
    // Non è una coincidenza da tenere allineata a mano: è la ragione per cui il capitolo
    // esiste. Se un domani divergessero, uno dei due è sbagliato.
    const together = WIDGET_IDS.filter((id) => chapterOf(id) === 'together');
    const needsMembers = widgets()
      .filter((widget) => widget.needs.includes('members'))
      .map((widget) => widget.id);
    expect([...together].sort()).toEqual([...needsMembers].sort());
  });

  it('«Abitudini» sono i tre che leggono una finestra ancorata', () => {
    // `months`, `year` e `weekdays` leggono `yearExpenses` in `stats.tsx` invece delle
    // spese del periodo. `members` legge la stessa finestra ma sta in «Fra di voi», dove è
    // l'unico ancorato e si tiene la propria nota.
    expect(WIDGET_IDS.filter((id) => chapterOf(id) === 'habits')).toEqual([
      'months',
      'year',
      'weekdays',
    ]);
  });

  it('ogni capitolo ha un nome, e nessuno si chiama come un widget', () => {
    // «Fra di voi» era anche il titolo del widget del saldo: due cose con lo stesso nome,
    // una dentro l'altra, non si distinguono guardandole.
    const titles = widgets().map((widget) => widget.title);
    for (const chapter of CHAPTERS) {
      // Il punto è la rete contro la chiave mancante: `chapterTitle` compone la chiave con
      // un template, e i18next su una chiave che non esiste restituisce **la chiave**, che
      // un semplice controllo di lunghezza non distinguerebbe da un nome vero.
      expect(chapterTitle(chapter)).not.toContain('.');
      expect(titles).not.toContain(chapterTitle(chapter));
    }
  });

  it('la nota ce l ha solo «Abitudini»', () => {
    expect(chapterNote('habits')).not.toBeNull();
    expect(chapterNote('habits')).not.toContain('dashboard.');
    expect(chapterNote('month')).toBeNull();
    expect(chapterNote('together')).toBeNull();
  });
});
