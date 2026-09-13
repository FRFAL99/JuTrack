import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';

interface SettingSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** La frase che prima stava sotto il selettore, aperto insieme a tutto il resto. */
  hint?: string;
  children: ReactNode;
}

/**
 * Un'impostazione di «Tu», in un foglio dal basso.
 *
 * **Perché un foglio e non una schermata.** Il mockup disegna un chevron a destra, che vuol
 * dire «si va via»; ma queste quattro scelte si fanno guardando la riga da cui si è partiti
 * — «Valuta: EUR €» — e tornare indietro per verificare che il valore sia cambiato è un giro
 * per niente. Il foglio lascia la riga visibile dietro, e non aggiunge quattro rotte.
 *
 * **`Modal` di React Native e non `@gorhom/bottom-sheet`**, per la stessa ragione già
 * scritta in `GroupSwitcherSheet`: quello porterebbe `react-native-reanimated` e
 * `react-native-gesture-handler`, cioè una build EAS nuova per un gesto.
 *
 * Lo sfondo chiude e c'è anche una × esplicita: senza trascinamento, lo sfondo da solo è un
 * gesto che non si vede, e con TalkBack non esiste proprio.
 */
export function SettingSheet({ visible, onClose, title, hint, children }: SettingSheetProps) {
  const { t } = useTranslation();
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
      <View
        style={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom + spacing.lg,
          maxHeight: '80%',
        }}
      >
        <View style={{ alignItems: 'center', paddingTop: spacing.md }}>
          <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
        </View>

        <View
          style={[
            styles.head,
            { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
          ]}
        >
          <Text
            accessibilityRole="header"
            style={{
              flex: 1,
              color: colors.text,
              fontSize: fontSize.lg,
              fontWeight: fontWeight.bold,
            }}
          >
            {title}
          </Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            hitSlop={10}
            style={({ pressed }) => ({
              width: 30,
              height: 30,
              borderRadius: 15,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? colors.surfacePressed : 'transparent',
            })}
          >
            <Feather name="x" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          {children}
          {/* La nota resta: non era decorazione. «Vale solo su questo telefono» e «JuTrack
              non converte le valute» sono le due cose che, non lette, fanno prendere la
              scelta sbagliata. Qui però si leggono **mentre** si sceglie, invece che sotto
              un selettore sempre aperto che nessuno guardava più. */}
          {hint !== undefined && (
            <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs, lineHeight: 16 }}>
              {hint}
            </Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#00000099' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
