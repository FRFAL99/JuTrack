import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { numeric, useTheme } from '@/theme';
import { BACKSPACE, decimalKey } from './amount-pad';

interface AmountPadProps {
  /** Il tasto premuto, già come carattere: una cifra, il separatore, o `BACKSPACE`. */
  onKey: (char: string) => void;
}

/**
 * Il tastierino dell'importo, dentro l'app.
 *
 * **Perché non la tastiera di sistema.** Con quella, il salva finisce sotto la tastiera e la
 * schermata va scorsa; con il tastierino qui le due cose che servono sempre — la cifra e il
 * salva — stanno insieme a schermo (decisione 4 del Piano v6).
 *
 * **Nessun modulo nativo**: è una griglia di `Pressable`. È la sesta volta che il progetto
 * rifiuta un modulo nativo per un gesto, e la coerenza ha un valore misurabile — una sola
 * development build installata copre tutto il codice scritto.
 *
 * Chiama `useTranslation()` pur avendo una stringa sola: il tasto del separatore legge la
 * lingua da `decimalKey()`, che la legge quando gira. Senza l'hook, cambiando lingua il
 * tasto resterebbe quello di prima fino al primo ridisegno per altri motivi.
 */
export function AmountPad({ onKey }: AmountPadProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const decimal = decimalKey();

  return (
    <View
      style={{ paddingHorizontal: spacing.md, gap: spacing.sm }}
      accessibilityLabel={t('expense.pad.title')}
    >
      {[
        ['7', '8', '9'],
        ['4', '5', '6'],
        ['1', '2', '3'],
      ].map((row) => (
        <View key={row.join('')} style={[styles.row, { gap: spacing.sm }]}>
          {row.map((digit) => (
            <PadKey key={digit} label={digit} onPress={() => onKey(digit)} />
          ))}
        </View>
      ))}
      <View style={[styles.row, { gap: spacing.sm }]}>
        <PadKey
          label={decimal}
          accessibilityLabel={t('expense.pad.decimal')}
          onPress={() => onKey(decimal)}
        />
        <PadKey label="0" onPress={() => onKey('0')} />
        <PadKey
          accessibilityLabel={t('expense.pad.delete')}
          onPress={() => onKey(BACKSPACE)}
          icon="delete"
        />
      </View>
    </View>
  );
}

/**
 * Un tasto.
 *
 * L'etichetta è già l'annuncio di TalkBack quando è una cifra, quindi
 * `accessibilityLabel` arriva solo per i due tasti che un carattere non lo sa spiegare: il
 * separatore — «,» letto da solo non dice niente — e la cancellazione, che ha un'icona.
 */
function PadKey({
  label,
  accessibilityLabel,
  icon,
  onPress,
}: {
  label?: string;
  accessibilityLabel?: string;
  icon?: 'delete';
  onPress: () => void;
}) {
  const { colors, radius, fontSize, fontWeight } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      {...(accessibilityLabel !== undefined && { accessibilityLabel })}
      style={({ pressed }) => [
        styles.key,
        {
          borderRadius: radius.lg,
          backgroundColor: pressed ? colors.surfacePressed : colors.surface,
        },
      ]}
    >
      {icon === undefined ? (
        <Text
          style={[
            numeric,
            { color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
          ]}
        >
          {label}
        </Text>
      ) : (
        <Feather name={icon} size={22} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  key: {
    flex: 1,
    // 56 e non `minHeight`: dodici tasti della stessa altezza esatta sono una griglia, e una
    // griglia si batte senza guardare. È lo stesso genere di valore letterale del `minHeight`
    // di `Button` — un'altezza di bersaglio tattile, che non appartiene alla scala tipografica.
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
