import { Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import {
  formatMoney,
  linearScale,
  linePath,
  niceTicks,
  smoothLinePath,
  type Cents,
  type Point,
} from '@jutrack/core';
import { useTheme } from '@/theme';
import { compactAmount } from '../format';
import { labelIndices, type ChartPoint } from './axis';
import { useChartWidth } from './useChartWidth';

interface LineChartProps {
  points: ChartPoint[];
  /** Seconda curva, tratteggiata: la media mobile. Stessa lunghezza di `points`. */
  overlayCents?: Cents[];
  /** Come si chiama la seconda curva. Senza, la legenda non compare. */
  overlayLabel?: string;
  height?: number;
  /** Curva morbida invece di spezzata: da usare quando i punti sono pochi e radi. */
  smooth?: boolean;
  /** Un pallino su ogni punto. Su trenta giorni diventa una collana e va lasciato spento. */
  dots?: boolean;
  /** Quante etichette al più sull'asse orizzontale. */
  maxLabels?: number;
}

/** Colonna a sinistra per le cifre dell'asse verticale. */
const GUTTER = 40;
/** Un filo di margine in alto: senza, il tratto del punto più alto viene tagliato a metà. */
const TOP_INSET = 6;

/**
 * L'andamento nel tempo, come linea.
 *
 * È la forma che manca ai grafici di oggi, tutti fatti di barre: una barra dice **quanto**
 * in un periodo, una linea dice **come è andata** — e sono due domande diverse.
 *
 * I dati arrivano già calcolati (Step 25) e qui non si somma niente: si scelgono le scale,
 * si chiede il tracciato a `linePath`/`smoothLinePath` e si disegna. Il testo — le cifre
 * dell'asse e i giorni sotto — è `Text` di React Native e non `<Text>` di SVG: eredita il
 * font dell'app e il ridimensionamento d'accessibilità di sistema, che l'SVG non prende.
 */
export function LineChart({
  points,
  overlayCents,
  overlayLabel,
  height = 140,
  smooth = false,
  dots = false,
  maxLabels = 5,
}: LineChartProps) {
  const { colors, spacing, fontSize } = useTheme();
  const { width, onLayout } = useChartWidth();

  const plotWidth = Math.max(1, width - GUTTER);
  const values = points.map((point) => point.valueCents);
  const overlay = overlayCents ?? [];
  const hasOverlay = overlay.length > 0 && overlay.length === points.length;

  const highest = Math.max(0, ...values, ...overlay);
  const ticks = niceTicks(0, highest, 3);
  // Il dominio non può essere piatto: con tutti i valori a zero `linearScale` restituirebbe
  // il centro dell'intervallo, cioè una linea a mezz'aria che disegna una spesa mai fatta.
  const domainTop = Math.max(1, highest, ticks[ticks.length - 1] ?? 0);

  const x = linearScale([0, Math.max(1, points.length - 1)], [1, plotWidth - 1]);
  const y = linearScale([0, domainTop], [height - 1, TOP_INSET]);
  const curve = (cents: number[]): Point[] => cents.map((value, i) => ({ x: x(i), y: y(value) }));
  const draw = smooth ? smoothLinePath : linePath;

  const first = points[0];
  const last = points[points.length - 1];
  const peakAt = values.indexOf(highest);
  const summary =
    first === undefined || last === undefined
      ? ''
      : `Da ${first.label} a ${last.label}. Massimo ${formatMoney(highest)}, ${points[peakAt]?.label ?? last.label}.`;

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

                {hasOverlay && (
                  <Path
                    d={draw(curve(overlay))}
                    stroke={colors.textFaint}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    fill="none"
                  />
                )}

                <Path
                  d={draw(curve(values))}
                  stroke={colors.accent}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />

                {dots &&
                  values.map((value, i) => (
                    <Circle
                      key={points[i]?.key ?? i}
                      cx={x(i)}
                      cy={y(value)}
                      r={2.5}
                      fill={colors.accent}
                    />
                  ))}
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
                  accessibilityLabel={`${point.label}: ${formatMoney(point.valueCents)}`}
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

          {overlayLabel !== undefined && hasOverlay && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 }}>
              <View style={{ width: 14, height: 1.5, backgroundColor: colors.textFaint }} />
              <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
                {overlayLabel}
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}
