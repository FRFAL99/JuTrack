import { plural, t } from '@/i18n/translate';

/**
 * Le due regole della sezione «Informazioni aggiuntive».
 *
 * Fuori dal componente per la stessa ragione di `split-text.ts`: sono le uniche parti che
 * potevano essere sbagliate, e i test dell'app non caricano `react-native`.
 */

/**
 * Quanto del nome del negozio entra nella riga chiusa.
 *
 * Il `numberOfLines={1}` del `Text` impedirebbe già l'a capo, ma taglierebbe **la fine**
 * della stringa — cioè proprio il «· 2 tag», che è l'informazione che dice che lì sotto c'è
 * dell'altro. Troncando il negozio si perde la coda del nome, che è la parte che importa
 * meno.
 */
const MAX_STORE_CHARS = 20;

/**
 * Quanto può essere lunga la nota di una spesa.
 *
 * **Un limite di scrittura, non di resa**: `MAX_STORE_CHARS` qui sopra tronca ciò che si
 * mostra in una riga chiusa, e non impedisce a niente di entrare nel documento. Il nome del
 * gruppo, quello del profilo, quello dell'invito e le voci del vocabolario un tetto ce
 * l'hanno tutti; la nota era l'ultimo campo della spesa senza, e un testo incollato da
 * chissà dove finiva nel vault, nell'export e in ogni update verso il relay.
 *
 * 140 e non 24 come il profilo: questa è una frase — «cena con i suoi», «benzina per il
 * viaggio in Puglia» — non un'etichetta. Il limite serve a fermare un incollaggio, non a
 * costringere chi scrive a essere breve.
 */
export const MAX_EXPENSE_NOTE = 140;

/**
 * Il riassunto della riga chiusa: «Esselunga · 2 tag», oppure «Facoltativi».
 *
 * Nascondere dietro una tendina muta dei campi **compilati** è il modo in cui i dati si
 * perdono senza che nessuno se ne accorga: chi riapre una spesa vecchia per correggerla
 * deve vedere dalla riga chiusa che lì sotto c'è qualcosa.
 */
export function extraSummary(store: string, tags: string[]): string {
  const name = truncate(store.trim());
  const count = tags.filter((tag) => tag.trim() !== '').length;
  // «tag» è invariabile in italiano — le due forme del dizionario sono identiche — ma non in
  // inglese, dove al plurale prende la s. Passare comunque da `plural` costa una chiave in
  // più e toglie un caso particolare da ricordare.
  const tagged = count === 0 ? '' : plural('expense.extra.tagCount', count);

  // Il punto mediano resta nel codice: è punteggiatura, non una parola, e si scrive uguale
  // in tutte e due le lingue. Una chiave per un separatore sarebbe una chiave da tenere
  // allineata senza niente in cambio.
  if (name !== '' && tagged !== '') return `${name} · ${tagged}`;
  if (name !== '') return name;
  if (tagged !== '') return tagged;
  return t('expense.extra.optional');
}

/** Taglia per grafemi e non per unità UTF-16: `name[0]` spezzerebbe una coppia surrogata. */
function truncate(value: string): string {
  const chars = Array.from(value);
  return chars.length <= MAX_STORE_CHARS
    ? value
    : chars.slice(0, MAX_STORE_CHARS).join('').trimEnd() + '…';
}
