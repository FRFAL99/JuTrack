import { StyleSheet, View, type ViewProps } from 'react-native';
import { useTheme } from '@/theme';

/** Superficie sopraelevata per raggruppare contenuti correlati. */
export function Card({ style, children, ...rest }: ViewProps) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
