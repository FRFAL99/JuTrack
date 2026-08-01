import { Pressable, Text, View } from 'react-native';
import { PROFILE_COLORS } from '@/state/profile';
import { useTheme } from '@/theme';

/**
 * Scelta del colore personale.
 *
 * La selezione non è affidata al solo colore — sarebbe illeggibile proprio per chi ha
 * più bisogno di distinguerli: il cerchio scelto porta un anello di contrasto e un segno
 * di spunta, e ogni voce ha la propria etichetta di accessibilità.
 */
export function ColorChoice({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  const { colors, spacing, fontSize, fontWeight } = useTheme();

  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
      {PROFILE_COLORS.map((color, index) => {
        const selected = color === value;
        return (
          <Pressable
            key={color}
            onPress={() => onChange(color)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`Colore ${index + 1} di ${PROFILE_COLORS.length}`}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: color,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: selected ? 3 : 1,
              borderColor: selected ? colors.text : colors.border,
            }}
          >
            {/* Tutti i colori della palette sono saturi e scuri a sufficienza perché il
                bianco resti leggibile sopra. */}
            {selected && (
              <Text
                style={{ color: '#FFFFFF', fontSize: fontSize.md, fontWeight: fontWeight.bold }}
              >
                ✓
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
