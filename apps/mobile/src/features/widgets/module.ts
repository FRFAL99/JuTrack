// `import type`: cancellato in compilazione, quindi descrive il modulo senza caricarlo.
import type * as AndroidWidget from 'react-native-android-widget';
import { markError } from '@/diagnostics';

type WidgetModule = typeof AndroidWidget;

/**
 * I nomi dei due widget, **uguali a quelli in `app.json`**.
 *
 * Non è una duplicazione evitabile: il nome in `app.json` diventa il nome della classe
 * `AppWidgetProvider` generata nel manifest (`.widget.Balance`), cioè un pezzo di codice
 * nativo che esiste solo dopo una build; il nome qui è la stringa con cui il JS chiede di
 * aggiornare quel provider. Le due cose vivono in due mondi diversi e si incontrano a
 * runtime, dove uno scarto di una lettera non dà un errore di compilazione ma un widget che
 * non si aggiorna mai.
 *
 * Averli in una costante sola è ciò che permette alla diagnostica di **provarli davvero**
 * (`getWidgetInfo` solleva se il provider non esiste) invece di fidarsi.
 */
export const WIDGET_NAMES = ['Balance', 'MonthTotal'] as const;

export type WidgetName = (typeof WIDGET_NAMES)[number];

/**
 * Carica `react-native-android-widget` solo quando serve.
 *
 * Stessa ragione di `features/notifications/module.ts`: la build installata oggi sul
 * telefono non contiene questo modulo nativo, e un import al boot la farebbe cadere.
 *
 * **Il widget è di Android e basta.** Su iOS il modulo non esiste, e il ripiego non è un
 * caso d'errore ma il funzionamento normale: l'app resta quella di prima, senza widget.
 */

// `undefined` = mai tentato, `null` = tentato e non disponibile.
let cached: WidgetModule | null | undefined;

export function loadWidgetModule(): WidgetModule | null {
  if (cached !== undefined) return cached;
  try {
    // require e non import: deve poter fallire a runtime senza rompere il modulo.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('react-native-android-widget') as WidgetModule;
  } catch (error) {
    markError('react-native-android-widget non disponibile', error);
    cached = null;
  }
  return cached;
}

/**
 * Quanti widget di questo nome sono sulla schermata home, o `null` se non si può sapere.
 *
 * Zero e `null` sono cose diverse, e la diagnostica le dice diverse: **zero** significa che
 * il provider nativo c'è e nessuno ha ancora aggiunto il widget; **`null`** che il modulo
 * non è nella build, o che il nome qui non corrisponde a nessun provider generato — cioè
 * l'unico modo in cui questo passo può fallire in silenzio.
 */
export async function countPlacedWidgets(name: WidgetName): Promise<number | null> {
  const module = loadWidgetModule();
  if (module === null) return null;
  try {
    return (await module.getWidgetInfo(name)).length;
  } catch (error) {
    markError(`widget ${name} non interrogabile`, error);
    return null;
  }
}
