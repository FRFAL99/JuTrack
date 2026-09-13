import { useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { monthOf, type IsoDate } from '@jutrack/core';
import { MonthGrid, type DayState } from '@/features/calendar/MonthGrid';
import { formatDayShort } from '@/features/expenses/grouping';
import { useTheme } from '@/theme';
import { customPeriod, type Period } from './period';

interface DayGridPickerProps {
  /** Il periodo attualmente scelto: la griglia lo evidenzia e parte dal mese in cui finisce. */
  period: Period;
  onChange: (period: Period) => void;
  /** Oltre questo giorno non si sceglie: le spese di domani non esistono. */
  today: IsoDate;
}

/**
 * L'intervallo scelto a mano, su una griglia di giorni.
 *
 * Qui restano **solo le regole dell'intervallo**: la griglia è
 * [`MonthGrid`](../../calendar/MonthGrid.tsx), condivisa dallo Step 58 col selettore di un
 * giorno solo della nuova spesa. Quel componente non sa cosa sia un intervallo — glielo dice
 * `stateOf`.
 *
 * **Due tocchi fanno un intervallo**: il primo apre, il secondo chiude. Toccare il 20 e poi
 * il 3 dà comunque dal 3 al 20 — `customPeriod` raddrizza — perché un intervallo invertito
 * non è un errore visibile, è una schermata vuota che sembra un guasto.
 */
export function DayGridPicker({ period, onChange, today }: DayGridPickerProps) {
  const { t } = useTranslation();
  const { colors, spacing, fontSize } = useTheme();
  const [month, setMonth] = useState(() => monthOf(period.to));
  /** Il primo tocco di un intervallo nuovo. `null` quando non ce n'è uno a metà. */
  const [pending, setPending] = useState<IsoDate | null>(null);

  const press = (date: IsoDate): void => {
    if (pending === null) {
      setPending(date);
      onChange(customPeriod(date, date));
      return;
    }
    setPending(null);
    onChange(customPeriod(pending, date));
  };

  const stateOf = (date: IsoDate): DayState => {
    if (pending !== null) return date === pending ? 'edge' : 'none';
    if (date === period.from || date === period.to) return 'edge';
    return date > period.from && date < period.to ? 'inside' : 'none';
  };

  // Un contenitore solo, col suo `gap`, e non un frammento: il genitore
  // (`PeriodPicker`) è un flex con `gap: spacing.md`, e due figli invece di uno
  // prenderebbero quella distanza al posto di questa.
  return (
    <View style={{ gap: spacing.sm }}>
      <MonthGrid
        month={month}
        onMonthChange={setMonth}
        stateOf={stateOf}
        onPress={press}
        today={today}
      />
      <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
        {pending === null
          ? t('stats.grid.startHint')
          : t('stats.grid.endHint', { day: formatDayShort(pending) })}
      </Text>
    </View>
  );
}
