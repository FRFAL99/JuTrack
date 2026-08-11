import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { SectionLabel } from '@/components/SectionLabel';
import { useTheme } from '@/theme';
import { describeNeed, type WidgetNeed, type WidgetSpec } from './widgets';

interface DashboardWidgetProps {
  spec: WidgetSpec;
  /** Primo della dashboard: niente filetto sopra, o resterebbe un tratto appeso in cima. */
  first: boolean;
  /** I bisogni dichiarati che il gruppo non soddisfa. Vuoto quando il widget può disegnare. */
  unmet: WidgetNeed[];
  /**
   * Il widget potrebbe disegnare, ma in questo periodo non ha niente da dire.
   *
   * Diverso da `unmet`, che riguarda il **gruppo** («non avete mai scritto un negozio»)
   * invece del periodo scelto («in questi giorni nessuna spesa ne aveva uno»). Sono due
   * frasi diverse perché due sono le cose da fare per rimediare.
   */
  empty?: boolean;
  children: ReactNode;
}

/**
 * La cornice comune di un widget: filetto, etichetta, contenuto.
 *
 * **Ogni widget dice il proprio nome, anche quelli che allo Step 26 non lo dicevano** — il
 * totale in cima e i tre riquadri di riepilogo. Finché la sequenza era fissa, un numero
 * grande in cima alla schermata si spiegava da sé; da quando si può spostare in fondo o
 * togliere ciò che gli sta intorno, non più. È la composizione a rendere obbligatorie le
 * etichette, non un ripensamento grafico.
 *
 * **Un widget scelto non svanisce mai.** Se gli manca un dato lo scrive, e se in questo
 * periodo non ha niente da mostrare lo scrive: una riga sparita si legge come un guasto, e
 * un grafico disegnato su zero si legge come un dato — «non ho speso niente» invece di
 * «qui non c'è niente da vedere».
 */
export function DashboardWidget({
  spec,
  first,
  unmet,
  empty = false,
  children,
}: DashboardWidgetProps) {
  const { colors, spacing, fontSize } = useTheme();

  return (
    <View>
      {!first && (
        <View
          style={{
            height: StyleSheet.hairlineWidth,
            backgroundColor: colors.border,
            marginTop: spacing.lg,
          }}
        />
      )}
      <SectionLabel>{spec.title}</SectionLabel>

      {unmet.length > 0 ? (
        <Missing lines={unmet.map(describeNeed)} />
      ) : empty ? (
        <Missing lines={['In questo periodo non c’è niente da mostrare.']} />
      ) : (
        children
      )}

      {/* La nota del selettore non si ripete qui: il sottotitolo spiega **quale** widget
          scegliere, e a chi lo sta già guardando non serve. */}
      {unmet.length > 0 && (
        <Text
          style={{
            color: colors.textFaint,
            fontSize: fontSize.xxs,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.xs,
          }}
        >
          {spec.subtitle}
        </Text>
      )}
    </View>
  );
}

function Missing({ lines }: { lines: string[] }) {
  const { colors, spacing, fontSize } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
      }}
    >
      <Feather name="info" size={13} color={colors.textFaint} />
      <Text style={{ flex: 1, color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
        {lines.join(' ')}
      </Text>
    </View>
  );
}
