import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

interface ScreenProps extends ViewProps {
  /** Titolo grande in cima alla schermata. Omesso se non serve. */
  title?: string;
  /**
   * Intestazione libera al posto del titolo grande, **esclusiva con `title`**: se c'è, il
   * titolo non si disegna, e con lui `onTitlePress` e `titleHint`.
   *
   * Il titolo da 34px sparisce da tre schermate su cinque nel redesign — le spese usano la
   * pill del gruppo, i grafici lo stepper del mese, Tu il blocco identità — ma non da
   * tutte, e le schermate modali lo tengono. Quindi il componente resta uno solo con due
   * modi, invece di due componenti che divergono.
   *
   * Il nodo si riceve **senza padding orizzontale**: le intestazioni del redesign hanno
   * spaziature proprie e alcune arrivano a filo dello schermo.
   */
  header?: ReactNode;
  /**
   * Se presente, il titolo diventa toccabile e guadagna un chevron.
   *
   * È il caso del nome del gruppo in cima alle sue spese: il titolo **è** il gruppo, e
   * toccarlo porta a gestirlo. Senza, la gestione non avrebbe più un ingresso da quando
   * l'elenco dei gruppi apre le spese invece della scheda del gruppo.
   */
  onTitlePress?: () => void;
  /** Cosa succede toccando il titolo, per chi usa uno screen reader. */
  titleHint?: string;
}

/**
 * Contenitore di schermata: applica sfondo, safe area superiore e padding coerenti.
 *
 * La safe area inferiore è gestita dalla tab bar, quindi qui si applica solo quella
 * superiore — altrimenti si otterrebbe uno spazio vuoto doppio sopra la tab bar.
 */
export function Screen({
  title,
  header,
  onTitlePress,
  titleHint,
  style,
  children,
  ...rest
}: ScreenProps) {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const insets = useSafeAreaInsets();

  const titleStyle = {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  } as const;
  const titlePadding = { paddingHorizontal: spacing.lg, paddingBottom: spacing.md } as const;

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.background, paddingTop: insets.top + spacing.md },
        style,
      ]}
      {...rest}
    >
      {header}
      {header === undefined &&
        title !== undefined &&
        (onTitlePress === undefined ? (
          <Text accessibilityRole="header" style={[titleStyle, titlePadding]}>
            {title}
          </Text>
        ) : (
          <Pressable
            onPress={onTitlePress}
            accessibilityRole="button"
            accessibilityLabel={title}
            accessibilityHint={titleHint}
          >
            {({ pressed }) => (
              <View style={[styles.titleRow, titlePadding, { opacity: pressed ? 0.6 : 1 }]}>
                <Text numberOfLines={1} style={[titleStyle, styles.titleText]}>
                  {title}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.xl }}>›</Text>
              </View>
            )}
          </Pressable>
        ))}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  titleText: { flexShrink: 1 },
});
