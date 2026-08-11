import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { linearScale, smoothLinePath, type Point } from '@jutrack/core';
import { useTheme } from '@/theme';
import { useChartWidth } from './useChartWidth';

interface SparklineProps {
  /** Valori in ordine cronologico. Meno di due punti non disegnano nulla. */
  values: number[];
  height?: number;
  color?: string;
  /** Descrizione per chi non vede il tracciato. Senza, la riga viene ignorata da TalkBack. */
  accessibilityLabel?: string;
}

/**
 * Una linea piccola, senza assi né numeri.
 *
 * Sta dentro una riga di testo o un riquadro di riepilogo, dove serve **la forma** e non i
 * valori: il numero grande accanto dice già quanto, la sparkline dice se ci si è arrivati
 * di colpo o poco per volta. Per questo non ha etichette e non ne va aggiunta nessuna —
 * quando servono i valori, il grafico giusto è `LineChart`.
 *
 * L'ultimo punto ha un pallino: è l'unico che si legge da solo, ed è quello che dice a che
 * altezza si è adesso.
 */
export function Sparkline({ values, height = 30, color, accessibilityLabel }: SparklineProps) {
  const { colors } = useTheme();
  const { width, onLayout } = useChartWidth();

  const stroke = color ?? colors.accent;
  const lowest = Math.min(0, ...values);
  const highest = Math.max(1, ...values);

  const x = linearScale([0, Math.max(1, values.length - 1)], [1.5, Math.max(2, width - 1.5)]);
  const y = linearScale([lowest, highest], [height - 2, 2]);
  const shape: Point[] = values.map((value, i) => ({ x: x(i), y: y(value) }));
  const end = shape[shape.length - 1];

  return (
    <View
      onLayout={onLayout}
      style={{ height }}
      {...(accessibilityLabel !== undefined && { accessible: true, accessibilityLabel })}
    >
      {width > 0 && values.length > 1 && (
        <Svg width={width} height={height}>
          <Path
            d={smoothLinePath(shape)}
            stroke={stroke}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {end !== undefined && <Circle cx={end.x} cy={end.y} r={2} fill={stroke} />}
        </Svg>
      )}
    </View>
  );
}
