import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { plural } from '@/i18n/translate';
import { useTheme } from '@/theme';
import { describeNeed, unmetNeeds, type GroupFacts, type WidgetSpec } from './widgets';

interface HiddenDrawerProps {
  /** I widget spenti **di questo capitolo**, nell'ordine del layout. */
  specs: WidgetSpec[];
  facts: GroupFacts;
  onAdd: (spec: WidgetSpec) => void;
  onAddAll: () => void;
}

/**
 * Il cassetto dei widget tolti, in fondo alla modalità modifica.
 *
 * **Risolve il difetto più vecchio della composizione: l'elenco dei widget tolti non
 * esisteva in nessun posto.** L'unico modo di vederli era il selettore, dove una riga spenta
 * si distingueva da una accesa per la posizione di un interruttore — cioè per il dettaglio
 * più piccolo della riga. Qui ci sono solo loro, e si rimettono con un tocco.
 *
 * **Un widget a cui manca un dato si può rimettere lo stesso**, spento di contrasto e con
 * scritto cosa gli manca: la regola di sempre — un widget scelto non svanisce, dice cosa gli
 * serve — vale anche prima di sceglierlo. Impedirne la scelta vorrebbe dire che chi non ha
 * mai scritto un negozio non può nemmeno scoprire che esiste un grafico dei negozi.
 */
export function HiddenDrawer({ specs, facts, onAdd, onAddAll }: HiddenDrawerProps) {
  const { t } = useTranslation();
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();

  return (
    <View
      style={{
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md + 2,
        paddingTop: spacing.md,
        paddingBottom: spacing.md + 2,
        gap: spacing.sm + 2,
      }}
    >
      <View style={styles.head}>
        <Text
          style={{
            flex: 1,
            color: colors.textMuted,
            fontSize: fontSize.xxs,
            fontWeight: fontWeight.bold,
            letterSpacing: 1.3,
            textTransform: 'uppercase',
          }}
        >
          {plural('dashboard.hidden', specs.length)}
        </Text>
        <Pressable onPress={onAddAll} accessibilityRole="button" hitSlop={8}>
          <Text style={{ color: colors.accent, fontSize: fontSize.xs }}>
            {t('dashboard.restoreAll')}
          </Text>
        </Pressable>
      </View>

      <View style={styles.pills}>
        {specs.map((spec) => {
          const unmet = unmetNeeds(spec, facts);
          return (
            <Pressable
              key={spec.id}
              onPress={() => onAdd(spec)}
              accessibilityRole="button"
              accessibilityLabel={t('dashboard.add', { title: spec.title })}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingVertical: spacing.sm - 1,
                paddingHorizontal: spacing.md - 1,
                borderRadius: radius.pill,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.border,
                backgroundColor: pressed ? colors.surfacePressed : 'transparent',
                // Spento di contrasto, non spento e basta: resta premibile.
                opacity: unmet.length > 0 ? 0.6 : 1,
              })}
            >
              <Feather
                name="plus"
                size={12}
                color={unmet.length > 0 ? colors.textMuted : colors.accent}
              />
              <Text style={{ color: colors.text, fontSize: fontSize.xs + 1 }}>{spec.title}</Text>
              {/* La **stessa frase** che il widget mostrerà di sé una volta rimesso: due
                  formulazioni diverse farebbero pensare a due condizioni diverse. */}
              {unmet.length > 0 && (
                <Text style={{ color: colors.warning, fontSize: fontSize.xxs }}>
                  {unmet.map(describeNeed).join(' ')}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
});
