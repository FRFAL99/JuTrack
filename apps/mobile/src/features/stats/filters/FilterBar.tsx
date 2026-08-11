import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { queryParts, type QueryLabels } from '@jutrack/core';
import { Chip } from '@/components/Chip';
import { useTheme } from '@/theme';
import type { QueryFacets } from './facets';
import { periodLabel, type Period } from './period';

interface FilterBarProps {
  period: Period;
  facets: QueryFacets;
  /** I nomi che il core non ha: categorie e membri sono id, dentro `ExpenseQuery`. */
  labels: QueryLabels;
  onOpen: () => void;
  onReset: () => void;
}

/**
 * La riga dei filtri attivi, che è anche l'intestazione della schermata.
 *
 * **I chip portano il valore, non il nome del filtro**: «Spesa», non «Categoria». Un chip
 * che dicesse il nome costringerebbe ad aprire il foglio per sapere cosa sta filtrando, e
 * un filtro che non si vede è un filtro che non si sa di avere — che a schermata vuota si
 * legge come un guasto dell'app.
 *
 * Per la stessa ragione **«Azzera» è sempre raggiungibile** finché c'è qualcosa da azzerare,
 * e sta in fondo alla riga invece che dentro il foglio: è l'uscita di sicurezza da una
 * schermata che non mostra niente, e chiedere di aprire un foglio per trovarla vorrebbe dire
 * chiederlo proprio a chi non ha capito cosa sta succedendo.
 *
 * Le frasi le costruisce `queryParts` di `@jutrack/core`, la stessa che scrive il sottotitolo
 * di `describeQuery`: due elenchi scritti in due punti finirebbero per dire due cose diverse
 * della stessa domanda.
 */
export function FilterBar({ period, facets, labels, onOpen, onReset }: FilterBarProps) {
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();
  const parts = queryParts(facets, labels);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // `flexGrow: 0` perché è l'intestazione di una schermata a colonna: senza, la
      // ScrollView si prenderebbe tutta l'altezza rimasta e i grafici sparirebbero sotto.
      style={{ flexGrow: 0 }}
      contentContainerStyle={{
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
      }}
    >
      {/* Il periodo per primo, e senza il riempimento d'accento delle altre: c'è sempre,
          quindi non è «un filtro attivo» — è il pezzo di calendario che si sta guardando. */}
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`Periodo: ${periodLabel(period)}. Tocca per cambiare i filtri`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs + 2,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          borderRadius: radius.pill,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <Feather name="calendar" size={13} color={colors.textMuted} />
        <Text
          style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}
        >
          {periodLabel(period)}
        </Text>
        <Feather name="chevron-down" size={14} color={colors.textFaint} />
      </Pressable>

      {parts.map((part, index) => (
        <Chip
          key={`${index}-${part}`}
          label={part}
          selected
          onPress={onOpen}
          accessibilityLabel={`Filtro attivo: ${part}. Tocca per cambiarlo`}
        />
      ))}

      {parts.length > 0 ? (
        <Pressable
          onPress={onReset}
          accessibilityRole="button"
          accessibilityLabel="Azzera i filtri"
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4 }}
        >
          <Feather name="x" size={14} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>Azzera</Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel="Filtri"
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4 }}
        >
          <Feather name="sliders" size={14} color={colors.accent} />
          <Text style={{ color: colors.accent, fontSize: fontSize.sm }}>Filtri</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
