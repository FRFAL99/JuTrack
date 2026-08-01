import { StyleSheet, Text, View } from 'react-native';
import { formatMoney, type BudgetState, type BudgetStatus, type Category } from '@jutrack/core';
import { useTheme } from '@/theme';
import { describeBudget } from './format';

interface BudgetRowsProps {
  statuses: BudgetStatus[];
  categories: Category[];
}

/**
 * Quanto resta di ogni limite del mese.
 *
 * Lo stato non è affidato al solo colore: ogni riga porta un'icona e una frase esplicita
 * («superato di 12,00 €»). Un rosso che significhi «sforato» solo per chi lo distingue
 * dal verde non informerebbe nessun altro.
 */
export function BudgetRows({ statuses, categories }: BudgetRowsProps) {
  const { colors, spacing, fontSize } = useTheme();
  const byId = new Map(categories.map((c) => [c.id, c]));

  const tint = (state: BudgetState): string =>
    state === 'over' ? colors.danger : state === 'near' ? colors.warning : colors.income;

  return (
    <View style={{ gap: spacing.md }}>
      {statuses.map((status) => {
        const category = byId.get(status.categoryId);
        const color = tint(status.state);
        // La barra si ferma al 100% anche quando il limite è superato: farla uscire dal
        // contenitore non aggiungerebbe informazione, e quanto si è sforato lo dice la
        // riga di testo.
        const filled = Math.min(1, status.ratio) * 100;

        return (
          <View key={status.categoryId} style={{ gap: spacing.xs }}>
            <View style={styles.row}>
              <Text style={{ fontSize: fontSize.sm }}>{category?.icon ?? '·'}</Text>
              <Text
                numberOfLines={1}
                style={{ flex: 1, color: colors.text, fontSize: fontSize.sm }}
              >
                {category?.name ?? 'Categoria rimossa'}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>
                {formatMoney(status.spentCents)} / {formatMoney(status.limitCents)}
              </Text>
            </View>

            <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surfacePressed }}>
              <View
                style={{ height: 8, width: `${filled}%`, borderRadius: 4, backgroundColor: color }}
              />
            </View>

            <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>
              {describeBudget(status.state, status.remainingCents)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
