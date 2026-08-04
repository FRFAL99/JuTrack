import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

interface ScreenProps extends ViewProps {
  /** Titolo grande in cima alla schermata. Omesso se non serve. */
  title?: string;
  /**
   * Intestazione libera al posto del titolo grande, **esclusiva con `title`**: se c'è, il
   * titolo non si disegna.
   *
   * Il titolo da 34px è sparito da tre schermate su cinque nel redesign — le spese usano la
   * pill del gruppo, i grafici lo stepper del mese, Tu il blocco identità — ma non da
   * tutte: l'elenco dei gruppi senza gruppi e le schermate modali lo tengono. Quindi il
   * componente resta uno solo con due modi, invece di due componenti che divergono.
   *
   * Il nodo si riceve **senza padding orizzontale**: le intestazioni del redesign hanno
   * spaziature proprie e alcune arrivano a filo dello schermo.
   */
  header?: ReactNode;
}

/**
 * Contenitore di schermata: applica sfondo, safe area superiore e padding coerenti.
 *
 * La safe area inferiore è gestita dalla tab bar, quindi qui si applica solo quella
 * superiore — altrimenti si otterrebbe uno spazio vuoto doppio sopra la tab bar.
 *
 * **`onTitlePress` non c'è più.** Serviva al nome del gruppo in cima alle sue spese, che
 * toccato apriva la gestione; dal passo 6 il gruppo è tornato una pill — che apre il
 * selettore — e alla gestione porta il bottone con le leve accanto. Era il suo unico
 * chiamante, e un titolo toccabile senza nessuno che lo tocchi è codice che il prossimo
 * lettore deve capire per scoprire che non serve.
 */
export function Screen({ title, header, style, children, ...rest }: ScreenProps) {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const insets = useSafeAreaInsets();

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
      {header === undefined && title !== undefined && (
        <Text
          accessibilityRole="header"
          style={{
            color: colors.text,
            fontSize: fontSize.xxl,
            fontWeight: fontWeight.bold,
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.md,
          }}
        >
          {title}
        </Text>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
