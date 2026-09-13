import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { type NamedTotal } from '@jutrack/core';
import { formatMoney } from '@/i18n/money';
import { plural } from '@/i18n/translate';
import { useCurrencySymbol } from '@/state';
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
  const { t } = useTranslation();
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const symbol = useCurrencySymbol();
  const shown = totals.slice(0, max);
  // **Sull'elenco intero, non su `shown`**: è la stessa riga di `CategoryBars`, e le due
  // classifiche stanno nella stessa schermata.
  //
  // Oggi i due calcoli danno lo stesso numero, perché `totals` arriva ordinato per importo
  // decrescente e la voce più alta è quindi sempre dentro le prime `max`. Ma quell'ordine è
  // una proprietà di chi chiama che qui non è dichiarata da niente: il giorno in cui una
  // classifica arrivasse ordinata per nome, la prima barra sarebbe piena e le altre
  // sballate, senza che nulla lo segnali. Scalare sull'elenco intero toglie il vincolo
  // invece di fidarsene.
  const peak = totals.reduce((highest, total) => Math.max(highest, total.totalCents), 0);

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
              {formatMoney(total.totalCents, symbol)}
            </Text>
          </View>
          <View
            accessible
            accessibilityLabel={t('stats.topListA11y', {
              name: total.name,
              amount: formatMoney(total.totalCents, symbol),
              count: plural('stats.expenseCount', total.count),
            })}
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
