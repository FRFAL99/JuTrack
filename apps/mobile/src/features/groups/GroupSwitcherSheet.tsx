import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GroupPicker } from '@/features/groups/GroupPicker';
import type { GroupStats } from '@/features/groups/list';
import { useTheme } from '@/theme';

interface GroupSwitcherSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Spese e totale del mese del gruppo aperto, per la sua riga. */
  currentStats?: GroupStats;
}

/**
 * Il selettore di gruppo, in un foglio dal basso.
 *
 * Prima era la radice del tab — una schermata intera per una domanda che si pone di rado —
 * e le spese stavano un livello sotto. Adesso è il contrario: le spese sono la radice, e il
 * gruppo si cambia da qui.
 *
 * **`Modal` di React Native e non `@gorhom/bottom-sheet`.** Quello porterebbe
 * `react-native-reanimated` e `react-native-gesture-handler`, due moduli nativi che
 * imporrebbero una build EAS nuova — e la development build installata sul telefono è
 * l'unica che c'è. La resa a schermo è la stessa finché non serve trascinare il foglio con
 * il dito; se un giorno servirà, è il momento di pagare quel prezzo, non prima.
 */
export function GroupSwitcherSheet({ visible, onClose, currentStats }: GroupSwitcherSheetProps) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Lo sfondo chiude, com'è convenzione per un foglio: è anche l'unico modo di
          chiuderlo senza un gesto di trascinamento, che questa implementazione non ha. */}
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
      <View
        style={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom,
          maxHeight: '80%',
        }}
      >
        <View style={{ alignItems: 'center', paddingTop: spacing.md }}>
          <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
        </View>
        <ScrollView>
          <GroupPicker {...(currentStats !== undefined ? { currentStats } : {})} onDone={onClose} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#00000099' },
});
