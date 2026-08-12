import { View } from 'react-native';
import { CURRENCIES } from '@jutrack/core';
import { Chip } from '@/components/Chip';
import { useTheme } from '@/theme';

/**
 * La valuta di questo telefono.
 *
 * Pillole e non cerchi come `ColorChoice`: lì la scelta *è* il colore, qui è una parola, e
 * una parola in un cerchio da 44 punti non ci sta. `Chip` è il componente che l'app usa già
 * ovunque si scelga fra modi (Step 24), quindi non ne nasce uno nuovo.
 *
 * L'etichetta porta **codice e simbolo insieme** — «EUR €» — perché il solo simbolo non
 * basta a distinguere i due dollari, e il solo codice non fa vedere cosa comparirà accanto
 * agli importi. Il nome per esteso resta nell'etichetta di accessibilità, dove non deve
 * stare in una riga.
 */
export function CurrencyPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  const { spacing } = useTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {CURRENCIES.map((currency) => (
        <Chip
          key={currency.code}
          label={`${currency.code} ${currency.symbol}`}
          selected={currency.code === value}
          accessibilityLabel={currency.name}
          onPress={() => onChange(currency.code)}
        />
      ))}
    </View>
  );
}
