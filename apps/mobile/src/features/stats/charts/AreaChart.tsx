import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Line, Path } from 'react-native-svg';
import { areaPath, linearScale, linePath, niceTicks, type Point } from '@jutrack/core';
import { formatMoney } from '@/i18n/money';
import { useCurrencySymbol } from '@/state';
import { useTheme } from '@/theme';
import { compactAmount } from '../format';
import { labelIndices, type ChartPoint } from './axis';
import { useChartWidth } from './useChartWidth';

interface AreaChartProps {
  points: ChartPoint[];
  height?: number;
  /**
   * Riferimento orizzontale: dove si sarebbe arrivati andando di questo passo.
   *
   * Serve alla curva cumulata — «a metà mese ero già oltre?» non si risponde senza un
   * termine di paragone — e si disegna tratteggiata, con la sua etichetta.
   */
  referenceCents?: number;
  referenceLabel?: string;
  maxLabels?: number;
}

const GUTTER = 40;
const TOP_INSET = 6;

/**
 * La stessa linea, chiusa sulla base: l'area sotto la curva.
 *
 * Si usa dove il valore **si accumula** — quanto si è arrivati a spendere dall'inizio del
 * mese — perché lì la superficie è il totale e non un abbellimento. Su una serie che sale
 * e scende sarebbe soltanto una linea più grassa, e per quella c'è `LineChart`.
 *
 * La spezzata è di proposito: una curva morbida su una cumulata inventerebbe pendenze nei
 * giorni in cui non si è speso niente, che sono precisamente i tratti piatti da leggere.
 */
export function AreaChart({
  points,
  height = 140,
  referenceCents,
  referenceLabel,
  maxLabels = 5,
}: AreaChartProps) {
  const { t } = useTranslation();
  const { colors, spacing, fontSize } = useTheme();
  const symbol = useCurrencySymbol();
  const { width, onLayout } = useChartWidth();

  const plotWidth = Math.max(1, width - GUTTER);
  const values = points.map((point) => point.valueCents);
  const reference = referenceCents ?? 0;

  const highest = Math.max(0, ...values, reference);
  const ticks = niceTicks(0, highest, 3);
  const domainTop = Math.max(1, highest, ticks[ticks.length - 1] ?? 0);

  const x = linearScale([0, Math.max(1, points.length - 1)], [1, plotWidth - 1]);
  const y = linearScale([0, domainTop], [height - 1, TOP_INSET]);
  const shape: Point[] = values.map((value, i) => ({ x: x(i), y: y(value) }));

  const last = points[points.length - 1];
  const summary =
    last === undefined
      ? ''
      : t('stats.cumulativeSummary', {
          amount: formatMoney(last.valueCents, symbol),
          label: last.label,
        });

  return (
    <View onLayout={onLayout} style={{ gap: spacing.sm }}>
      {width > 0 && points.length > 0 && (
        <>
          <View style={{ flexDirection: 'row', height }}>
            <View style={{ width: GUTTER }}>
              {ticks.map((tick) => (
                <Text
                  key={tick}
                  numberOfLines={1}
                  style={{
                    position: 'absolute',
                    top: y(tick) - 7,
                    right: spacing.sm,
                    color: colors.textFaint,
                    fontSize: fontSize.xxs,
                  }}
                >
                  {compactAmount(tick)}
                </Text>
              ))}
            </View>

            <View accessible accessibilityRole="image" accessibilityLabel={summary}>
              <Svg width={plotWidth} height={height}>
                {ticks.map((tick) => (
                  <Line
                    key={tick}
                    x1={0}
                    y1={y(tick)}
                    x2={plotWidth}
                    y2={y(tick)}
                    stroke={tick === 0 ? colors.border : colors.divider}
                    strokeWidth={1}
                  />
                ))}

                <Path d={areaPath(shape, height - 1)} fill={colors.accent} fillOpacity={0.16} />
                <Path
                  d={linePath(shape)}
                  stroke={colors.accent}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />

                {referenceCents !== undefined && (
                  <Line
                    x1={0}
                    y1={y(reference)}
                    x2={plotWidth}
                    y2={y(reference)}
                    stroke={colors.warning}
                    strokeWidth={1.5}
                    strokeDasharray="5 4"
                  />
                )}
              </Svg>
            </View>
          </View>

          <View style={{ height: 14, marginLeft: GUTTER }}>
            {labelIndices(points.length, maxLabels).map((index) => {
              const point = points[index];
              if (point === undefined) return null;
              return (
                <Text
                  key={point.key}
                  numberOfLines={1}
                  accessibilityLabel={t('stats.pointA11y', {
                    label: point.label,
                    amount: formatMoney(point.valueCents, symbol),
                  })}
                  style={{
                    position: 'absolute',
                    left: Math.min(Math.max(x(index) - 22, 0), Math.max(0, plotWidth - 44)),
                    width: 44,
                    textAlign: 'center',
                    color: colors.textFaint,
                    fontSize: fontSize.xxs,
                  }}
                >
                  {point.label}
                </Text>
              );
            })}
          </View>

          {referenceLabel !== undefined && referenceCents !== undefined && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 }}>
              <View style={{ width: 14, height: 1.5, backgroundColor: colors.warning }} />
              <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
                {referenceLabel}
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}
