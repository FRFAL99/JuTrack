import { StyleSheet, View, type ViewProps } from 'react-native';
import { useTheme } from '@/theme';

export type CardVariant = 'default' | 'flat' | 'raised';

interface CardProps extends ViewProps {
  /**
   * - `default` — la forma di sempre: superficie, bordo, padding. **È il default apposta**:
   *   la usano 46 punti dell'app, molti fuori dal redesign (backup, invito, azzeramento), e
   *   cambiare il significato di `<Card>` li ridisegnerebbe tutti insieme senza che nessuna
   *   di quelle schermate compaia in un diff.
   * - `flat` — contenitore di lista: niente bordo e **niente padding**, che lo mettono le
   *   righe dentro, così i loro stati di pressione arrivano fino al bordo del contenitore.
   * - `raised` — la card eroe, **una per schermata**: sul tema scuro l'unica superficie più
   *   chiara del fondo, con l'angolo più morbido. Se ce ne fossero due, nessuna sarebbe il
   *   centro.
   */
  variant?: CardVariant;
}

/** Superficie sopraelevata per raggruppare contenuti correlati. */
export function Card({ variant = 'default', style, children, ...rest }: CardProps) {
  const { colors, spacing, radius } = useTheme();

  const shape = {
    default: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
    },
    flat: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: 0,
      borderWidth: 0,
      // Le righe dentro hanno uno sfondo pieno che, premuto, squadrerebbe gli angoli del
      // contenitore: senza padding non c'è margine che lo nasconda.
      overflow: 'hidden' as const,
    },
    raised: {
      backgroundColor: colors.surfaceRaised,
      borderRadius: radius.xl,
      padding: spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
    },
  }[variant];

  return (
    <View style={[{ ...shape, borderColor: colors.border }, style]} {...rest}>
      {children}
    </View>
  );
}
