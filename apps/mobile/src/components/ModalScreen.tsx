import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

interface ModalScreenProps extends ViewProps {
  title: string;
}

/** Schermata a pagina intera con intestazione e pulsante di chiusura. */
export function ModalScreen({ title, children, style, ...rest }: ModalScreenProps) {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
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
          accessibilityLabel="Chiudi"
          hitSlop={12}
        >
          <Text style={{ color: colors.accent, fontSize: fontSize.md }}>Chiudi</Text>
        </Pressable>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
