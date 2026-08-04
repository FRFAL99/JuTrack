/**
 * Design token.
 *
 * Un unico posto in cui vivono colori, spaziature e tipografia. I componenti non
 * scrivono mai valori letterali: se un colore compare hardcoded in una schermata,
 * è un bug da correggere qui.
 *
 * L'unico import è **di tipo** (`TextStyle`), quindi non porta react-native nel bundle di
 * questo modulo: serve a `numeric`, che è uno stile e non un valore.
 */
import type { TextStyle } from 'react-native';

/** Scala di spaziatura in multipli di 4. Usare solo questi valori. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  /** Card eroe e card di sezione: più morbido di `lg`, si legge come un blocco a sé. */
  xl: 20,
  pill: 999,
} as const;

export const fontSize = {
  /** Etichette maiuscoletta, metadati di riga, tab bar. */
  xxs: 11,
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 34,
  /** Importo eroe: il solo numero grande di una schermata. */
  display: 46,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  /** Solo per l'importo eroe (`fontSize.display`): a quella scala anche `bold` si legge sottile. */
  heavy: '800',
} as const;

/**
 * Cifre a larghezza fissa. Va su ogni Text che mostra denaro o una data numerica.
 *
 * Senza, le cifre cambiano larghezza fra una riga e l'altra di una lista e le colonne
 * di importi ballano: è il difetto più visibile di un elenco di spese. Supportato da
 * React Native sia su Android sia su iOS.
 *
 * **Il tipo non è `as const`, e la ragione è che non compilerebbe.** `as const` rende
 * `fontVariant` un tuple `readonly`, e `TextStyle` lo dichiara mutabile: passare questo
 * token a uno `style` darebbe un errore di assegnazione. Il token è nato al passo 1 del
 * redesign scritto così, ed è passato inosservato per tre passi perché **nessuno lo
 * usava** — il primo `Text` che l'ha applicato è stato anche il primo a non compilare.
 * `Pick` invece di `TextStyle` intero: qui si dichiara una cosa sola.
 */
export const numeric: Pick<TextStyle, 'fontVariant'> = { fontVariant: ['tabular-nums'] };

/**
 * Crenatura dei titoli grandi (da 28 in su): a quella scala l'aria di default è troppa
 * e le parole si sfilacciano. Sotto i 28 non serve e stringerebbe troppo.
 */
export const tightTitle = { letterSpacing: -0.6 } as const;

/**
 * Palette semantica: i nomi dicono a cosa serve il colore, non che colore è.
 * Rinominare "verde" in "successo" evita di dover riscrivere le schermate quando
 * la palette cambia.
 */
export interface Palette {
  /** Sfondo della schermata */
  background: string;
  /** Sfondo di superfici sopraelevate (card, modali) */
  surface: string;
  /**
   * Superficie della card eroe: **una sola per schermata**.
   *
   * Se la usassero due blocchi della stessa schermata, nessuno dei due sarebbe più il
   * centro: è un token che vale per la regola che porta con sé, non per il colore. Sul
   * tema scuro stacca da `surface`; su quello chiaro coincide, e a distinguerla restano
   * bordo e raggio.
   */
  surfaceRaised: string;
  /** Superficie in stato premuto */
  surfacePressed: string;
  /** Separatore fra le righe di una stessa lista: più tenue di `border`, che contorna. */
  divider: string;
  /** Testo principale */
  text: string;
  /** Testo secondario, didascalie */
  textMuted: string;
  /** Testo terziario: metadati, piè di pagina, identificativi. Mai per il contenuto. */
  textFaint: string;
  /** Testo su sfondo accent */
  textOnAccent: string;
  /** Colore d'accento per azioni primarie */
  accent: string;
  /** Accento in stato premuto */
  accentPressed: string;
  /** Bordi e separatori */
  border: string;
  /** Uscite di denaro */
  expense: string;
  /** Entrate, saldi a credito */
  income: string;
  /** Stati di errore e azioni distruttive */
  danger: string;
  /** Avvisi, budget vicino al limite */
  warning: string;
}

export const lightPalette: Palette = {
  background: '#F7F7F9',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  surfacePressed: '#EFEFF3',
  divider: '#EDEDF1',
  text: '#14141B',
  textMuted: '#6B6B76',
  textFaint: '#9A9AA6',
  textOnAccent: '#FFFFFF',
  accent: '#3B5BDB',
  accentPressed: '#2F49AF',
  border: '#E3E3E9',
  expense: '#C2255C',
  income: '#2B8A3E',
  danger: '#D93A3A',
  warning: '#C77700',
};

/**
 * I grigi scuri sono una scala, non quattro valori scelti a occhio: il fondo è più scuro
 * di ogni superficie, altrimenti card e sfondo si leggono uguali e la gerarchia sparisce.
 * Accento, semantici e colori di categoria non sono toccati.
 */
export const darkPalette: Palette = {
  background: '#0B0B10',
  surface: '#15151C',
  surfaceRaised: '#171722',
  surfacePressed: '#1F1F28',
  divider: '#1F1F28',
  text: '#F2F2F5',
  textMuted: '#9A9AA6',
  textFaint: '#4A4A56',
  textOnAccent: '#FFFFFF',
  accent: '#748FFC',
  accentPressed: '#5C7CFA',
  border: '#2C2C36',
  expense: '#F06595',
  income: '#51CF66',
  danger: '#FF6B6B',
  warning: '#FFA94D',
};
