import { Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { bandScale, formatMoney, type AmountBin } from '@jutrack/core';
import { useCurrencySymbol } from '@/state';
import { useTheme } from '@/theme';
import { useChartWidth } from './useChartWidth';

interface AmountHistogramProps {
  bins: AmountBin[];
  height?: number;
}

/**
 * Quante spese per fascia di importo.
 *
 * **L'altezza è il numero di spese, non la somma**, ed è la scelta che decide cosa dice
 * questo grafico: la domanda è «faccio tanti scontrini piccoli o pochi grossi?», e su una
 * scala di importi la fascia «200+» vincerebbe sempre con due spese sole. La somma di
 * ciascuna fascia resta nell'etichetta d'accessibilità, dove serve senza deformare la
 * lettura.
 *
 * Le fasce sono fisse (`AMOUNT_BINS`) e non calcolate dai dati: fasce automatiche
 * cambierebbero a ogni spesa nuova, e due mesi affiancati non sarebbero più confrontabili.
 */
export function AmountHistogram({ bins, height = 96 }: AmountHistogramProps) {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const symbol = useCurrencySymbol();
  const { width, onLayout } = useChartWidth();

  const peak = bins.reduce((max, bin) => Math.max(max, bin.count), 0);
  const band = bandScale(bins.length, Math.max(1, width), 0.3);

  return (
    <View onLayout={onLayout} style={{ gap: spacing.sm }}>
      {width > 0 && bins.length > 0 && (
        <>
          <Svg width={width} height={height}>
            {bins.map((bin, index) => {
              const barHeight = peak === 0 ? 2 : Math.max(2, (bin.count / peak) * height);
              return (
                <Rect
                  key={bin.label}
                  x={band.at(index)}
                  y={height - barHeight}
                  width={band.bandWidth}
                  height={barHeight}
                  rx={3}
                  fill={bin.count === peak && peak > 0 ? colors.accent : colors.surfacePressed}
                />
              );
            })}
          </Svg>

          <View style={{ flexDirection: 'row' }}>
            {bins.map((bin) => (
              <View
                key={bin.label}
                accessible
                accessibilityLabel={`Da ${bin.label} euro: ${bin.count} ${bin.count === 1 ? 'spesa' : 'spese'}, ${formatMoney(bin.totalCents, symbol)}`}
                style={{ flex: 1, alignItems: 'center', gap: 1 }}
              >
                <Text
                  style={{
                    color: bin.count === peak && peak > 0 ? colors.text : colors.textFaint,
                    fontSize: fontSize.xxs,
                    fontWeight:
                      bin.count === peak && peak > 0 ? fontWeight.semibold : fontWeight.regular,
                  }}
                >
                  {bin.count}
                </Text>
                <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: fontSize.xxs }}>
                  {bin.label}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}
