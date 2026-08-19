import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Feather from '@expo/vector-icons/Feather';
import { dayOfWeek, daysOfMonth, monthOf, shiftMonth, type IsoDate } from '@jutrack/core';
import { currentMonth, formatDayShort, formatMonthTitle } from '@/features/expenses/grouping';
import { useTheme } from '@/theme';
import { shortWeekdayLabel } from '../charts/axis';
import { customPeriod, type Period } from './period';

interface DayGridPickerProps {
  /** Il periodo attualmente scelto: la griglia lo evidenzia e parte dal mese in cui finisce. */
  period: Period;
  onChange: (period: Period) => void;
  /** Oltre questo giorno non si sceglie: le spese di domani non esistono. */
  today: IsoDate;
}

/** Sette colonne, come la heatmap: la settimana comincia di lunedì. */
const COLUMNS = 7;

/**
 * L'intervallo scelto a mano, su una griglia di giorni.
 *
 * **Nessun modulo nativo, quindi nessuna build EAS.** Un selettore di date vero vorrebbe
 * `@react-native-community/datetimepicker`, che è la ragione per cui la data della spesa è
 * ferma dal passo 7 del redesign. Qui bastano quarantadue `Pressable` e l'aritmetica sui
 * giorni che `calendar.ts` ha già — ed è per questo che questo componente resta la base da
 * cui rendere modificabile un giorno la data della spesa.
 *
 * **Due tocchi fanno un intervallo**: il primo apre, il secondo chiude. Toccare il 20 e poi
 * il 3 dà comunque dal 3 al 20 — `customPeriod` raddrizza — perché un intervallo invertito
 * non è un errore visibile, è una schermata vuota che sembra un guasto.
 */
export function DayGridPicker({ period, onChange, today }: DayGridPickerProps) {
  const { t } = useTranslation();
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();
  const [month, setMonth] = useState(() => monthOf(period.to));
  /** Il primo tocco di un intervallo nuovo. `null` quando non ce n'è uno a metà. */
  const [pending, setPending] = useState<IsoDate | null>(null);

  const days = daysOfMonth(month);
  const first = days[0] as IsoDate;
  // I buchi in testa, come nella heatmap: senza, un mese che comincia di sabato
  // disegnerebbe tutti i giorni spostati di cinque colonne.
  const lead = Array.from({ length: dayOfWeek(first) }, () => null);
  const cells: (IsoDate | null)[] = [...lead, ...days];
  const atCurrentMonth = month >= currentMonth();

  const press = (date: IsoDate) => {
    if (pending === null) {
      setPending(date);
      onChange(customPeriod(date, date));
      return;
    }
    setPending(null);
    onChange(customPeriod(pending, date));
  };

  const stateOf = (date: IsoDate): 'edge' | 'inside' | 'none' => {
    if (pending !== null) return date === pending ? 'edge' : 'none';
    if (date === period.from || date === period.to) return 'edge';
    return date > period.from && date < period.to ? 'inside' : 'none';
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.header}>
        <Pressable
          onPress={() => setMonth(shiftMonth(month, -1))}
          accessibilityRole="button"
          accessibilityLabel={t('stats.grid.previousMonth')}
          hitSlop={12}
        >
          <Feather name="chevron-left" size={20} color={colors.accent} />
        </Pressable>
        <Text
          style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}
        >
          {formatMonthTitle(month)}
        </Text>
        <Pressable
          onPress={() => setMonth(shiftMonth(month, 1))}
          disabled={atCurrentMonth}
          accessibilityRole="button"
          accessibilityLabel={t('stats.grid.nextMonth')}
          accessibilityState={{ disabled: atCurrentMonth }}
          hitSlop={12}
        >
          <Feather
            name="chevron-right"
            size={20}
            color={atCurrentMonth ? colors.textFaint : colors.accent}
          />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {Array.from({ length: COLUMNS }, (_, row) => (
          <View key={`head-${row}`} style={styles.cell}>
            <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
              {shortWeekdayLabel(row)}
            </Text>
          </View>
        ))}

        {cells.map((date, index) => {
          if (date === null) return <View key={`gap-${index}`} style={styles.cell} />;

          const state = stateOf(date);
          const future = date > today;
          return (
            <Pressable
              key={date}
              onPress={() => press(date)}
              disabled={future}
              accessibilityRole="button"
              accessibilityState={{ selected: state !== 'none', disabled: future }}
              accessibilityLabel={formatDayShort(date)}
              style={[
                styles.cell,
                {
                  backgroundColor:
                    state === 'edge'
                      ? colors.accent
                      : state === 'inside'
                        ? colors.accent + '22'
                        : 'transparent',
                  borderRadius: state === 'inside' ? 0 : radius.sm,
                },
              ]}
            >
              <Text
                style={{
                  color: future
                    ? colors.textFaint
                    : state === 'edge'
                      ? colors.textOnAccent
                      : colors.text,
                  fontSize: fontSize.sm,
                  fontWeight: state === 'edge' ? fontWeight.semibold : fontWeight.regular,
                }}
              >
                {Number(date.slice(8, 10))}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
        {pending === null
          ? t('stats.grid.startHint')
          : t('stats.grid.endHint', { day: formatDayShort(pending) })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  // Un settimo esatto: `flexBasis` in percentuale invece di una larghezza in punti, che
  // andrebbe calcolata sulla larghezza del foglio e non su quella dello schermo.
  cell: {
    flexBasis: `${100 / COLUMNS}%`,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
