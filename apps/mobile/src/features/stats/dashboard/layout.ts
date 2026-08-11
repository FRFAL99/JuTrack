/**
 * Il layout della dashboard: quali widget, in che ordine, e come sopravvive a un riavvio.
 *
 * È una **preferenza di chi guarda**, non un dato del gruppo: vive in `app_meta`, la tabella
 * SQLite locale, e non nel documento Yjs. Metterla nel vault vorrebbe dire imporre all'altra
 * persona l'ordine dei propri grafici e generare un update cifrato a ogni riordino; in
 * `app_meta` non c'è nessun conflitto CRDT da risolvere, e `wipe.ts` la porta via da sola
 * all'azzeramento con il suo `DELETE FROM app_meta`.
 *
 * **Una lista sola invece di due.** Ordine e accensione stanno insieme, così un widget
 * spento conserva il posto che avrà quando verrà riacceso — e il selettore, che mostra
 * tutto, riordina anche ciò che è spento.
 */
import { isWidgetId, WIDGETS, type WidgetId } from './widgets';

export interface LayoutItem {
  id: WidgetId;
  visible: boolean;
}

export type DashboardLayout = LayoutItem[];

/** La chiave in `app_meta`. Una sola, per tutta la dashboard. */
export const LAYOUT_KEY = 'dashboard_layout';

/**
 * Il layout di partenza: **tutti i widget, nell'ordine del registro**.
 *
 * Riproduce esattamente la schermata dello Step 26, che è quella che chi aggiorna sta già
 * guardando: un default più corto sarebbe una sottrazione fatta d'ufficio. Che il catalogo
 * e il default coincidano è vero **oggi** e non è una regola: i widget che verranno
 * aggiunti in futuro entreranno nel catalogo senza entrare in un layout già salvato.
 */
export const DEFAULT_LAYOUT: DashboardLayout = WIDGETS.map((widget) => ({
  id: widget.id,
  visible: true,
}));

/**
 * Rilegge il layout salvato, **scartando tutto ciò che non si capisce**.
 *
 * Restituisce `null` per «nessun layout», che chi chiama tratta come «usa il default». Un
 * JSON malformato finisce lì insieme all'assenza vera: un layout illeggibile e un layout
 * mai scritto portano alla stessa schermata giusta, e proseguire con metà elenco sarebbe
 * peggio di ricominciare. È lo stesso criterio di `loadProfile` in `state/profile.ts`.
 *
 * **Gli id sconosciuti si scartano**, così togliere un widget dal codice non rompe le
 * dashboard già composte. La regola opposta — non aggiungere i widget nuovi — non sta qui
 * ma in `visibleWidgets`: un id che manca dall'elenco vale come **spento**. Sembrano due
 * regole contrarie e sono la stessa: il layout salvato è una scelta, non una cache.
 */
export function parseLayout(raw: string | null): DashboardLayout | null {
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const seen = new Set<WidgetId>();
  const layout: DashboardLayout = [];

  for (const entry of parsed) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { id, visible } = entry as Record<string, unknown>;
    // Un `visible` che non è un booleano rende la riga incomprensibile, e una riga
    // incomprensibile vale come assente: cioè come un widget spento. Una sola regola.
    if (!isWidgetId(id) || typeof visible !== 'boolean') continue;
    if (seen.has(id)) continue;
    seen.add(id);
    layout.push({ id, visible });
  }

  return layout.length === 0 ? null : layout;
}

export function serializeLayout(layout: DashboardLayout): string {
  return JSON.stringify(layout);
}

/**
 * Gli id da disegnare, nell'ordine.
 *
 * **I widget nuovi non si aggiungono d'ufficio**: un id che il layout salvato non nomina
 * resta fuori. Serve a non far *riapparire* in coda alla dashboard qualcosa che l'utente
 * aveva deliberatamente tolto — e il caso in cui il registro cresce è indistinguibile da
 * quello, dal punto di vista del file salvato.
 */
export function visibleWidgets(layout: DashboardLayout): WidgetId[] {
  return layout.filter((item) => item.visible).map((item) => item.id);
}

/** Accende o spegne un widget, lasciandolo dov'è. */
export function toggleWidget(layout: DashboardLayout, id: WidgetId): DashboardLayout {
  return layout.map((item) => (item.id === id ? { ...item, visible: !item.visible } : item));
}

/**
 * Sposta un widget di `delta` posizioni. Ai bordi non succede niente.
 *
 * Lo scambio avviene sull'elenco **intero**, spenti compresi, perché è l'elenco che si sta
 * guardando mentre si riordina: nel selettore ci sono tutti, e uno scambio che saltasse i
 * widget spenti farebbe muovere la riga di due posti invece che di una.
 */
export function moveWidget(layout: DashboardLayout, id: WidgetId, delta: number): DashboardLayout {
  const from = layout.findIndex((item) => item.id === id);
  if (from === -1) return layout;

  const to = from + delta;
  if (to < 0 || to >= layout.length) return layout;

  const next = [...layout];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved as LayoutItem);
  return next;
}
