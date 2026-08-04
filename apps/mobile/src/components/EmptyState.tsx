import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';

interface EmptyStateProps {
  /**
   * Un'emoji (resa come testo a 44px, il comportamento di sempre) oppure un nodo già
   * pronto — tipicamente un'icona Feather — per chi vuole disegnare la propria misura e
   * colore. Il redesign lo usa per i due stati vuoti dei Grafici, senza toccare gli altri
   * chiamanti, che continuano a passare un'emoji.
   */
  icon: string | ReactNode;
  title: string;
  /** Cosa può fare l'utente adesso. Uno stato vuoto senza via d'uscita è un vicolo cieco. */
  hint: string;
}

export function EmptyState({ icon, title, hint }: EmptyStateProps) {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  return (
    <View style={[styles.root, { padding: spacing.xl, gap: spacing.sm }]}>
      {typeof icon === 'string' ? <Text style={{ fontSize: 44 }}>{icon}</Text> : icon}
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
