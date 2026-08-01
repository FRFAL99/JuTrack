import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';

interface EmptyStateProps {
  icon: string;
  title: string;
  /** Cosa può fare l'utente adesso. Uno stato vuoto senza via d'uscita è un vicolo cieco. */
  hint: string;
}

export function EmptyState({ icon, title, hint }: EmptyStateProps) {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  return (
    <View style={[styles.root, { padding: spacing.xl, gap: spacing.sm }]}>
      <Text style={{ fontSize: 44 }}>{icon}</Text>
      <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.semibold }}>
        {title}
      </Text>
      <Text style={[styles.hint, { color: colors.textMuted, fontSize: fontSize.sm }]}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: { textAlign: 'center', lineHeight: 20 },
});
