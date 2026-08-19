import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { IsoDate } from '@jutrack/core';
import { Chip } from '@/components/Chip';
import { useTheme } from '@/theme';
import { DayGridPicker } from './DayGridPicker';
import { describeBounds, periodLabel, periodPresets, presetPeriod, type Period } from './period';

interface PeriodPickerProps {
  period: Period;
  onChange: (period: Period) => void;
  today: IsoDate;
}

/**
 * I sei preset più l'intervallo scelto a mano.
 *
 * I preset coprono le domande che si fanno davvero — la settimana, il mese, l'anno — e
 * l'intervallo copre tutte le altre. La griglia dei giorni compare **solo quando serve**:
 * è alta quanto un mese, e tenerla sempre aperta spingerebbe gli altri cinque filtri fuori
 * dal foglio.
 *
 * Il periodo non si può spegnere, e non c'è un «sempre»: le spese di tutta la storia in un
 * grafico giornaliero sarebbero migliaia di punti dentro la larghezza di un telefono. Chi
 * vuole guardare lontano usa «ultimi 12 mesi», che è disegnato per mesi.
 */
export function PeriodPicker({ period, onChange, today }: PeriodPickerProps) {
  const { t } = useTranslation();
  const { colors, spacing, fontSize } = useTheme();
  const custom = period.id === 'custom';
  const [showGrid, setShowGrid] = useState(custom);

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.chips}>
        {periodPresets().map((preset) => (
          <Chip
            key={preset.id}
            label={preset.label}
            selected={period.id === preset.id}
            onPress={() => {
              setShowGrid(false);
              onChange(presetPeriod(preset.id, today));
            }}
          />
        ))}
        <Chip
          label={custom ? periodLabel(period) : t('stats.period.custom')}
          selected={custom}
          onPress={() => setShowGrid((open) => !open)}
        />
      </View>

      {showGrid && <DayGridPicker period={period} onChange={onChange} today={today} />}

      {/* Gli estremi per esteso, sempre: è la riga che dice che «Questo mese» il 15
          significa fino al 15, e non fino al 31. */}
      <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
        {describeBounds(period.from, period.to)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
