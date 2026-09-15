/**
 * Da testo a token, e il registro di ciò che è già stato capito.
 *
 * **Si tokenizza sul testo originale, non su quello ripulito.** La tentazione è
 * normalizzare prima — minuscole, spazi collassati — e tokenizzare poi: è una riga in meno
 * e rompe l'evidenziazione. Gli estremi finirebbero a puntare la stringa ripulita, e i
 * caratteri colorati sarebbero quelli sbagliati **solo nelle frasi con due spazi di fila o
 * una maiuscola accentata**, cioè quasi mai mentre si prova e sempre a casa di qualcun
 * altro. Qui ogni token conserva il proprio intervallo originale e ne porta *anche* la
 * forma ripiegata, che serve solo al confronto.
 *
 * Le forme ripiegate sono due, e non è un doppione:
 *
 * - `key` è la chiave con cui il vocabolario del gruppo riconosce le sue parole, e deve
 *   essere **esattamente** quella di `storeKey`/`tagKey` — accenti compresi, perché
 *   «città» e «citta» sono due negozi diversi finché `naming.ts` la pensa così.
 * - `plain` è senza accenti, e serve solo al lessico: chi scrive in fretta batte «meta»
 *   per «metà», e una grammatica che non lo accetta si fa usare una volta sola.
 */
import { storeKey, tidy } from '../insights/naming';

/** Una parola della frase, con il posto da cui viene. */
export interface Token {
  /** Il testo esatto, com'è stato scritto. */
  raw: string;
  /** Primo carattere nel testo originale, incluso. */
  start: number;
  /** Ultimo carattere nel testo originale, escluso. */
  end: number;
  /** `raw` senza la punteggiatura ai margini: è ciò che si confronta davvero. */
  core: string;
  /** Forma canonica del vocabolario, identica a `storeKey(core)`. */
  key: string;
  /** Come `key`, ma senza accenti e con l'apostrofo dritto. Solo per il lessico. */
  plain: string;
}

/**
 * Cosa si toglie dai margini di una parola.
 *
 * Non c'è l'apostrofo: sta **dentro** «l'altro», e toglierlo dai margini non servirebbe a
 * nulla mentre complicherebbe la voce del lessico. Non c'è il `€`, che è un marcatore di
 * valuta e lo legge `amount.ts`. C'è il `#`, così `#casa` trova il tag `casa`.
 */
const EDGE_PUNCTUATION = /^[.,;:!?…()[\]{}"«»„“”*#]+|[.,;:!?…()[\]{}"«»„“”*#]+$/g;

/**
 * Le vocali accentate dell'italiano, una per una.
 *
 * Non `normalize('NFD')`: l'app gira su **Hermes**, dove la normalizzazione Unicode non è
 * garantita come su Node, e una grammatica che funziona nei test e non sul telefono è il
 * genere di guasto che costa una sessione a trovare. Nove coppie di caratteri non hanno
 * bisogno di una tabella Unicode.
 */
const ACCENTS: Record<string, string> = {
  à: 'a',
  á: 'a',
  è: 'e',
  é: 'e',
  ì: 'i',
  í: 'i',
  ò: 'o',
  ó: 'o',
  ù: 'u',
  ú: 'u',
};

/** Minuscolo senza accenti, con l'apostrofo tipografico riportato a quello dritto. */
export function fold(value: string): string {
  let out = '';
  for (const char of storeKey(value).replace(/[’‘]/g, "'")) {
    out += ACCENTS[char] ?? char;
  }
  return out;
}

/** Le parole di una frase, ognuna col proprio posto. Gli spazi non producono token. */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const pattern = /\S+/gu;
  let match = pattern.exec(text);
  while (match !== null) {
    const raw = match[0];
    const core = raw.replace(EDGE_PUNCTUATION, '');
    tokens.push({
      raw,
      start: match.index,
      end: match.index + raw.length,
      core,
      key: storeKey(core),
      plain: fold(core),
    });
    match = pattern.exec(text);
  }
  return tokens;
}

/** Il registro di ciò che è stato consumato: una casella per token, tutte libere. */
export function newTaken(count: number): boolean[] {
  return Array.from({ length: count }, () => false);
}

/** Il token esiste e nessun riconoscitore l'ha ancora preso? */
export function isFree(taken: boolean[], index: number): boolean {
  return taken[index] === false;
}

/** Tutti i token da `from` a `to`, estremi inclusi, sono liberi? */
export function areFree(taken: boolean[], from: number, to: number): boolean {
  for (let i = from; i <= to; i++) {
    if (!isFree(taken, i)) return false;
  }
  return true;
}

/** Segna come consumato l'intervallo `from`–`to`, estremi inclusi. */
export function take(taken: boolean[], from: number, to: number): void {
  for (let i = from; i <= to; i++) taken[i] = true;
}

/** L'intervallo di caratteri coperto da un gruppo di token, sul testo originale. */
export function spanOf(tokens: Token[], from: number, to: number): { start: number; end: number } {
  const first = tokens[from];
  const last = tokens[to];
  if (first === undefined || last === undefined) return { start: 0, end: 0 };
  return { start: first.start, end: last.end };
}

/** Le forme del vocabolario di un gruppo di token, unite da un solo spazio. */
export function keyOf(tokens: Token[], from: number, to: number): string {
  return storeKey(
    tokens
      .slice(from, to + 1)
      .map((token) => token.core)
      .join(' '),
  );
}

/** Le forme del lessico di un gruppo di token, unite da un solo spazio. */
export function plainOf(tokens: Token[], from: number, to: number): string {
  return tokens
    .slice(from, to + 1)
    .map((token) => token.plain)
    .join(' ');
}

/** Ciò che nessuno ha capito, nell'ordine in cui è stato scritto. */
export function leftover(tokens: Token[], taken: boolean[]): string {
  const words = tokens.filter((_, index) => isFree(taken, index)).map((token) => token.raw);
  return tidy(words.join(' '));
}
