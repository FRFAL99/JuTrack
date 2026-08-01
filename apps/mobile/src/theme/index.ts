import { useColorScheme } from 'react-native';
import {
  darkPalette,
  fontSize,
  fontWeight,
  lightPalette,
  radius,
  spacing,
  type Palette,
} from './tokens';

export { spacing, radius, fontSize, fontWeight };
export type { Palette };

export interface Theme {
  colors: Palette;
  isDark: boolean;
  spacing: typeof spacing;
  radius: typeof radius;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
}

/**
 * Tema corrente, seguendo l'impostazione di sistema chiaro/scuro.
 *
 * Restituisce un oggetto nuovo a ogni cambio di schema: i componenti che ne derivano
 * stili con useMemo devono includerlo nelle dipendenze.
 */
export function useTheme(): Theme {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return {
    colors: isDark ? darkPalette : lightPalette,
    isDark,
    spacing,
    radius,
    fontSize,
    fontWeight,
  };
}
