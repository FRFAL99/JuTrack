/**
 * Denaro.
 *
 * Regola ferrea del progetto: gli importi sono **interi in centesimi**. Mai float.
 * I float binari non rappresentano esattamente i decimali: `0.1 + 0.2 === 0.30000000000000004`.
 * In un'app che calcola saldi fra due persone quegli errori si accumulano e diventano
 * discrepanze visibili — «mi devi 24,99» invece di «25,00».
 */

/** Importo in centesimi. Alias documentale: TypeScript non ha interi nativi. */
export type Cents = number;

/** Verifica che un valore sia un importo valido in centesimi. */
export function isValidCents(value: number): boolean {
  return Number.isInteger(value) && Number.isFinite(value);
}

/** Come `isValidCents`, ma solleva un errore diagnostico. */
export function assertCents(value: number, label = 'importo'): void {
  if (!isValidCents(value)) {
    throw new Error(
      `${label} non valido: atteso un intero in centesimi, ricevuto ${value}. ` +
        'Gli importi non possono essere float.',
    );
  }
}

/**
 * Converte una stringa digitata dall'utente in centesimi.
 *
 * Accetta sia la virgola che il punto come separatore decimale: su una tastiera
 * numerica italiana l'utente digita `12,30`, ma incollando da un'altra fonte può
 * arrivare `12.30`.
 *
 * Restituisce `null` se l'input non è interpretabile, così chi chiama può mostrare
 * un errore invece di ritrovarsi un `NaN` che si propaga silenziosamente nei totali.
 */
export function parseAmount(input: string): Cents | null {
  const trimmed = input.trim().replace(/\s/g, '');
  if (trimmed === '') return null;

  const normalized = trimmed.replace(',', '.');
  if (!/^-?\d*\.?\d*$/.test(normalized) || normalized === '.' || normalized === '-') return null;

  const [wholePart = '', fracPart = ''] = normalized.replace('-', '').split('.');
  // Più di 2 decimali non è un importo valido: rifiutare è meglio che troncare
  // in silenzio una cifra che l'utente ha digitato di proposito.
  if (fracPart.length > 2) return null;

  const whole = wholePart === '' ? 0 : Number(wholePart);
  const frac = fracPart === '' ? 0 : Number(fracPart.padEnd(2, '0'));
  if (!Number.isFinite(whole) || !Number.isFinite(frac)) return null;

  const cents = whole * 100 + frac;
  return normalized.startsWith('-') ? -cents : cents;
}

/**
 * Come si scrive un numero, e dove va il simbolo.
 *
 * **È una convenzione della lingua, non della moneta.** Mille euro e due si scrivono
 * «1.000,02 €» leggendo in italiano e «€1,000.02» leggendo in inglese: cambiano i due
 * separatori e cambia il lato del simbolo, ma la moneta è la stessa. Per questo il parametro
 * di `formatMoney` è **doppio** — il simbolo viene dalla valuta scelta nel profilo (Step 29),
 * il formato dalla lingua scelta nel profilo (Step 39) — e i due non si deducono l'uno
 * dall'altro.
 *
 * Arriva da fuori come tutto il resto di ciò che il core non può sapere: qui non si importa
 * `i18next`, per la stessa regola dello Step 0 che tiene fuori `react-native`. È lo stesso
 * trattamento già riservato a `RandomSource` e `SecureKeyStore`, applicato a una cosa molto
 * più piccola.
 */
export interface NumberFormat {
  /** Fra le migliaia. */
  group: string;
  /** Prima dei centesimi. */
  decimal: string;
  /** Il simbolo va prima del numero? In inglese sì, in italiano no. */
  symbolFirst: boolean;
  /** Cosa sta fra numero e simbolo: uno spazio in italiano, niente in inglese. */
  symbolSpace: string;
}

/** «1.234,56 €». */
export const ITALIAN_NUMBERS: NumberFormat = {
  group: '.',
  decimal: ',',
  symbolFirst: false,
  symbolSpace: ' ',
};

/** «€1,234.56». */
export const ENGLISH_NUMBERS: NumberFormat = {
  group: ',',
  decimal: '.',
  symbolFirst: true,
  symbolSpace: '',
};

/**
 * Il formato di chi non ne indica uno.
 *
 * È l'italiano perché è la lingua in cui il progetto è scritto, e perché è ciò che tiene
 * validi senza riscriverli i test che c'erano già — gli stessi che fissano `splitEvenly` e
 * `splitByWeights`, dove il formato non c'entra ma le asserzioni passano da qui.
 */
export const DEFAULT_NUMBER_FORMAT = ITALIAN_NUMBERS;

/** Formatta centesimi come stringa, senza simbolo di valuta. */
export function formatCents(cents: Cents, format: NumberFormat = DEFAULT_NUMBER_FORMAT): string {
  assertCents(cents);
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  const groupedWhole = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, format.group);
  return `${negative ? '-' : ''}${groupedWhole}${format.decimal}${String(frac).padStart(2, '0')}`;
}

/**
 * Formatta centesimi con il simbolo di valuta.
 *
 * Il segno meno resta **davanti a tutto**, anche quando il simbolo precede il numero:
 * «-€5,00» e non «€-5,00». È la forma che si legge in entrambe le convenzioni, e l'unica in
 * cui il segno non rischia di sparire alla fine di una riga stretta.
 *
 * **Una lettera attaccata a una cifra prende comunque uno spazio**: «CHF 5.00» e non
 * «CHF5.00». `ENGLISH_NUMBERS` non mette spazio perché i simboli veri — `€`, `$`, `£` — non
 * lo vogliono, ma dove il simbolo *è* un codice (`CHF`, e domani chiunque altro) senza spazio
 * si leggerebbe come una sigla unica. La regola guarda il carattere di confine, non l'elenco
 * delle valute, così una valuta aggiunta in futuro non ha bisogno di essere prevista qui.
 */
export function formatMoney(
  cents: Cents,
  currency = '€',
  format: NumberFormat = DEFAULT_NUMBER_FORMAT,
): string {
  const amount = formatCents(cents, format);
  const border = format.symbolFirst ? currency.at(-1) : currency[0];
  const space = format.symbolSpace === '' && isLetter(border) ? ' ' : format.symbolSpace;

  if (!format.symbolFirst) return `${amount}${space}${currency}`;
  const negative = amount.startsWith('-');
  const digits = negative ? amount.slice(1) : amount;
  return `${negative ? '-' : ''}${currency}${space}${digits}`;
}

function isLetter(char: string | undefined): boolean {
  return char !== undefined && /\p{L}/u.test(char);
}

/**
 * Divide un importo in quote il più possibile uguali, senza perdere né creare centesimi.
 *
 * Il problema: 10,00 € fra 3 persone fa 3,333... € a testa. Arrotondando ciascuna quota
 * si ottengono 3,33 × 3 = 9,99 €, e un centesimo sparisce. Su un'app di saldi condivisi
 * quel centesimo mancante è un bug visibile.
 *
 * Qui il resto viene distribuito in modo **deterministico** ai primi partecipanti: la
 * somma delle quote è garantita uguale al totale. Deterministico e non casuale, perché
 * i due dispositivi devono calcolare la stessa suddivisione senza consultarsi.
 */
export function splitEvenly(total: Cents, parts: number): Cents[] {
  assertCents(total);
  if (!Number.isInteger(parts) || parts < 1) {
    throw new Error(`numero di quote non valido: ${parts}`);
  }

  const sign = total < 0 ? -1 : 1;
  const abs = Math.abs(total);
  const base = Math.floor(abs / parts);
  const remainder = abs % parts;

  return Array.from({ length: parts }, (_, i) => sign * (base + (i < remainder ? 1 : 0)));
}

/**
 * Divide un importo secondo pesi arbitrari, conservando il totale.
 *
 * Usa il metodo dei **maggiori resti**: assegna a ciascuno la parte intera della propria
 * quota, poi distribuisce i centesimi avanzati a chi ha il resto frazionario più alto.
 * A parità di resto vince l'indice più basso, così il risultato è riproducibile su
 * entrambi i dispositivi.
 */
export function splitByWeights(total: Cents, weights: number[]): Cents[] {
  assertCents(total);
  if (weights.length === 0) throw new Error('servono almeno due quote per suddividere');
  if (weights.some((w) => !Number.isFinite(w) || w < 0)) {
    throw new Error('i pesi devono essere numeri non negativi');
  }

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight <= 0) throw new Error('la somma dei pesi deve essere maggiore di zero');

  const sign = total < 0 ? -1 : 1;
  const abs = Math.abs(total);

  const exact = weights.map((w) => (abs * w) / totalWeight);
  const floored = exact.map((v) => Math.floor(v));
  let leftover = abs - floored.reduce((sum, v) => sum + v, 0);

  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);

  const result = [...floored];
  for (const { index } of byRemainder) {
    if (leftover <= 0) break;
    result[index] = (result[index] ?? 0) + 1;
    leftover--;
  }

  return result.map((v) => sign * v);
}
