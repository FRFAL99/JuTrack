import { Text, View } from 'react-native';
import { useTheme } from '@/theme';
import { Sparkline } from './Sparkline';

interface StatTileProps {
  /** Che numero è. Maiuscoletto, come le etichette di sezione del registro. */
  label: string;
  /** Già formattato: il riquadro non sa se sono euro, giorni o spese. */
  value: string;
  hint?: string;
  /** Serie da disegnare sotto il numero. Meno di due valori non disegnano nulla. */
  values?: number[];
  sparklineLabel?: string;
}

/**
 * Un numero con il suo nome, in colonna.
 *
 * Non è una card, ed è una scelta: la regola del redesign è **una sola card per
 * schermata**, e qui i riquadri sono tre affiancati. A separarli bastano un filetto
 * verticale e l'aria, come nel resto del registro.
 */
export function StatTile({ label, value, hint, values, sparklineLabel }: StatTileProps) {
  const { colors, spacing, fontSize, fontWeight } = useTheme();

  return (
    <View style={{ flex: 1, gap: 2, paddingHorizontal: spacing.sm }}>
      <Text
        numberOfLines={1}
        style={{
          color: colors.textMuted,
          fontSize: fontSize.xxs,
          fontWeight: fontWeight.bold,
          letterSpacing: 1.1,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <Text
        numberOfLines={1}
        style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
      >
        {value}
      </Text>
      {hint !== undefined && (
        <Text numberOfLines={1} style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
          {hint}
        </Text>
      )}
      {values !== undefined && values.length > 1 && (
        <Sparkline
          values={values}
          height={22}
          {...(sparklineLabel !== undefined && { accessibilityLabel: sparklineLabel })}
        />
      )}
    </View>
  );
}
