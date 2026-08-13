import { View } from 'react-native';
import { Chip } from '@/components/Chip';
import { LANGUAGES } from '@/i18n/language';
import { useTheme } from '@/theme';

/**
 * La lingua di questo telefono.
 *
 * Pillole come `CurrencyPicker`, e per la stessa ragione: la scelta è una parola, non un
 * colore. Con due lingue si potrebbe pensare a un interruttore, ma un interruttore ha un
 * verso — acceso è «inglese»? — e la terza lingua costringerebbe comunque a rifarlo.
 *
 * L'etichetta **non passa da `t`**, ed è l'unica dell'app a non passarci: le lingue si
 * chiamano «Italiano» e «English» in qualunque lingua sia l'app, altrimenti chi apre il
 * selettore proprio perché non capisce la lingua corrente non riconoscerebbe la propria.
 * Nessuna `accessibilityLabel`: sarebbe la stessa parola detta due volte.
 */
export function LanguagePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  const { spacing } = useTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {LANGUAGES.map((language) => (
        <Chip
          key={language.code}
          label={language.label}
          selected={language.code === value}
          onPress={() => onChange(language.code)}
        />
      ))}
    </View>
  );
}
