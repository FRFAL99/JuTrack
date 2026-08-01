/**
 * Design token.
 *
 * Un unico posto in cui vivono colori, spaziature e tipografia. I componenti non
 * scrivono mai valori letterali: se un colore compare hardcoded in una schermata,
 * è un bug da correggere qui.
 */

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
  pill: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 34,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

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
  /** Superficie in stato premuto */
  surfacePressed: string;
  /** Testo principale */
  text: string;
  /** Testo secondario, didascalie */
  textMuted: string;
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
  surfacePressed: '#EFEFF3',
  text: '#14141B',
  textMuted: '#6B6B76',
  textOnAccent: '#FFFFFF',
  accent: '#3B5BDB',
  accentPressed: '#2F49AF',
  border: '#E3E3E9',
  expense: '#C2255C',
  income: '#2B8A3E',
  danger: '#D93A3A',
  warning: '#C77700',
};

export const darkPalette: Palette = {
  background: '#111116',
  surface: '#1B1B22',
  surfacePressed: '#25252E',
  text: '#F2F2F5',
  textMuted: '#9A9AA6',
  textOnAccent: '#FFFFFF',
  accent: '#748FFC',
  accentPressed: '#5C7CFA',
  border: '#2C2C36',
  expense: '#F06595',
  income: '#51CF66',
  danger: '#FF6B6B',
  warning: '#FFA94D',
};
