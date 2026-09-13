import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Feather from '@expo/vector-icons/Feather';
import {
  dayOfWeek,
  daysOfMonth,
  monthOf,
  shiftMonth,
  type IsoDate,
  type IsoMonth,
} from '@jutrack/core';
import { formatDayShort, formatMonthTitle } from '@/features/expenses/grouping';
import { shortWeekdayLabel } from '@/features/stats/charts/axis';
import { useTheme } from '@/theme';

/** Come si colora un giorno: estremo di una scelta, interno a un intervallo, o niente. */
export type DayState = 'edge' | 'inside' | 'none';

interface MonthGridProps {
  /** Il mese mostrato. Lo tiene chi chiama, così può farlo partire dove vuole. */
  month: IsoMonth;
  onMonthChange: (month: IsoMonth) => void;
  stateOf: (date: IsoDate) => DayState;
  onPress: (date: IsoDate) => void;
  /** Oltre questo giorno non si sceglie: né una spesa né un filtro guardano al futuro. */
  today: IsoDate;
}

/** Sette colonne, come la heatmap: la settimana comincia di lunedì. */
const COLUMNS = 7;

/**
 * La griglia di un mese: intestazione, sette colonne, quarantadue celle.
 *
 * **Non sa cosa sia un intervallo, e nemmeno cosa sia una scelta singola**: delega l'aspetto
 * di ogni giorno a `stateOf` e l'azione a `onPress`. È tutto ciò che i due selettori hanno
 * davvero in comune, e sono due perché la differenza — un giorno o due — sta nelle sei righe
 * di chi chiama, non nelle quarantadue celle.
 *
 * **Nessun modulo nativo, quindi nessuna build EAS.** È la ragione per cui questa griglia
 * esiste dallo Step 27 invece di un `@react-native-community/datetimepicker`, ed è la ragione
 * per cui dallo Step 58 la data di una spesa si può finalmente scegliere: il commento in
 * `ExpenseForm.tsx` che diceva il contrario era vero quando è stato scritto e ha smesso di
 * esserlo senza che nessuno lo aggiornasse.
 *
 * Due griglie da quarantadue celle che si somigliano divergono al primo che ne tocca una: è
 * esattamente ciò che è successo a `tidy()`, riscritto a mano in quattro punti.
 */
export function MonthGrid({ month, onMonthChange, stateOf, onPress, today }: MonthGridProps) {
  const { t } = useTranslation();
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();

  const days = daysOfMonth(month);
  const first = days[0] as IsoDate;
  // I buchi in testa, come nella heatmap: senza, un mese che comincia di sabato
  // disegnerebbe tutti i giorni spostati di cinque colonne.
  const lead = Array.from({ length: dayOfWeek(first) }, () => null);
  const cells: (IsoDate | null)[] = [...lead, ...days];
  // Dal `today` ricevuto e non da `currentMonth()`: due letture dell'orologio nello stesso
  // componente possono cadere ai lati della mezzanotte, e la freccia resterebbe accesa su un
  // mese le cui celle sono tutte spente.
  const atCurrentMonth = month >= monthOf(today);

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.header}>
        <Pressable
          onPress={() => onMonthChange(shiftMonth(month, -1))}
          accessibilityRole="button"
          accessibilityLabel={t('calendar.previousMonth')}
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
          onPress={() => onMonthChange(shiftMonth(month, 1))}
          disabled={atCurrentMonth}
          accessibilityRole="button"
          accessibilityLabel={t('calendar.nextMonth')}
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
              onPress={() => onPress(date)}
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
