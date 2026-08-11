import { StyleSheet, Text, View } from 'react-native';
import { formatMoney, type NamedTotal } from '@jutrack/core';
import { useTheme } from '@/theme';
import { formatShare } from '../format';

interface TopListProps {
  totals: NamedTotal[];
  /** Quante voci mostrare. Una classifica lunga smette di essere una classifica. */
  max?: number;
  /**
   * Quello che va detto sui numeri, sotto l'elenco.
   *
   * Non è una didascalia facoltativa: le due classifiche che usano questo componente
   * **non sommano al totale della schermata** — i negozi meno, i tag di più — e chi
   * guarda ha il diritto di saperlo lì, non in un documento.
   */
  note?: string;
}

/**
 * Una classifica: dove si è speso di più, sotto quali etichette.
 *
 * Stessa forma di `CategoryBars`, ma senza colore proprio: negozi e tag non ne hanno uno
 * nel documento — sono campi della spesa, non entità — e assegnargliene uno a caso
 * significherebbe che lo stesso negozio cambia tinta appena ne compare un altro prima di
 * lui. Il nome è l'identità, e la barra dice solo il rapporto fra le voci.
 */
export function TopList({ totals, max = 5, note }: TopListProps) {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const shown = totals.slice(0, max);
  const peak = shown.reduce((highest, total) => Math.max(highest, total.totalCents), 0);

  return (
    <View style={{ gap: spacing.md }}>
      {shown.map((total) => (
        <View key={total.key} style={{ gap: spacing.xs }}>
          <View style={styles.row}>
            <Text style={{ width: 26, color: colors.textMuted, fontSize: fontSize.xs }}>
              {formatShare(total.share)}
            </Text>
            <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontSize: fontSize.sm }}>
              {total.name}
            </Text>
            <Text
              style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}
            >
              {formatMoney(total.totalCents)}
            </Text>
          </View>
          <View
            accessible
            accessibilityLabel={`${total.name}: ${formatMoney(total.totalCents)}, ${total.count} ${total.count === 1 ? 'spesa' : 'spese'}`}
            style={{ height: 3, borderRadius: 1.5, backgroundColor: colors.surfacePressed }}
          >
            <View
              style={{
                height: 3,
                width: `${peak === 0 ? 0 : Math.max(2, (total.totalCents / peak) * 100)}%`,
                borderRadius: 1.5,
                backgroundColor: colors.accent,
              }}
            />
          </View>
        </View>
      ))}

      {note !== undefined && (
        <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs, lineHeight: 16 }}>
          {note}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
