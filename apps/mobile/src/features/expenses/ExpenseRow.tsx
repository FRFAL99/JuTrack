import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { currencySymbol, type Category, type Expense, type Member } from '@jutrack/core';
import { formatCents, formatMoney } from '@/i18n/money';
import { CategoryIcon } from '@/features/categories/CategoryIcon';
import { numeric, useTheme } from '@/theme';

interface ExpenseRowProps {
  expense: Expense;
  category: Category | undefined;
  paidByMember: Member | undefined;
  /**
   * Quanto questa spesa sposta fra me e gli altri, da `yourShareCents`.
   *
   * Opzionale perché a zero non si disegna: una spesa tutta mia e pagata da me non ha
   * niente da dire in quella colonna, e uno `0,00` accanto a ogni riga farebbe sembrare
   * che ci sia un conto aperto anche dove non c'è.
   */
  yourShareCents?: number;
  onPress: () => void;
}

export function ExpenseRow({
  expense,
  category,
  paidByMember,
  yourShareCents,
  onPress,
}: ExpenseRowProps) {
  const { t } = useTranslation();
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();

  // **La valuta della spesa, non quella del profilo**: qui si guarda un importo preciso,
  // scritto un giorno preciso, e `Expense.currency` è l'unico posto che lo sa. È l'unica
  // riga dell'app in cui il simbolo non viene dal telefono che guarda — ovunque si sommino
  // più spese non si può fare altrimenti, perché una somma non ha una valuta propria.
  const symbol = currencySymbol(expense.currency);

  // La nota è l'informazione più utile quando c'è; altrimenti la categoria. Il nome della
  // categoria **non** passa da `t`: viene dal documento condiviso, e lo ha scritto qualcuno.
  // Solo il suo posto vuoto è testo dell'app.
  const title =
    expense.note.trim() !== '' ? expense.note : (category?.name ?? t('expense.row.uncategorized'));
  const subtitle = expense.note.trim() !== '' && category !== undefined ? category.name : undefined;

  const share = yourShareCents ?? 0;
  // Segno e cifra restano fuori dal dizionario e arrivano insieme come `{{amount}}`: il
  // meno tipografico e la posizione del segno non cambiano con la lingua, la frase che gli
  // sta intorno sì.
  const shareLabel =
    share === 0
      ? null
      : t('expense.row.share', {
          amount: `${share > 0 ? '+' : '−'}${formatCents(Math.abs(share))}`,
        });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        shareLabel === null
          ? `${title}, ${formatMoney(expense.amountCents, symbol)}`
          : `${title}, ${formatMoney(expense.amountCents, symbol)}, ${shareLabel}`
      }
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? colors.surfacePressed : 'transparent',
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
        <CategoryIcon icon={category?.icon} color={category?.color ?? colors.textMuted} size={19} />
      </View>

      <View style={styles.middle}>
        <Text
          numberOfLines={1}
          style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.medium }}
        >
          {title}
        </Text>
        <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: fontSize.xxs }}>
          {[subtitle, paidByMember?.name].filter(Boolean).join(' · ')}
        </Text>
      </View>

      <View style={styles.amounts}>
        <Text
          style={[
            numeric,
            { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
          ]}
        >
          {formatMoney(expense.amountCents, symbol)}
        </Text>
        {shareLabel !== null && (
          <Text
            style={[
              numeric,
              {
                color: share > 0 ? colors.income : colors.expense,
                fontSize: fontSize.xxs,
              },
            ]}
          >
            {shareLabel}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  middle: { flex: 1, gap: 2 },
  amounts: { alignItems: 'flex-end', gap: 2 },
});
