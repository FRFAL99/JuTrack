import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { squarify, type TreemapRect } from '@jutrack/core';
import { formatMoney } from '@/i18n/money';
import { useCurrencySymbol } from '@/state';
import { useTheme } from '@/theme';
import { compactAmount } from '../format';
import { inkOn } from './ink';
import { useChartWidth } from './useChartWidth';
import type { Slice } from './slices';

interface CategoryTreemapProps {
  items: Slice[];
  height?: number;
}

/** Sotto queste misure una scritta non ci sta, e mezza parola tagliata è peggio di niente. */
const NAME_FITS = { width: 62, height: 38 };
const AMOUNT_FITS = { width: 40, height: 20 };

/**
 * La ripartizione come mappa: l'area di ogni rettangolo è quanto è costata quella voce.
 *
 * Dice in un colpo d'occhio una cosa che le barre dicono una riga alla volta — se il mese
 * è **una** spesa grossa o tante medie — perché l'occhio confronta due superfici senza
 * doverle leggere. La disposizione è quella di `squarify` (Step 25), deterministica: gli
 * stessi dati fanno la stessa mappa sui due telefoni.
 *
 * **Nessuna voce è affidata al solo colore.** I rettangoli grandi portano nome e importo
 * dentro; quelli troppo piccoli per una scritta si toccano, e nome e importo compaiono
 * sotto la mappa. È la stessa compensazione della heatmap, per la stessa ragione.
 */
export function CategoryTreemap({ items, height = 180 }: CategoryTreemapProps) {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const symbol = useCurrencySymbol();
  const { width, onLayout } = useChartWidth();
  const [selected, setSelected] = useState<Slice | null>(null);

  const byKey = new Map(items.map((item) => [item.key, item]));
  const rects: TreemapRect[] = squarify(
    items.map((item) => ({ id: item.key, value: item.valueCents })),
    { x: 0, y: 0, width: Math.max(1, width), height },
  );

  return (
    <View onLayout={onLayout} style={{ gap: spacing.sm }}>
      {width > 0 && rects.length > 0 && (
        <>
          <View>
            <Svg width={width} height={height}>
              {rects.map((rect) => (
                <Rect
                  key={rect.id}
                  x={rect.x}
                  y={rect.y}
                  width={rect.width}
                  height={rect.height}
                  fill={byKey.get(rect.id)?.color ?? colors.textMuted}
                  // Il filetto del colore di fondo separa due rettangoli vicini senza
                  // aggiungere una tinta che nel grafico significherebbe qualcosa.
                  stroke={colors.background}
                  strokeWidth={1.5}
                />
              ))}
            </Svg>

            {rects.map((rect) => {
              const item = byKey.get(rect.id);
              if (item === undefined) return null;
              const ink = inkOn(item.color);
              const showName = rect.width >= NAME_FITS.width && rect.height >= NAME_FITS.height;
              const showAmount =
                rect.width >= AMOUNT_FITS.width && rect.height >= AMOUNT_FITS.height;

              return (
                <Pressable
                  key={rect.id}
                  onPress={() => setSelected(selected?.key === item.key ? null : item)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label}: ${formatMoney(item.valueCents, symbol)}`}
                  style={{
                    position: 'absolute',
                    left: rect.x,
                    top: rect.y,
                    width: rect.width,
                    height: rect.height,
                    padding: spacing.xs + 1,
                    justifyContent: 'flex-start',
                  }}
                >
                  {showName && (
                    <Text
                      numberOfLines={1}
                      style={{
                        color: ink,
                        fontSize: fontSize.xxs,
                        fontWeight: fontWeight.semibold,
                      }}
                    >
                      {item.label}
                    </Text>
                  )}
                  {showAmount && (
                    <Text numberOfLines={1} style={{ color: ink, fontSize: fontSize.xxs }}>
                      {compactAmount(item.valueCents)} {symbol}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          <Text style={{ color: colors.text, fontSize: fontSize.sm }}>
            {selected === null ? (
              <Text style={{ color: colors.textMuted }}>
                Tocca un riquadro per leggerne nome e importo.
              </Text>
            ) : (
              <>
                {selected.label}{' '}
                <Text style={{ fontWeight: fontWeight.semibold }}>
                  · {formatMoney(selected.valueCents, symbol)}
                </Text>
              </>
            )}
          </Text>
        </>
      )}
    </View>
  );
}
