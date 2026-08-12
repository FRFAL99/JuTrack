import { Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { bandScale, formatMoney, type WeekdayTotal } from '@jutrack/core';
import { useCurrencySymbol } from '@/state';
import { useTheme } from '@/theme';
import { compactAmount } from '../format';
import { shortWeekdayLabel, weekdayName } from './axis';
import { useChartWidth } from './useChartWidth';

interface WeekdayBarsProps {
  totals: WeekdayTotal[];
  height?: number;
}

/**
 * Quanto si spende in ciascun giorno della settimana.
 *
 * È l'unico grafico dell'app che mostra un'**abitudine** invece di un periodo: non dice
 * quanto è costato agosto, dice che il sabato costa il doppio del martedì. Per questo va
 * alimentato con qualche mese di spese — su due settimane sono sette numeri a caso.
 *
 * Le sette barre ci sono **sempre**, anche a zero: toglierne una farebbe scivolare le
 * altre, e la forma da un mese all'altro non sarebbe più confrontabile, che è l'unica cosa
 * che questo grafico serve a fare.
 */
export function WeekdayBars({ totals, height = 96 }: WeekdayBarsProps) {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const symbol = useCurrencySymbol();
  const { width, onLayout } = useChartWidth();

  const peak = totals.reduce((max, total) => Math.max(max, total.totalCents), 0);
  const band = bandScale(totals.length, Math.max(1, width), 0.34);

  return (
    <View onLayout={onLayout} style={{ gap: spacing.sm }}>
      {width > 0 && totals.length > 0 && (
        <>
          <Svg width={width} height={height}>
            {totals.map((total, index) => {
              // Una traccia di due pixel anche a zero: una barra assente e una barra
              // piccolissima direbbero la stessa cosa, e sono cose diverse.
              const barHeight = peak === 0 ? 2 : Math.max(2, (total.totalCents / peak) * height);
              return (
                <Rect
                  key={total.weekday}
                  x={band.at(index)}
                  y={height - barHeight}
                  width={band.bandWidth}
                  height={barHeight}
                  rx={3}
                  fill={
                    total.totalCents === peak && peak > 0 ? colors.accent : colors.surfacePressed
                  }
                />
              );
            })}
          </Svg>

          <View style={{ flexDirection: 'row' }}>
            {totals.map((total) => (
              <View
                key={total.weekday}
                accessible
                accessibilityLabel={`${weekdayName(total.weekday)}: ${formatMoney(total.totalCents, symbol)}, ${total.count} ${total.count === 1 ? 'spesa' : 'spese'}`}
                style={{ flex: 1, alignItems: 'center', gap: 1 }}
              >
                <Text style={{ color: colors.textMuted, fontSize: fontSize.xxs }}>
                  {shortWeekdayLabel(total.weekday)}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: total.totalCents === peak && peak > 0 ? colors.text : colors.textFaint,
                    fontSize: fontSize.xxs,
                    fontWeight:
                      total.totalCents === peak && peak > 0
                        ? fontWeight.semibold
                        : fontWeight.regular,
                  }}
                >
                  {compactAmount(total.totalCents)}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}
