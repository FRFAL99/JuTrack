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

/**
 * I sedici widget, **nell'ordine in cui la schermata li mostrava allo Step 26**.
 *
 * L'ordine di questo elenco è anche il layout di partenza, e non è una coincidenza: chi
 * aggiorna l'app non deve comporre niente per ritrovarsi a casa. Aggiungendone uno in
 * futuro, il posto in cui lo si scrive qui decide dove comparirà a chi la dashboard non
 * l'ha mai toccata — e **non** comparirà a chi l'ha già composta.
 */
export const WIDGETS: WidgetSpec[] = [
  {
    id: 'total',
    title: 'Totale',
    subtitle: 'Quanto è stato speso nel periodo, e come cambia rispetto a prima',
    needs: [],
  },
  {
    id: 'tiles',
    title: 'In sintesi',
    subtitle: 'Media al giorno, numero di spese, importo medio per spesa',
    needs: [],
  },
  {
    id: 'months',
    title: 'Mese per mese',
    subtitle: 'Sei barre mensili. Toccarne una sposta il periodo su quel mese',
    needs: [],
  },
  {
    id: 'daily',
    title: 'Giorno per giorno',
    subtitle: 'La curva delle spese quotidiane, con la media della settimana',
    needs: [],
  },
  {
    id: 'cumulative',
    title: 'Quanto si è accumulato',
    subtitle: 'La somma dall’inizio del periodo, per sapere a metà mese se si sta esagerando',
    needs: [],
  },
  {
    id: 'heatmap',
    title: 'Quando si è speso',
    subtitle: 'Una cella per giorno: dice le settimane fitte e i giorni vuoti',
    needs: [],
  },
  {
    id: 'year',
    title: 'Dodici mesi',
    subtitle: 'L’andamento lungo, indipendente dal periodo scelto',
    needs: [],
  },
  {
    id: 'weekdays',
    title: 'Giorni della settimana',
    subtitle: 'L’abitudine settimanale, sugli ultimi dodici mesi',
    needs: [],
  },
  {
    id: 'categories',
    title: 'Dove sono finiti',
    subtitle: 'La ripartizione per categoria, a riquadri e a barre',
    needs: [],
  },
  {
    id: 'amounts',
    title: 'Quante spese, per fascia',
    subtitle: 'Tanti scontrini piccoli o pochi grossi?',
    needs: [],
  },
  {
    id: 'paid',
    title: 'Chi ha anticipato',
    subtitle: 'Quanto ha messo ciascuno, sul periodo scelto',
    needs: ['members'],
  },
  {
    id: 'balance',
    title: 'Fra di voi',
    subtitle: 'Chi deve quanto a chi, su tutta la storia del gruppo',
    needs: ['members'],
  },
  {
    id: 'members',
    title: 'Anticipato e a carico',
    subtitle: 'Le due grandezze a confronto, persona per persona',
    needs: ['members'],
  },
  {
    id: 'stores',
    title: 'Negozi',
    subtitle: 'La classifica dei posti in cui si è speso di più',
    needs: ['store'],
  },
  {
    id: 'tags',
    title: 'Tag',
    subtitle: 'La classifica delle etichette messe sulle spese',
    needs: ['tags'],
  },
  {
    id: 'budget',
    title: 'Budget',
    subtitle: 'I limiti impostati per il mese, e quanto ne resta',
    needs: [],
  },
];

/** Gli id del registro, per i controlli di appartenenza. */
export const WIDGET_IDS: WidgetId[] = WIDGETS.map((widget) => widget.id);

/** La scheda di un widget, `undefined` per un id che il registro non conosce più. */
export function widgetSpec(id: WidgetId): WidgetSpec | undefined {
  return WIDGETS.find((widget) => widget.id === id);
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
      return 'Serve almeno un’altra persona nel gruppo.';
    case 'store':
      return 'Serve almeno una spesa con un negozio.';
    case 'tags':
      return 'Serve almeno una spesa con un tag.';
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
