import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';

interface ModalScreenProps extends ViewProps {
  title: string;
  /**
   * L'etichetta del pulsante in alto a destra.
   *
   * «Chiudi» è giusto per le schermate spinte sulla radice, che coprono la tab bar e si
   * chiudono. Una schermata spinta dentro lo stack di un tab la tab bar la mantiene, e
   * lì il gesto è tornare indietro di un passo, non chiudere: `'‹ Indietro'`.
   */
  closeLabel?: string;
  /**
   * Chiudi come **x tonda a sinistra**, titolo al centro, e niente a destra.
   *
   * Per le schermate la cui azione principale è un bottone a piena larghezza **in fondo**,
   * dove il pollice arriva: se «Salva» stesse anche in alto a destra sarebbero due modi di
   * fare la stessa cosa, e quello in alto è il meno raggiungibile dei due. La usa il form
   * della spesa; le altre tredici schermate modali tengono l'etichetta testuale, perché lì
   * il pulsante in alto **è** l'unico modo di uscire.
   */
  compact?: boolean;
}

/** Schermata a pagina intera con intestazione e pulsante di chiusura. */
export function ModalScreen({
  title,
  closeLabel,
  compact = false,
  children,
  style,
  ...rest
}: ModalScreenProps) {
  const { t } = useTranslation();
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  // Il default non può più stare nella destrutturazione: `t` non esiste ancora lì, e un
  // valore di default calcolato da un hook va preso dopo che l'hook è stato chiamato.
  const close = closeLabel ?? t('common.close');
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.background, paddingTop: insets.top + spacing.sm },
        style,
      ]}
      {...rest}
    >
      {compact ? (
        <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingBottom: spacing.md }]}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={close}
            hitSlop={8}
            style={({ pressed }) => ({
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? colors.surfacePressed : colors.surface,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.border,
            })}
          >
            <Feather name="x" size={17} color={colors.textMuted} />
          </Pressable>
          <Text
            accessibilityRole="header"
            style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
          >
            {title}
          </Text>
          {/* Lo spazio vuoto a destra tiene il titolo al centro: senza, sarebbe centrato
              sullo spazio che resta dopo la x, cioè spostato. */}
          <View style={{ width: 32 }} />
        </View>
      ) : (
        <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingBottom: spacing.md }]}>
          <Text
            accessibilityRole="header"
            style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.semibold }}
          >
            {title}
          </Text>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={close}
            hitSlop={12}
          >
            <Text style={{ color: colors.accent, fontSize: fontSize.md }}>{close}</Text>
          </Pressable>
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
