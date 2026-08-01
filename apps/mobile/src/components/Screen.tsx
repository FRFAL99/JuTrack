import { StyleSheet, Text, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

interface ScreenProps extends ViewProps {
  /** Titolo grande in cima alla schermata. Omesso se non serve. */
  title?: string;
}

/**
 * Contenitore di schermata: applica sfondo, safe area superiore e padding coerenti.
 *
 * La safe area inferiore è gestita dalla tab bar, quindi qui si applica solo quella
 * superiore — altrimenti si otterrebbe uno spazio vuoto doppio sopra la tab bar.
 */
export function Screen({ title, style, children, ...rest }: ScreenProps) {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.background, paddingTop: insets.top + spacing.md },
        style,
      ]}
      {...rest}
    >
      {title !== undefined && (
        <Text
          accessibilityRole="header"
          style={{
            color: colors.text,
            fontSize: fontSize.xxl,
            fontWeight: fontWeight.bold,
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.md,
          }}
        >
          {title}
        </Text>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
