import {
  type Category,
  type DraftField,
  type Expense,
  type ExpenseDraft,
  type Member,
  type ParseContext,
  type SplitMode,
  type VocabularyEntry,
} from '@jutrack/core';
import { formatMoney } from '@/i18n/money';
import { t } from '@/i18n/translate';
import { vocabularyChoices } from '@/features/vocabulary/choices';
import { formatDayTitle } from './grouping';
import { splitModeLabel } from './split-text';

/**
 * Quello che il foglio della frase deve sapere, fuori dal componente.
 *
 * Stessa ragione di `split-text.ts`, `extra-fields.ts` e `choices.ts`: sono le parti che
 * possono essere sbagliate, e i test dell'app non caricano `react-native`. Qui dentro
 * stanno il contesto da dare alla grammatica, la traduzione della bozza in pillole, il
 * taglio della frase per l'evidenziazione e le due letture che il form non può fare da sé.
 */

/** Tutto ciò che serve a costruire il `ParseContext`, preso dallo stato del gruppo. */
export interface SentenceSources {
  today: string;
  members: Member[];
  myMemberId: string;
  categories: Category[];
  /** L'elenco dei negozi del gruppo (Step 59). */
  storeEntries: VocabularyEntry[];
  /** L'elenco dei tag del gruppo. */
  tagEntries: VocabularyEntry[];
  /** Le spese, da cui si pescano le parole usate ma mai messe in elenco. */
  expenses: Expense[];
}

/**
 * Il vocabolario che la frase può riconoscere è **quello che il form propone**.
 *
 * Si riusa `vocabularyChoices` con nessuna scelta: catalogo del gruppo più le parole già
 * usate nelle spese. Comporre qui un elenco diverso — solo il catalogo, o solo le parole
 * usate — vorrebbe dire che una pillola visibile nel form non si può scrivere nella frase,
 * o il contrario, e nessuno dei due si nota finché non capita.
 *
 * **Non lo costruisca il componente a ogni tasto:** `vocabularyChoices` passa da
 * `knownStores`, che scandisce tutte le spese del gruppo. Va in un `useMemo` sulle spese,
 * non sulla frase — è lo stesso difetto che `insights/query.ts` descrive per i grafici.
 */
export function sentenceContext(sources: SentenceSources): ParseContext {
  return {
    today: sources.today,
    members: sources.members,
    myMemberId: sources.myMemberId,
    categories: sources.categories,
    stores: vocabularyChoices('store', sources.storeEntries, [], sources.expenses).map(
      (choice) => choice.name,
    ),
    tags: vocabularyChoices('tag', sources.tagEntries, [], sources.expenses).map(
      (choice) => choice.name,
    ),
  };
}

/** Una pillola dell'anteprima: cosa è stato capito, detto in parole. */
export interface SentencePill {
  /** Chiave di lista, e insieme identità stabile fra un tasto e il successivo. */
  key: string;
  field: DraftField;
  label: string;
  /** Il colore della categoria, quando la pillola è una categoria. */
  color?: string;
}

/** Il pezzo di gruppo che serve a scrivere le pillole. */
export interface PillLabels {
  categories: Category[];
  members: Member[];
  myMemberId: string;
  symbol: string;
}

/**
 * La bozza, detta in pillole.
 *
 * **Una pillola per campo capito, e nessuna per ciò che non lo è.** L'anteprima non elenca
 * i campi vuoti: a dire che manca qualcosa è la frase stessa, e un elenco di «—» sotto ogni
 * riga scritta a metà sarebbe una schermata che sembra un modulo — cioè esattamente ciò da
 * cui questa serve a scappare.
 *
 * Le frasi non si scrivono qui: `formatDayTitle` dice «Ieri», `splitModeLabel` dice «Metà e
 * metà», e sono le stesse che l'elenco e il form mostrano altrove. Due modi di dire la
 * stessa cosa nella stessa schermata si leggono come due cose diverse.
 */
export function draftPills(draft: ExpenseDraft, labels: PillLabels): SentencePill[] {
  const pills: SentencePill[] = [];

  if (draft.amountCents !== null) {
    pills.push({
      key: 'amount',
      field: 'amount',
      label: formatMoney(draft.amountCents, labels.symbol),
    });
  }

  if (draft.date !== null) {
    pills.push({ key: 'date', field: 'date', label: formatDayTitle(draft.date) });
  }

  const category = labels.categories.find((item) => item.id === draft.categoryId);
  if (category !== undefined) {
    pills.push({
      key: 'category',
      field: 'category',
      label: category.name,
      color: category.color,
    });
  }

  if (draft.store !== '') {
    pills.push({ key: 'store', field: 'store', label: draft.store });
  }

  for (const tag of draft.tags) {
    pills.push({ key: `tag:${tag}`, field: 'tag', label: tag });
  }

  if (draft.paidBy !== null) {
    pills.push({ key: 'paidBy', field: 'paidBy', label: payerLabel(draft.paidBy, labels) });
  }

  if (draft.split !== null) {
    pills.push({
      key: 'split',
      field: 'split',
      label: splitModeLabel(draft.split.mode, labels.members.length),
    });
  }

  return pills;
}

/** «Paghi tu», oppure «Paga Giulia»: le stesse due frasi della riga chiusa del form. */
function payerLabel(memberId: string, labels: PillLabels): string {
  if (memberId === labels.myMemberId) return t('expense.group.payerMe');
  const name = labels.members.find((member) => member.id === memberId)?.name ?? '';
  return t('expense.group.payerOther', { name });
}

/** Un pezzo di frase: o appartiene a un campo, o è testo che nessuno ha capito. */
export interface SentencePiece {
  text: string;
  /** `null` per ciò che finirà nella nota. */
  field: DraftField | null;
}

/**
 * La frase tagliata nei pezzi da colorare.
 *
 * **È il modo in cui si impara la sintassi senza un manuale da leggere:** una parola si
 * colora mentre la si scrive, e a quel punto non serve nessuno che spieghi che «ieri» è una
 * data. Per la stessa ragione i pezzi non capiti restano testo normale invece di essere
 * segnati in rosso: non si sta sbagliando niente, si sta scrivendo una nota.
 *
 * I segni della bozza sono già ordinati e non si sovrappongono; qui si riempiono i buchi.
 * Gli offset sono sul testo originale, quindi i pezzi rimessi in fila **ricompongono
 * esattamente la frase** — c'è il test, ed è ciò che impedisce a un carattere di sparire a
 * schermo.
 */
export function highlight(draft: ExpenseDraft): SentencePiece[] {
  const pieces: SentencePiece[] = [];
  let cursor = 0;

  const plain = (end: number): void => {
    if (end > cursor) pieces.push({ text: draft.text.slice(cursor, end), field: null });
  };

  for (const mark of draft.marks) {
    if (mark.start < cursor) continue;
    plain(mark.start);
    pieces.push({ text: draft.text.slice(mark.start, mark.end), field: mark.field });
    cursor = mark.end;
  }
  plain(draft.text.length);

  return pieces;
}

/**
 * L'avviso sotto il campo, o `null` quando non c'è niente da dire.
 *
 * L'unico caso è **due numeri nudi**: la grammatica ha deciso di non scegliere, e senza una
 * riga che lo dica l'importo sembrerebbe semplicemente non essere stato visto. Gli altri
 * campi non compilati non producono avvisi — non compilare è il caso normale, e un avviso
 * che compare sempre è un avviso che si impara a ignorare.
 */
export function sentenceHint(draft: ExpenseDraft): string | null {
  return draft.amountAmbiguous ? t('sentence.twoNumbers') : null;
}

/**
 * Chi ha pagato, secondo la bozza.
 *
 * La regola che non è ovvia: **«tutto a Giulia» dice chi ha pagato**, quando nient'altro lo
 * dice. Nel modello dell'app la modalità `single` mette la spesa a carico di **chi paga**
 * (`split-text.ts`: «`single` non si chiama "Tutto mio"»), quindi una frase che nomina una
 * persona sola e le mette addosso tutta la spesa la sta nominando anche come pagante — è
 * l'unica lettura che il form sa rappresentare, ed è quella giusta nel caso frequente
 * («tutto io»).
 *
 * Un marcatore esplicito vince sempre: in «offro io, tutto a Giulia» ha pagato chi lo dice.
 * Resta una riga da toccare, non un saldo scritto di nascosto.
 */
export function payerOf(draft: ExpenseDraft | undefined, fallback: string): string {
  if (draft === undefined) return fallback;
  if (draft.paidBy !== null) return draft.paidBy;
  if (draft.split?.mode === 'single' && draft.split.memberId !== null) return draft.split.memberId;
  return fallback;
}

/** Come si divide, secondo la bozza: il modo letto, o quello di sempre. */
export function splitModeOf(draft: ExpenseDraft | undefined, fallback: SplitMode): SplitMode {
  return draft?.split?.mode ?? fallback;
}

/**
 * La frase si può scrivere in questa lingua?
 *
 * **Solo italiano, e il punto d'ingresso sparisce — non si rompe.** `ITALIAN_LEXICON` è
 * l'unico lessico che esiste: una grammatica *è* una lingua, e offrire il bottone a chi ha
 * l'app in inglese vorrebbe dire far scrivere una frase che non verrà capita, il che è
 * peggio che non offrirlo. Il giorno che il lessico inglese esiste, questa funzione è la
 * sola riga da cambiare.
 */
export function sentenceAvailable(language: string): boolean {
  return language.toLowerCase().startsWith('it');
}
