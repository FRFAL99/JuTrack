import { Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { arcPath, formatMoney } from '@jutrack/core';
import { useCurrencySymbol } from '@/state';
import { useTheme } from '@/theme';
import { formatShare } from '../format';
import { useChartWidth } from './useChartWidth';
import type { Slice } from './slices';

interface DonutChartProps {
  /** Fette già ordinate e già ridotte con `topSlices`: qui non si raggruppa niente. */
  slices: Slice[];
  /** Cosa c'è scritto sotto il numero al centro. */
  centerLabel: string;
  size?: number;
}

/** Quanto è spessa la corona, in quota del raggio. */
const THICKNESS = 0.34;

/**
 * La ripartizione come corona circolare.
 *
 * Ha senso **solo dove le fette sommano al totale**: chi ha pagato, come si divide il
 * mese fra categorie. Su una classifica che somma meno del totale — i negozi, dove le
 * spese senza negozio non compaiono — o più — i tag, dove una spesa con due etichette
 * conta due volte — un cerchio direbbe una falsità sulla forma stessa, e lì la classifica
 * giusta è `TopList`.
 *
 * Il buco al centro non è decorativo: ci sta il totale, che è il numero con cui ogni fetta
 * va confrontata. E la legenda porta nome, quota e importo di ciascuna, perché la fetta da
 * sola è un colore — la regola dello Step 8, che qui vale più che altrove.
 */
export function DonutChart({ slices, centerLabel, size }: DonutChartProps) {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const symbol = useCurrencySymbol();
  const { width, onLayout } = useChartWidth();

  const total = slices.reduce((sum, slice) => sum + slice.valueCents, 0);
  const diameter = Math.max(1, Math.min(size ?? 176, Math.max(1, width)));
  const radius = diameter / 2;
  const inner = radius * (1 - THICKNESS);

  // Gli angoli si accumulano da una fetta all'altra, e ogni fetta comincia dove finisce la
  // precedente: un ciclo che scrive in un elenco locale, senza chiusure che si portino
  // dietro un accumulatore oltre il render.
  const arcs: { slice: Slice; from: number; to: number }[] = [];
  for (const slice of slices) {
    const from = arcs[arcs.length - 1]?.to ?? 0;
    arcs.push({ slice, from, to: from + (slice.valueCents / Math.max(1, total)) * Math.PI * 2 });
  }

  return (
    <View onLayout={onLayout} style={{ gap: spacing.md }}>
      {width > 0 && slices.length > 0 && total > 0 && (
        <>
          <View style={{ alignItems: 'center' }}>
            <View
              accessible
              accessibilityRole="image"
              accessibilityLabel={`${centerLabel}: ${formatMoney(total, symbol)}, ripartito in ${slices.length} voci`}
            >
              <Svg width={diameter} height={diameter}>
                {arcs.map(({ slice, from, to }) => (
                  <Path
                    key={slice.key}
                    d={arcPath(radius, radius, radius, inner, from, to)}
                    fill={slice.color}
                  />
                ))}
              </Svg>
            </View>

            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: diameter,
                height: diameter,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.bold }}
              >
                {formatMoney(total, symbol)}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.xxs }}>{centerLabel}</Text>
            </View>
          </View>

          <View style={{ gap: spacing.sm }}>
            {slices.map((slice) => (
              <View
                key={slice.key}
                accessible
                accessibilityLabel={`${slice.label}: ${formatMoney(slice.valueCents, symbol)}, ${formatShare(slice.valueCents / total)}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
              >
                <View
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 2,
                    backgroundColor: slice.color,
                  }}
                />
                <Text
                  numberOfLines={1}
                  style={{ flex: 1, color: colors.text, fontSize: fontSize.sm }}
                >
                  {slice.label}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, width: 38 }}>
                  {formatShare(slice.valueCents / total)}
                </Text>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: fontSize.sm,
                    fontWeight: fontWeight.semibold,
                  }}
                >
                  {formatMoney(slice.valueCents, symbol)}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}
