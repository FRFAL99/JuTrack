import {
  isEmptyQuestion,
  parseQuery,
  type ParseContext,
  type QueryPeriod,
  type QuestionMark,
} from '@jutrack/core';
import { todayIso } from '@/features/expenses/grouping';
import type { QueryFacets } from './facets';
import { customPeriod, presetPeriod, type Period } from './period';

/**
 * Dalla domanda scritta ai due `useState` dei Grafici.
 *
 * Fuori dal componente per la stessa ragione di `period.ts` e `facets.ts`: è la parte che
 * può essere sbagliata, e i test dell'app non caricano `react-native`.
 *
 * **La frase non disegna niente.** Imposta un periodo e dei filtri, e il resto della
 * schermata reagisce come se i chip fossero stati toccati a mano — il che è anche ciò che
 * rende la frase togliibile: la × su un chip funziona perché sotto non c'è una modalità a
 * parte, ci sono i filtri di sempre.
 */

/** Ciò che una domanda chiede di cambiare. Quello che non nomina, non si tocca. */
export interface QuestionResult {
  /** `null` quando la frase non nomina un periodo: resta quello di prima. */
  period: Period | null;
  /** Solo le chiavi riconosciute: si fondono su quelle di prima, non le sostituiscono. */
  facets: QueryFacets;
  /**
   * Qualcosa è stato riconosciuto?
   *
   * **È la guardia che impedisce a mezza frase di svuotare la schermata.** Si scrive
   * «quanto ho sp», il parser non ne cava niente, e applicando comunque il risultato i
   * filtri di prima sparirebbero — cioè una schermata vuota, che è esattamente ciò che
   * `FilterBar` descrive come «si legge come un guasto dell'app».
   */
  understood: boolean;
  /** Ciò che non è stato capito, per dirlo a chi ha scritto. */
  note: string;
  marks: QuestionMark[];
}

/** Legge una domanda. Non applica niente: a farlo è la schermata, con due `setState`. */
export function readQuestion(
  text: string,
  context: ParseContext,
  today: string = todayIso(),
): QuestionResult {
  const question = parseQuery(text, context);
  return {
    period: toPeriod(question.period, today),
    facets: question.filters,
    understood: !isEmptyQuestion(question),
    note: question.note,
    marks: question.marks,
  };
}

/**
 * Il periodo del core diventa quello della schermata.
 *
 * Un preset resta un preset — si muove col calendario e porta l'etichetta che il chip
 * mostra — e due date diventano un intervallo scelto a mano. **Non c'è uno `switch`**:
 * passare un `QueryPreset` dove l'app vuole un `PeriodPresetId` è già il controllo, e il
 * giorno in cui una delle due unioni cresce questa riga smette di compilare.
 */
function toPeriod(period: QueryPeriod | null, today: string): Period | null {
  if (period === null) return null;
  if (period.preset !== null) return presetPeriod(period.preset, today);
  if (period.from !== null && period.to !== null) return customPeriod(period.from, period.to);
  return null;
}

/**
 * I filtri nuovi sopra quelli di prima.
 *
 * **Si fondono, non si sostituiscono**, ed è il criterio di «fatto» dello step: dopo «spesa
 * da esselunga questo mese» si scrive «sopra i 50» e ci si aspetta che il periodo resti e la
 * soglia si aggiunga. Sostituire vorrebbe dire far riscrivere ogni volta la domanda intera,
 * che è il modo più rapido per smettere di usarla.
 *
 * Per azzerare c'è «Azzera» nella barra, dov'è sempre stato: una frase che **toglie** un
 * filtro sarebbe una grammatica nuova da imparare per fare ciò che una × già fa.
 */
export function mergeFacets(previous: QueryFacets, recognized: QueryFacets): QueryFacets {
  const next: QueryFacets = { ...previous };
  for (const [key, value] of Object.entries(recognized)) {
    if (value !== undefined) Object.assign(next, { [key]: value });
  }
  return next;
}
