import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { monthOf, type IsoDate } from '@jutrack/core';
import { Chip } from '@/components/Chip';
import { todayIso, yesterdayIso } from '@/features/expenses/grouping';
import { useTheme } from '@/theme';
import { MonthGrid, type DayState } from './MonthGrid';

interface DayPickerProps {
  value: IsoDate;
  onChange: (date: IsoDate) => void;
  /** Iniettabile per i test e per non rileggere l'orologio due volte. */
  today?: IsoDate;
}

/**
 * La scelta di **un** giorno: due pillole e, sotto, la griglia del mese.
 *
 * Le pillole non sono una scorciatoia decorativa: «oggi» e «ieri» sono la risposta quasi
 * sempre — una spesa o si registra mentre la si fa, o la sera dopo — e farle attraversare un
 * calendario per arrivarci sarebbe far pagare al caso frequente il prezzo di quello raro. La
 * griglia è per il caso raro.
 *
 * **Il futuro resta escluso**, come nel selettore di periodo: una spesa è qualcosa che è
 * successo. Una spesa di domani è un promemoria, e il promemoria esiste già (Step 31).
 */
export function DayPicker({ value, onChange, today = todayIso() }: DayPickerProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const [month, setMonth] = useState(() => monthOf(value));

  const yesterday = yesterdayIso();

  // La griglia segue la scelta: toccare «Ieri» il primo del mese deve far comparire il mese
  // prima, o la cella accesa resterebbe fuori da ciò che si sta guardando.
  const choose = (date: IsoDate): void => {
    onChange(date);
    setMonth(monthOf(date));
  };

  const stateOf = (date: IsoDate): DayState => (date === value ? 'edge' : 'none');

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.chips}>
        <Chip label={t('date.today')} selected={value === today} onPress={() => choose(today)} />
        <Chip
          label={t('date.yesterday')}
          selected={value === yesterday}
          onPress={() => choose(yesterday)}
        />
      </View>

      <MonthGrid
        month={month}
        onMonthChange={setMonth}
        stateOf={stateOf}
        onPress={choose}
        today={today}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
