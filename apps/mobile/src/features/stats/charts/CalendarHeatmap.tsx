import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { HEATMAP_LEVELS, type HeatmapCell } from '@jutrack/core';
import { formatMoney } from '@/i18n/money';
import { formatDayTitle } from '@/features/expenses/grouping';
import { useCurrencySymbol } from '@/state';
import { useTheme } from '@/theme';
import { compactAmount } from '../format';
import { shortWeekdayLabel } from './axis';
import { levelThresholds, weekColumns } from './heatmap-grid';
import { useChartWidth } from './useChartWidth';

interface CalendarHeatmapProps {
  cells: HeatmapCell[];
}

/** Colonna per i nomi dei giorni. Ne compaiono tre: sette li impilerebbe uno sull'altro. */
const GUTTER = 26;
const GAP = 3;
const MAX_CELL = 22;
/** Le righe che portano un'etichetta: lunedì, mercoledì, venerdì. */
const LABELLED_ROWS = [0, 2, 4];

/**
 * La densità nel tempo: una cella per giorno, tanto più accesa quanto si è speso.
 *
 * Dice una cosa che né una curva né un totale mensile sanno dire — **quando** si spende:
 * le settimane fitte, i giorni vuoti, il ritorno della spesa grossa ogni due sabati.
 *
 * **È l'unico grafico dell'app in cui il colore porterebbe l'informazione da solo**, e per
 * questo è compensato in tre modi, che vanno tenuti tutti e tre: ogni cella ha
 * un'etichetta d'accessibilità con giorno e importo, la legenda dice le soglie **in euro**
 * invece di mostrare cinque tinte e basta, e toccando una cella il giorno e l'importo
 * compaiono scritti sotto la griglia. Senza questi tre, è un grafico che una parte delle
 * persone non può leggere.
 *
 * L'SVG disegna le celle, ma il tocco e le etichette stanno su `Pressable` sovrapposti: la
 * gestione dell'accessibilità dentro l'SVG dipende dalla piattaforma, quella di React
 * Native no — ed è la stessa che usa tutto il resto dell'app.
 */
export function CalendarHeatmap({ cells }: CalendarHeatmapProps) {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const symbol = useCurrencySymbol();
  const { width, onLayout } = useChartWidth();
  const [selected, setSelected] = useState<HeatmapCell | null>(null);

  const columns = weekColumns(cells);
  const thresholds = levelThresholds(cells);

  const available = Math.max(1, width - GUTTER);
  const size = Math.min(
    MAX_CELL,
    Math.floor((available - GAP * Math.max(0, columns.length - 1)) / Math.max(1, columns.length)),
  );
  /**
   * **La cella non scende sotto i nove punti, e quando non ci sta si scorre.**
   *
   * Dal periodo di un mese si è passati a un periodo qualunque (Step 27): «ultimi 12 mesi»
   * sono cinquantatré colonne, e diviso la larghezza di un telefono farebbero celle da tre
   * punti — invisibili e, soprattutto, impossibili da toccare, che è la compensazione su cui
   * si regge la leggibilità di questo grafico. Meglio una griglia che esce dallo schermo e
   * si trascina: il gesto è ovvio e le celle restano quelle di sempre.
   */
  const cell = Math.max(9, size);
  const gridHeight = cell * 7 + GAP * 6;
  const gridWidth = columns.length * cell + GAP * Math.max(0, columns.length - 1);
  const scrolls = gridWidth > available;

  const fillFor = (level: number): { fill: string; opacity: number } =>
    level === 0
      ? { fill: colors.divider, opacity: 1 }
      : { fill: colors.accent, opacity: [0.28, 0.5, 0.75, 1][level - 1] ?? 1 };

  return (
    <View onLayout={onLayout} style={{ gap: spacing.md }}>
      {width > 0 && columns.length > 0 && (
        <>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: GUTTER, height: gridHeight }}>
              {LABELLED_ROWS.map((row) => (
                <Text
                  key={row}
                  style={{
                    position: 'absolute',
                    top: row * (cell + GAP) + cell / 2 - 7,
                    color: colors.textFaint,
                    fontSize: fontSize.xxs,
                  }}
                >
                  {shortWeekdayLabel(row)}
                </Text>
              ))}
            </View>

            <ScrollView
              horizontal
              scrollEnabled={scrolls}
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0 }}
            >
              <View>
                <Svg width={gridWidth} height={gridHeight}>
                  {columns.map((column, columnIndex) =>
                    column.map((day, row) =>
                      day === null ? null : (
                        <Rect
                          key={day.date}
                          x={columnIndex * (cell + GAP)}
                          y={row * (cell + GAP)}
                          width={cell}
                          height={cell}
                          rx={2.5}
                          fill={fillFor(day.level).fill}
                          fillOpacity={fillFor(day.level).opacity}
                          stroke={selected?.date === day.date ? colors.text : 'none'}
                          strokeWidth={selected?.date === day.date ? 1.5 : 0}
                        />
                      ),
                    ),
                  )}
                </Svg>

                {columns.map((column, columnIndex) =>
                  column.map((day, row) =>
                    day === null ? null : (
                      <Pressable
                        key={day.date}
                        onPress={() => setSelected(selected?.date === day.date ? null : day)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: selected?.date === day.date }}
                        accessibilityLabel={`${formatDayTitle(day.date)}: ${
                          day.totalCents === 0
                            ? 'nessuna spesa'
                            : formatMoney(day.totalCents, symbol)
                        }`}
                        style={{
                          position: 'absolute',
                          left: columnIndex * (cell + GAP),
                          top: row * (cell + GAP),
                          width: cell,
                          height: cell,
                        }}
                      />
                    ),
                  ),
                )}
              </View>
            </ScrollView>
          </View>

          {scrolls && (
            <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
              Il periodo è lungo: trascina la griglia per vedere le altre settimane.
            </Text>
          )}

          <Text style={{ color: colors.text, fontSize: fontSize.sm }}>
            {selected === null ? (
              <Text style={{ color: colors.textMuted }}>
                Tocca un giorno per sapere quanto è costato.
              </Text>
            ) : (
              <>
                {formatDayTitle(selected.date)}{' '}
                <Text style={{ fontWeight: fontWeight.semibold }}>
                  {selected.totalCents === 0
                    ? '· nessuna spesa'
                    : `· ${formatMoney(selected.totalCents, symbol)}`}
                </Text>
              </>
            )}
          </Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'wrap',
              columnGap: spacing.md,
              rowGap: spacing.xs,
            }}
          >
            {Array.from({ length: HEATMAP_LEVELS + 1 }, (_, level) => {
              const threshold = level === 0 ? null : thresholds[level - 1];
              if (level > 0 && (threshold === null || threshold === undefined)) return null;
              return (
                <View
                  key={level}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
                >
                  <View
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 2,
                      backgroundColor: fillFor(level).fill,
                      opacity: fillFor(level).opacity,
                    }}
                  />
                  <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
                    {level === 0 ? 'niente' : `da ${compactAmount(threshold ?? 0)} ${symbol}`}
                  </Text>
                </View>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}
