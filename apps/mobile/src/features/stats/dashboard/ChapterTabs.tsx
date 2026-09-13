import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';
import { CHAPTERS, chapterTitle, type Chapter } from './widgets';

interface ChapterTabsProps {
  value: Chapter;
  onChange: (chapter: Chapter) => void;
}

/**
 * I tre capitoli, come tre pillole a larghezza uguale.
 *
 * **A larghezza uguale e non a contenuto**: sono tre parti di una cosa sola, e tre bersagli
 * di larghezza diversa direbbero che uno conta più degli altri. È anche la ragione per cui
 * non sono `Chip`, che si dimensiona sull'etichetta e serve a scegliere *dentro* un elenco.
 *
 * `useTranslation()` pur non avendo stringhe proprie: i nomi arrivano da `chapterTitle()`,
 * che legge la lingua quando gira (Step 38).
 */
export function ChapterTabs({ value, onChange }: ChapterTabsProps) {
  useTranslation();
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();

  return (
    <View style={[styles.row, { paddingHorizontal: spacing.lg, gap: spacing.sm - 2 }]}>
      {CHAPTERS.map((chapter) => {
        const selected = chapter === value;
        return (
          <Pressable
            key={chapter}
            onPress={() => onChange(chapter)}
            // `tab` e non `button`: con TalkBack cambia l'annuncio da «pulsante» a
            // «scheda», che è ciò che dice a chi non vede che le tre si escludono.
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: 'center',
              paddingVertical: spacing.sm + 1,
              borderRadius: radius.pill,
              backgroundColor: selected
                ? colors.accent
                : pressed
                  ? colors.surfacePressed
                  : 'transparent',
              borderWidth: selected ? 0 : StyleSheet.hairlineWidth,
              borderColor: colors.border,
            })}
          >
            <Text
              numberOfLines={1}
              style={{
                color: selected ? colors.textOnAccent : colors.textMuted,
                fontSize: fontSize.sm,
                fontWeight: selected ? fontWeight.bold : fontWeight.semibold,
              }}
            >
              {chapterTitle(chapter)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
});
