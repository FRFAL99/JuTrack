import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { useTheme } from '@/theme';

interface NavCardProps {
  title: string;
  subtitle: string;
  onPress: () => void;
}

/**
 * Riga che porta a un'altra schermata.
 *
 * Nata dentro le impostazioni, che ne contenevano quattro identiche: tenerle allineate a
 * mano significava che una finiva col chevron disallineato o senza stato di pressione. È
 * salita fra i componenti quando le schermate di gruppo (categorie, budget, pareggi,
 * backup, export) si sono spostate nella gestione del gruppo e le stesse righe sono
 * servite in due posti.
 */
export function NavCard({ title, subtitle, onPress }: NavCardProps) {
  const { colors, fontSize, fontWeight, spacing } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {({ pressed }) => (
        <Card style={{ backgroundColor: pressed ? colors.surfacePressed : colors.surface }}>
          <View style={styles.rowBetween}>
            <View style={{ gap: 2, flex: 1, paddingRight: spacing.sm }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: fontSize.md,
                  fontWeight: fontWeight.semibold,
                }}
              >
                {title}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
                {subtitle}
              </Text>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.lg }}>›</Text>
          </View>
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
