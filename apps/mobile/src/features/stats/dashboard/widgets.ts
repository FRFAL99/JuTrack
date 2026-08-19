/**
 * Il registro dei widget: cosa si può mettere nella dashboard.
 *
 * Un elenco solo, che è insieme il catalogo del selettore e la sorgente dei titoli a
 * schermo. Tenere due elenchi — uno di id e uno di etichette — significa che prima o poi ne
 * resta uno indietro, e il sintomo è un widget che nel selettore si chiama in un modo e
 * nella dashboard in un altro.
 *
 * **Le dipendenze sono dichiarate qui**, non scoperte da chi disegna: un widget che ha
 * bisogno di due persone nel gruppo o di una spesa con un negozio lo dice, e la schermata
 * si limita a chiedersi se quella condizione è soddisfatta. È ciò che permette di tenerlo
 * **visibile** quando non lo è — un widget scelto che svanisce si legge come un guasto.
 */
import { t } from '@/i18n/translate';

export type WidgetId =
  | 'total'
  | 'tiles'
  | 'months'
  | 'daily'
  | 'cumulative'
  | 'heatmap'
  | 'year'
  | 'weekdays'
  | 'categories'
  | 'amounts'
  | 'paid'
  | 'balance'
  | 'members'
  | 'stores'
  | 'tags'
  | 'budget';

/** Di cosa ha bisogno un widget per poter dire qualcosa. */
export type WidgetNeed = 'members' | 'store' | 'tags';

export interface WidgetSpec {
  id: WidgetId;
  /** Il nome, uguale nel selettore e nell'etichetta di sezione. */
  title: string;
  /** A cosa risponde. Nel selettore, sotto il nome. */
  subtitle: string;
  /** Vuoto per i widget che funzionano sempre. */
  needs: WidgetNeed[];
}

/** Gli id del registro, **nell'ordine in cui la schermata li mostrava allo Step 26**. */
const WIDGET_ORDER: { id: WidgetId; needs: WidgetNeed[] }[] = [
  { id: 'total', needs: [] },
  { id: 'tiles', needs: [] },
  { id: 'months', needs: [] },
  { id: 'daily', needs: [] },
  { id: 'cumulative', needs: [] },
  { id: 'heatmap', needs: [] },
  { id: 'year', needs: [] },
  { id: 'weekdays', needs: [] },
  { id: 'categories', needs: [] },
  { id: 'amounts', needs: [] },
  { id: 'paid', needs: ['members'] },
  { id: 'balance', needs: ['members'] },
  { id: 'members', needs: ['members'] },
  { id: 'stores', needs: ['store'] },
  { id: 'tags', needs: ['tags'] },
  { id: 'budget', needs: [] },
];

/**
 * I sedici widget, **nell'ordine in cui la schermata li mostrava allo Step 26**.
 *
 * L'ordine di questo elenco è anche il layout di partenza, e non è una coincidenza: chi
 * aggiorna l'app non deve comporre niente per ritrovarsi a casa. Aggiungendone uno in
 * futuro, il posto in cui lo si scrive qui decide dove comparirà a chi la dashboard non
 * l'ha mai toccata — e **non** comparirà a chi l'ha già composta.
 *
 * **Funzione e non costante di modulo**: i titoli passano da `t()`, e una costante calcolata
 * all'import resterebbe congelata nella lingua di sistema per tutta la vita del processo —
 * lo stesso guasto rischiato dai widget Android allo Step 38.
 */
export function widgets(): WidgetSpec[] {
  return WIDGET_ORDER.map(({ id, needs }) => ({
    id,
    needs,
    title: t(`dashboard.widgets.${id}.title`),
    subtitle: t(`dashboard.widgets.${id}.subtitle`),
  }));
}

/** Gli id del registro, per i controlli di appartenenza. */
export const WIDGET_IDS: WidgetId[] = WIDGET_ORDER.map((widget) => widget.id);

/** La scheda di un widget, `undefined` per un id che il registro non conosce più. */
export function widgetSpec(id: WidgetId): WidgetSpec | undefined {
  return widgets().find((widget) => widget.id === id);
}

/** Vero se la stringa è un id del registro. È il filtro di `parseLayout`. */
export function isWidgetId(value: unknown): value is WidgetId {
  return typeof value === 'string' && (WIDGET_IDS as string[]).includes(value);
}

/**
 * Cosa manca, detto a chi guarda.
 *
 * La frase è una sola per bisogno e compare in due punti — sotto il widget nella dashboard
 * e accanto al nome nel selettore — perché sono la stessa informazione: due formulazioni
 * diverse farebbero pensare a due condizioni diverse.
 */
export function describeNeed(need: WidgetNeed): string {
  switch (need) {
    case 'members':
      return t('dashboard.needs.members');
    case 'store':
      return t('dashboard.needs.store');
    case 'tags':
      return t('dashboard.needs.tags');
  }
}

/** Che cosa il gruppo ha davvero, per decidere quali bisogni sono soddisfatti. */
export interface GroupFacts {
  members: number;
  stores: number;
  tags: number;
}

/** I bisogni **non** soddisfatti di un widget. Vuoto quando può disegnare. */
export function unmetNeeds(spec: WidgetSpec, facts: GroupFacts): WidgetNeed[] {
  return spec.needs.filter((need) => {
    if (need === 'members') return facts.members < 2;
    if (need === 'store') return facts.stores === 0;
    return facts.tags === 0;
  });
}
