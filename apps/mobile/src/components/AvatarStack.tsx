import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { initialOf, splitAvatars } from './avatar';

interface Person {
  id: string;
  name: string;
  color: string;
}

interface AvatarStackProps {
  people: Person[];
  /** Quanti posti ci sono. Oltre, l'ultimo diventa `+N`. */
  max?: number;
  size?: number;
  /**
   * Colore della superficie su cui la pila è appoggiata.
   *
   * Serve per l'anello che separa un cerchio dal successivo: dipingerlo del colore di ciò
   * che sta sotto è ciò che dà l'illusione della sovrapposizione. Passarlo sbagliato non
   * rompe nulla, disegna solo un contorno che non c'entra.
   */
  surface: string;
}

/**
 * I cerchi delle persone, sovrapposti.
 *
 * Il colore viene dal membro — è quello che la persona ha scelto nel proprio profilo e che
 * la identifica in tutti i gruppi — e la lettera dal nome. Non c'è mai solo il colore: un
 * cerchio colorato e basta sarebbe indistinguibile per chi non separa due tinte vicine.
 */
export function AvatarStack({ people, max = 4, size = 26, surface }: AvatarStackProps) {
  const { colors, fontWeight } = useTheme();
  const { visible, overflow } = splitAvatars(people, max);

  const shape = (first: boolean, background: string): ViewStyle => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: background,
    borderColor: surface,
    // Il primo no, o rientrerebbe rispetto a ciò che ha accanto.
    marginLeft: first ? 0 : -Math.round(size / 3),
  });

  const letter = { fontSize: Math.round(size * 0.42), fontWeight: fontWeight.bold } as const;

  return (
    <View style={styles.row}>
      {visible.map((person, index) => (
        <View
          key={person.id}
          accessible
          accessibilityLabel={person.name}
          style={[styles.circle, shape(index === 0, person.color)]}
        >
          {/* Bianco sul colore del membro: i colori del profilo sono saturi e validati
              per contrasto, ed è il testo a portare l'identità quando due sono vicini. */}
          <Text style={[letter, { color: colors.textOnAccent }]}>{initialOf(person.name)}</Text>
        </View>
      ))}

      {overflow > 0 && (
        <View
          accessible
          accessibilityLabel={`e altre ${overflow} persone`}
          style={[styles.circle, shape(visible.length === 0, colors.surfacePressed)]}
        >
          {/* Qui il fondo è una superficie del tema, non un colore di membro: il bianco
              sparirebbe sul tema chiaro. */}
          <Text style={[letter, { color: colors.textMuted }]}>{`+${overflow}`}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  circle: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
});
