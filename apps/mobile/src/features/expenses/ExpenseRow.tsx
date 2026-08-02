import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatMoney, type Category, type Expense, type Member } from '@jutrack/core';
import { CategoryIcon } from '@/features/categories/CategoryIcon';
import { useTheme } from '@/theme';

interface ExpenseRowProps {
  expense: Expense;
  category: Category | undefined;
  paidByMember: Member | undefined;
  onPress: () => void;
}

export function ExpenseRow({ expense, category, paidByMember, onPress }: ExpenseRowProps) {
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();

  // La nota è l'informazione più utile quando c'è; altrimenti la categoria.
  const title = expense.note.trim() !== '' ? expense.note : (category?.name ?? 'Senza categoria');
  const subtitle = expense.note.trim() !== '' && category !== undefined ? category.name : undefined;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${formatMoney(expense.amountCents)}`}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? colors.surfacePressed : colors.surface,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          gap: spacing.md,
        },
      ]}
    >
      <View
        style={[
          styles.icon,
          {
            backgroundColor: (category?.color ?? colors.textMuted) + '22',
            borderRadius: radius.md,
          },
        ]}
      >
        <CategoryIcon icon={category?.icon} color={category?.color ?? colors.textMuted} size={20} />
      </View>

      <View style={styles.middle}>
        <Text
          numberOfLines={1}
          style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.medium }}
        >
          {title}
        </Text>
        <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: fontSize.xs }}>
          {[subtitle, paidByMember?.name].filter(Boolean).join(' · ')}
        </Text>
      </View>

      <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}>
        {formatMoney(expense.amountCents)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  middle: { flex: 1, gap: 2 },
});
