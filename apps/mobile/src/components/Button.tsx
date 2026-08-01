import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();
  // Durante il caricamento il bottone è inerte: evita doppi invii su tap ripetuti.
  const inert = disabled || loading;

  const background = (pressed: boolean): string => {
    if (variant === 'secondary') return pressed ? colors.surfacePressed : colors.surface;
    if (variant === 'danger') return colors.danger;
    return pressed ? colors.accentPressed : colors.accent;
  };

  const labelColor = variant === 'secondary' ? colors.text : colors.textOnAccent;

  return (
    <Pressable
      onPress={onPress}
      disabled={inert}
      accessibilityRole="button"
      accessibilityState={{ disabled: inert, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: background(pressed),
          borderRadius: radius.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          borderWidth: variant === 'secondary' ? StyleSheet.hairlineWidth : 0,
          borderColor: colors.border,
          opacity: inert ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <Text style={{ color: labelColor, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    // Altezza minima per un target tattile comodo anche con label corte.
    minHeight: 48,
  },
});
