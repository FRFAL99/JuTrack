/**
 * Le valute che l'app sa scrivere accanto a un numero.
 *
 * **Solo il simbolo, mai un tasso di cambio.** JuTrack non converte e non convertirà in
 * questo giro: un tasso ha una data, una fonte e un errore, e nessuna delle tre cose esiste
 * in un'app che gira offline su due telefoni. Sommare importi in valute diverse dà un numero
 * che non significa niente, quindi la valuta è di fatto **una scelta che un gruppo fa
 * insieme**, anche se il campo che la porta è locale al telefono (`Profile.currency`) e non
 * viene mai scritto nel documento condiviso.
 *
 * **Niente valute a zero decimali** (JPY, KRW…): tutto il progetto è in centesimi e
 * `formatCents` stampa sempre due cifre dopo la virgola. «1.000,00 ¥» non è un modo di
 * scrivere mille yen, è un'etichetta falsa accanto a un numero.
 *
 * **Niente simboli ambigui**: `kr` da solo vale per corona svedese, norvegese e danese. Dove
 * il simbolo non distingue, si usa il codice — che è brutto e vero, invece che breve e falso.
 *
 * La posizione del simbolo (in coda, «12,00 €») e il separatore decimale (la virgola) non
 * cambiano con la valuta: sono convenzioni della **lingua** in cui si legge, non della moneta
 * che si spende, e vivono nello Step 37 insieme al resto dell'i18n.
 */

export interface CurrencyChoice {
  /** Codice ISO 4217. È ciò che finisce in `Expense.currency` e in `Profile.currency`. */
  code: string;
  /** Come si scrive accanto al numero. */
  symbol: string;
  /** Il nome per esteso, per l'etichetta di accessibilità del selettore. */
  name: string;
}

/**
 * Elenco corto di proposito.
 *
 * Non è un catalogo di tutte le valute del mondo: è quello che il selettore mostra, e un
 * selettore con centosessanta voci non si usa. Aggiungerne una è una riga — purché abbia due
 * decimali e un simbolo che non si confonde con un altro.
 */
export const CURRENCIES: readonly CurrencyChoice[] = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'Dollaro statunitense' },
  { code: 'GBP', symbol: '£', name: 'Sterlina britannica' },
  { code: 'CHF', symbol: 'CHF', name: 'Franco svizzero' },
  { code: 'CAD', symbol: 'CA$', name: 'Dollaro canadese' },
  { code: 'AUD', symbol: 'A$', name: 'Dollaro australiano' },
] as const;

/**
 * La valuta di chi non ne ha scelta una.
 *
 * È anche quella che `VaultStore` scrive su una spesa senza `currency`, quindi cambiarla qui
 * non basterebbe a cambiare il passato: le spese già registrate portano la propria.
 */
export const DEFAULT_CURRENCY = 'EUR';

/** Il simbolo di un codice, o **il codice stesso** se non è fra quelli noti. */
export function currencySymbol(code: string): string {
  return CURRENCIES.find((currency) => currency.code === code)?.symbol ?? code;
}

/**
 * Il codice è fra quelli che il selettore propone?
 *
 * Serve a chi legge un valore che arriva da fuori — il profilo salvato su disco, una spesa
 * scritta dall'altro telefono — e non a chi lo mostra: `currencySymbol` un codice ignoto lo
 * scrive comunque, perché «12,00 NOK» è più utile di «12,00 €» quando la spesa è in corone.
 */
export function isKnownCurrency(code: string): boolean {
  return CURRENCIES.some((currency) => currency.code === code);
}
