import { numberFormat } from '@/i18n/money';

/**
 * Le regole del tastierino dell'importo.
 *
 * Fuori dal componente per la stessa ragione di `split-text.ts` e `extra-fields.ts`: sono
 * le uniche parti che potevano essere sbagliate, e i test dell'app non caricano
 * `react-native`.
 *
 * **Perché esiste.** Finché l'importo si scriveva con la tastiera di sistema,
 * `keyboardType="decimal-pad"` impediva da sola il secondo separatore, il terzo decimale e
 * le lettere. Togliendo quella tastiera (decisione 4 del Piano v6) sparisce anche il
 * guardiano: senza queste funzioni il campo mostrerebbe `1,2,3` e l'errore comparirebbe
 * solo al salvataggio. Una validazione a valle non basterebbe — il difetto è che la cifra
 * sbagliata si può **scrivere**.
 */

/**
 * Il tasto che cancella l'ultima cifra.
 *
 * Un carattere vero e non una stringa tipo `'delete'`: così `applyKey` resta una funzione
 * da testo e **un carattere** a testo, e non c'è un secondo vocabolario da ricordare.
 */
export const BACKSPACE = '\b';

/** Più di due decimali `parseAmount` li rifiuta: qui non si possono nemmeno digitare. */
const MAX_DECIMALS = 2;

/**
 * Quante cifre prima del separatore.
 *
 * Nove bastano a 999.999.999 di qualunque valuta, e tengono il totale in centesimi molto
 * sotto `Number.MAX_SAFE_INTEGER`. Senza un tetto, un dito appoggiato sul 9 produrrebbe un
 * numero che il resto dell'app tratta come denaro intero pur non essendolo più.
 */
const MAX_WHOLE_DIGITS = 9;

/**
 * I due separatori decimali che `parseAmount` accetta.
 *
 * `applyKey` li riconosce **entrambi** invece di chiedere quale sia quello della lingua:
 * chi cambia lingua con la schermata aperta si ritroverebbe altrimenti un `12,5` in cui il
 * separatore scritto non conta più come tale, e potrebbe aggiungerne un secondo.
 */
const SEPARATORS = ['.', ','];

/**
 * Il carattere che scrive il primo tasto dell'ultima riga.
 *
 * **Non una virgola fissa.** In inglese la virgola è il separatore delle **migliaia**, e un
 * tasto che la scrivesse sbaglierebbe in tutti e due i versi senza dirlo a nessuno: «12,50»
 * si leggerebbe a schermo come dodicimilacinquanta mentre il core lo intende 12,50, e
 * «1,234» — milleduecentotrentaquattro per chi lo scrive — `parseAmount` lo rifiuta, perché
 * dopo il separatore decimale vede tre cifre. Nessuno dei due casi dà un errore nel momento
 * in cui si preme il tasto. È la stessa trappola che lo Step 39 ha chiuso sul separatore di
 * raggruppamento in `ExpenseForm`.
 *
 * Vale la regola dello Step 38: legge la lingua **quando gira**, e a far ridisegnare è
 * `useTranslation()` nel componente.
 */
export function decimalKey(): string {
  return numberFormat().decimal;
}

/**
 * Il testo dell'importo dopo un tasto del tastierino.
 *
 * Restituisce il testo **invariato** quando il tasto non è ammesso, invece di segnalare un
 * errore: un tasto che non fa niente è ciò che faceva già la tastiera di sistema quando
 * mostrava il terzo decimale disabilitato, e non c'è niente da spiegare a chi preme.
 */
export function applyKey(text: string, char: string): string {
  if (char === BACKSPACE) return text.slice(0, -1);
  if (SEPARATORS.includes(char)) return appendSeparator(text, char);
  if (/^[0-9]$/.test(char)) return appendDigit(text, char);
  return text;
}

/** Un separatore solo, e mai in testa: «,50» si scrive «0,50», che è come si legge. */
function appendSeparator(text: string, char: string): string {
  if (separatorAt(text) >= 0) return text;
  return text === '' ? `0${char}` : `${text}${char}`;
}

function appendDigit(text: string, digit: string): string {
  const at = separatorAt(text);
  if (at >= 0) return text.length - at - 1 >= MAX_DECIMALS ? text : text + digit;
  // Lo zero iniziale è un posto vuoto, non una cifra: chi ha scritto «0» e preme «5» voleva
  // 5, non 05. Il secondo zero di fila cade nello stesso caso e non si accumula.
  if (text === '0') return digit;
  if (text.length >= MAX_WHOLE_DIGITS) return text;
  return text + digit;
}

/** Dov'è il separatore decimale, o −1. */
function separatorAt(text: string): number {
  return text.search(/[.,]/);
}
