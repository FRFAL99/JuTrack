import { StyleSheet, Text, View } from 'react-native';
import { formatMoney, type Category, type CategoryTotal } from '@jutrack/core';
import { useTheme } from '@/theme';
import { formatShare } from './format';

interface CategoryBarsProps {
  totals: CategoryTotal[];
  categories: Category[];
}

/**
 * Ripartizione della spesa per categoria.
 *
 * Ogni barra porta il proprio nome, la propria icona e il proprio importo: l'identità non
 * è affidata al colore, che serve solo da rinforzo. È la ragione per cui il grafico resta
 * leggibile anche per chi non distingue due tinte vicine — e perché le barre possono
 * essere ordinate per importo senza che l'ordine renda ambiguo il colore.
 */
export function CategoryBars({ totals, categories }: CategoryBarsProps) {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
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
              <Text style={{ fontSize: fontSize.sm }}>{category?.icon ?? '·'}</Text>
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
                {formatMoney(total.totalCents)}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, minWidth: 34, textAlign: 'right' }}>
                {formatShare(total.share)}
              </Text>
            </View>
            <View
              accessible
              accessibilityLabel={`${name}: ${formatMoney(total.totalCents)}, ${formatShare(total.share)} del totale`}
              style={{ height: 8, borderRadius: 4, backgroundColor: colors.surfacePressed }}
            >
              <View
                style={{
                  height: 8,
                  width: `${width}%`,
                  borderRadius: 4,
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
