import { Pressable, Text, View } from 'react-native';
import { formatMoney, type MonthTotal } from '@jutrack/core';
import { shortMonthLabel } from '@/features/expenses/grouping';
import { useTheme } from '@/theme';
import { compactAmount } from './format';

interface MonthlyBarsProps {
  months: MonthTotal[];
  /** Mese messo in evidenza; toccando una barra si sposta qui. */
  selected: string;
  onSelect: (month: string) => void;
}

const CHART_HEIGHT = 120;

/**
 * Andamento mese per mese.
 *
 * Una serie sola, quindi un colore solo e nessuna legenda: il titolo dice già cosa sono
 * le barre. L'importo compare **solo** sul mese selezionato e sul più alto del periodo —
 * un numero su ogni barra trasformerebbe il grafico in una tabella storta, e il senso di
 * un andamento sta nella forma, non nelle cifre.
 *
 * I mesi senza spese restano in asse come barre vuote: toglierli accosterebbe mesi
 * lontani facendo sembrare regolare un andamento che non lo è.
 */
export function MonthlyBars({ months, selected, onSelect }: MonthlyBarsProps) {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const peak = months.reduce((max, m) => Math.max(max, m.totalCents), 0);

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: CHART_HEIGHT }}>
        {months.map((month) => {
          const isSelected = month.month === selected;
          const isPeak = peak > 0 && month.totalCents === peak;
          const height = peak === 0 ? 0 : (month.totalCents / peak) * (CHART_HEIGHT - 22);

          return (
            <Pressable
              key={month.month}
              onPress={() => onSelect(month.month)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${shortMonthLabel(month.month)}: ${formatMoney(month.totalCents)}`}
              style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}
            >
              {(isSelected || isPeak) && month.totalCents > 0 && (
                <Text
                  numberOfLines={1}
                  style={{
                    color: isSelected ? colors.text : colors.textMuted,
                    fontSize: fontSize.xs,
                    fontWeight: isSelected ? fontWeight.semibold : fontWeight.regular,
                  }}
                >
                  {compactAmount(month.totalCents)}
                </Text>
              )}
              <View
                style={{
                  width: '100%',
                  // Una traccia minima anche a zero: una barra assente e una barra
                  // piccolissima direbbero la stessa cosa, e sono cose diverse.
                  height: Math.max(2, height),
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                  backgroundColor: isSelected
                    ? colors.accent
                    : month.totalCents === 0
                      ? colors.border
                      : colors.surfacePressed,
                }}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: 6 }}>
        {months.map((month) => (
          <Text
            key={month.month}
            numberOfLines={1}
            style={{
              flex: 1,
              textAlign: 'center',
              color: month.month === selected ? colors.text : colors.textMuted,
              fontSize: fontSize.xs,
            }}
          >
            {shortMonthLabel(month.month)}
          </Text>
        ))}
      </View>
    </View>
  );
}
