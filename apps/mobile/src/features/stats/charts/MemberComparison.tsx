import { Text, View } from 'react-native';
import { formatMoney, type Member, type MemberSeries } from '@jutrack/core';
import { useCurrencySymbol } from '@/state';
import { useTheme } from '@/theme';

interface MemberComparisonProps {
  series: MemberSeries[];
  members: Member[];
  /** Che periodo copre: compare nell'etichetta d'accessibilità, dove serve il contesto. */
  periodLabel: string;
}

/**
 * Chi ha anticipato e a chi è costato, persona per persona.
 *
 * Sono **due grandezze diverse** e vanno mostrate insieme: chi paga sempre lui non spende
 * necessariamente di più, e un grafico che ne mostrasse una sola direbbe una cosa per
 * l'altra. La differenza fra le due barre di una stessa persona è, a occhio, il suo saldo.
 *
 * Le due barre si distinguono per **etichetta**, non per tinta: il colore dice di chi
 * sono, e usarlo anche per dire quale delle due sarebbe chiedergli due cose insieme. La
 * barra di quanto ha anticipato è la stessa tinta più tenue — un rinforzo, non
 * l'informazione.
 */
export function MemberComparison({ series, members, periodLabel }: MemberComparisonProps) {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const symbol = useCurrencySymbol();
  const nameOf = (id: string): string => members.find((m) => m.id === id)?.name ?? 'qualcuno';
  const colorOf = (id: string): string => members.find((m) => m.id === id)?.color ?? colors.accent;

  // Una scala sola per tutti: due persone misurate su scale diverse non sono
  // confrontabili, ed è l'unica cosa che questo grafico serve a fare.
  const peak = series.reduce((highest, one) => Math.max(highest, one.paidCents, one.owedCents), 0);
  const shareOf = (cents: number): number => (peak === 0 ? 0 : Math.max(1, (cents / peak) * 100));

  return (
    <View style={{ gap: spacing.lg }}>
      {series.map((one) => (
        <View key={one.memberId} style={{ gap: spacing.xs }}>
          <Text
            style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}
          >
            {nameOf(one.memberId)}
          </Text>

          <MeasureBar
            label="ha anticipato"
            amountCents={one.paidCents}
            percent={shareOf(one.paidCents)}
            color={colorOf(one.memberId)}
            faded
            accessibilityLabel={`${nameOf(one.memberId)} ha anticipato ${formatMoney(one.paidCents, symbol)} ${periodLabel}`}
          />
          <MeasureBar
            label="a suo carico"
            amountCents={one.owedCents}
            percent={shareOf(one.owedCents)}
            color={colorOf(one.memberId)}
            accessibilityLabel={`A carico di ${nameOf(one.memberId)}: ${formatMoney(one.owedCents, symbol)} ${periodLabel}`}
          />
        </View>
      ))}
    </View>
  );
}

interface MeasureBarProps {
  label: string;
  amountCents: number;
  percent: number;
  color: string;
  /** Tinta più tenue per la grandezza secondaria. Non porta informazione da sola. */
  faded?: boolean;
  accessibilityLabel: string;
}

function MeasureBar({
  label,
  amountCents,
  percent,
  color,
  faded = false,
  accessibilityLabel,
}: MeasureBarProps) {
  const { colors, spacing, fontSize } = useTheme();
  const symbol = useCurrencySymbol();

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
    >
      <Text style={{ width: 92, color: colors.textMuted, fontSize: fontSize.xs }}>{label}</Text>
      <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.divider }}>
        <View
          style={{
            height: 8,
            width: `${percent}%`,
            borderRadius: 4,
            backgroundColor: color,
            opacity: faded ? 0.45 : 1,
          }}
        />
      </View>
      <Text style={{ color: colors.text, fontSize: fontSize.xs }}>
        {formatMoney(amountCents, symbol)}
      </Text>
    </View>
  );
}
