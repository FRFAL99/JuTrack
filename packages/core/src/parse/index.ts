/**
 * La superficie pubblica della grammatica: due funzioni e i loro tipi.
 *
 * I riconoscitori restano dentro, come in `insights/`: sono dettagli di come si legge una
 * frase, e i loro test li importano dal file. Ciò che esce da qui è ciò su cui l'app può
 * contare.
 */
export { isEmptyDraft, parseExpense } from './draft';

export { ITALIAN_LEXICON } from './lexicon';

export { isEmptyQuestion, parseQuery } from './query';
export type { ExpenseQuestion, QuestionField, QuestionMark, QueryFilters } from './query';

export type { QueryPeriod, QueryPreset } from './periods';

export type {
  DraftField,
  DraftMark,
  DraftSplit,
  ExpenseDraft,
  Lexicon,
  ParseContext,
} from './types';
