import type { SplitMode } from '@jutrack/core';
import i18n from '@/i18n';
import { t } from '@/i18n/translate';
import { extraSummary } from './extra-fields';
import { formatDayTitle } from './grouping';
import { splitModeLabel } from './split-text';

/**
 * Le frasi delle tre righe chiuse della nuova spesa.
 *
 * Fuori dal componente per la stessa ragione di `split-text.ts` e `extra-fields.ts`: sono le
 * uniche parti che potevano essere sbagliate, e i test dell'app non caricano `react-native`.
 *
 * **La regola che governa tutte e tre** (decisione 8 del Piano v6): la riga chiusa porta il
 * **valore**, non un segnaposto. È quella che `extraSummary` già applicava alla sola tendina
 * di oggi, estesa ai tre gruppi — perché nascondere campi *compilati* dietro una riga muta è
 * il modo in cui i dati si perdono senza che nessuno se ne accorga.
 */

/**
 * Il peso di un pezzo di riassunto.
 *
 * `faint` è **solo** per i segnaposto, ed è la metà della regola che vale di più: il commento
 * in `tokens.ts` dice «testo terziario, mai per il contenuto», e un riassunto scritto tutto a
 * 2,1:1 di contrasto *è* una riga muta. Un valore vero sta in `strong` o in `muted` a seconda
 * di quanto è il soggetto della riga, mai più in basso.
 *
 * `danger` non lo produce nessuna di queste funzioni: lo aggiunge `ExpenseForm` per l'unico
 * stato che un riassunto non può limitarsi a descrivere — quote libere che non quadrano, dove
 * a gruppo chiuso il salva sarebbe spento senza che nulla a schermo dica perché.
 */
export type SummaryTone = 'strong' | 'muted' | 'faint' | 'danger';

export interface SummaryPart {
  text: string;
  tone: SummaryTone;
}

/** «Paghi tu · metà e metà». */
export function payerSummary(
  payer: { name: string; isMe: boolean },
  mode: SplitMode,
  memberCount: number,
): SummaryPart[] {
  const who = payer.isMe
    ? t('expense.group.payerMe')
    : t('expense.group.payerOther', { name: payer.name });
  return [
    { text: who, tone: 'strong' },
    { text: midSentence(splitModeLabel(mode, memberCount)), tone: 'muted' },
  ];
}

/** «Casa», oppure «Categoria · nessuna» quando non ne è stata scelta una. */
export function categorySummary(name: string | null): SummaryPart[] {
  if (name !== null) return [{ text: name, tone: 'strong' }];
  return [
    { text: t('expense.category'), tone: 'strong' },
    { text: t('expense.group.categoryNone'), tone: 'faint' },
  ];
}

/**
 * «Oggi · facoltativi», oppure «Oggi · una nota · Esselunga · 2 tag».
 *
 * La data c'è **sempre** e non è mai un segnaposto: su una spesa vecchia è l'unica cosa che
 * dice di quale giorno si sta parlando, ed è la ragione per cui la riga non può limitarsi a
 * dire «Dettagli». Il resto lo compone `extraSummary`, che tronca già il nome del negozio
 * per non far mangiare al `numberOfLines` proprio il «· 2 tag» in coda.
 */
export function detailsSummary(
  date: string,
  note: string,
  store: string,
  tags: string[],
  /** Come in `formatDayTitle`: iniettabile perché «Oggi» dipende da che giorno è. */
  now: Date = new Date(),
): SummaryPart[] {
  const filled: string[] = [];
  if (note.trim() !== '') filled.push(t('expense.group.detailsNote'));
  if (store.trim() !== '' || tags.some((tag) => tag.trim() !== '')) {
    filled.push(extraSummary(store, tags));
  }

  return [
    { text: formatDayTitle(date, now), tone: 'muted' },
    filled.length === 0
      ? { text: t('expense.group.detailsEmpty'), tone: 'faint' }
      : // Il punto mediano resta nel codice: è punteggiatura, non una parola, e si scrive
        // uguale in tutte e due le lingue. Stessa scelta di `extraSummary`.
        { text: filled.join(' · '), tone: 'muted' },
  ];
}

/**
 * Un'etichetta a metà frase: «Paghi tu · metà e metà», non «· Metà e metà».
 *
 * **Limite dichiarato**: vale per italiano e inglese, dove un nome comune non porta la
 * maiuscola dentro la frase. In tedesco i nomi la portano, e lì servirebbe una chiave propria
 * invece della minuscolizzazione. Non è il caso di oggi — `numberFormat()` dichiara già che
 * l'app conosce due lingue e tratta come italiano tutto ciò che non è inglese.
 */
function midSentence(label: string): string {
  return label.toLocaleLowerCase(i18n.language);
}
