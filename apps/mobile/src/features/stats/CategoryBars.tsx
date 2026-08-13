import { StyleSheet, Text, View } from 'react-native';
import { type Category, type CategoryTotal } from '@jutrack/core';
import { formatMoney } from '@/i18n/money';
import { useCurrencySymbol } from '@/state';
import { useTheme } from '@/theme';
import { formatShare } from './format';

interface CategoryBarsProps {
  totals: CategoryTotal[];
  categories: Category[];
}

/**
 * Ripartizione della spesa per categoria, in forma registro.
 *
 * Niente icona: il colore della barra e il nome bastano a distinguere le voci, ed era
 * l'unico posto in cui l'icona ripeteva un'informazione già data dal colore stesso. La
 * percentuale sta a sinistra, a larghezza fissa, perché è il numero che si confronta voce
 * per voce — l'importo, che si legge una riga alla volta, sta a destra.
 */
export function CategoryBars({ totals, categories }: CategoryBarsProps) {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const symbol = useCurrencySymbol();
  const byId = new Map(categories.map((c) => [c.id, c]));

  // Le larghezze sono rapportate alla voce più alta, non al totale: sul totale la barra
  // maggiore occuperebbe una frazione minuscola e il confronto fra le voci sparirebbe.
  const peak = totals.reduce((max, t) => Math.max(max, t.totalCents), 0);

  return (
    <View style={{ gap: spacing.md }}>
      {totals.map((total) => {
        const category = total.categoryId === null ? null : byId.get(total.categoryId);
        const name = category?.name ?? 'Senza categoria';
        const color = category?.color ?? colors.textMuted;
        const width = peak === 0 ? 0 : Math.max(2, (total.totalCents / peak) * 100);

        return (
          <View key={total.categoryId ?? 'none'} style={{ gap: spacing.xs }}>
            <View style={styles.row}>
              <Text style={{ width: 26, color: colors.textMuted, fontSize: fontSize.xs }}>
                {formatShare(total.share)}
              </Text>
              <Text
                numberOfLines={1}
                style={{ flex: 1, color: colors.text, fontSize: fontSize.sm }}
              >
                {name}
              </Text>
              <Text
                style={{
                  color: colors.text,
                  fontSize: fontSize.sm,
                  fontWeight: fontWeight.semibold,
                }}
              >
                {formatMoney(total.totalCents, symbol)}
              </Text>
            </View>
            <View
              accessible
              accessibilityLabel={`${name}: ${formatMoney(total.totalCents, symbol)}, ${formatShare(total.share)} del totale`}
              style={{ height: 3, borderRadius: 1.5, backgroundColor: colors.surfacePressed }}
            >
              <View
                style={{
                  height: 3,
                  width: `${width}%`,
                  borderRadius: 1.5,
                  backgroundColor: color,
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
