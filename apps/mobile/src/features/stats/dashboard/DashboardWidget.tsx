import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Feather from '@expo/vector-icons/Feather';
import { SectionLabel } from '@/components/SectionLabel';
import { useTheme } from '@/theme';
import { describeNeed, type WidgetNeed, type WidgetSpec } from './widgets';

/**
 * I comandi che il widget prende in modalità modifica.
 *
 * Assente quando non si sta componendo: è il modo in cui «la cornice ha due stati» si
 * dichiara nel tipo invece che in un booleano e quattro prop che hanno senso solo insieme.
 */
export interface WidgetEditing {
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (delta: number) => void;
  onRemove: () => void;
}

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
  /** I comandi di composizione. Presente **solo** in modalità modifica. */
  editing?: WidgetEditing;
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
  editing,
  children,
}: DashboardWidgetProps) {
  const { t } = useTranslation();
  const { colors, spacing, radius, fontSize } = useTheme();

  const body =
    unmet.length > 0 ? (
      <Missing lines={unmet.map(describeNeed)} />
    ) : empty ? (
      <Missing lines={[t('dashboard.widgetEmpty')]} />
    ) : (
      children
    );

  if (editing !== undefined) {
    return (
      <View
        style={{
          marginHorizontal: spacing.sm + 2,
          marginBottom: spacing.sm,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          overflow: 'hidden',
        }}
      >
        <EditBar spec={spec} editing={editing} />
        {/*
          Il contenuto **vero** resta a schermo, perché è l'unico modo di riconoscere un
          grafico senza dargli un nome astratto — ed è tutto il punto di comporre in loco.
          Il prezzo è che a opacità ridotta il widget è comunque **montato** e i suoi
          `Pressable` sono ancora attivi: toccare una barra dei mesi cambierebbe il periodo
          mentre lo si compone, e una cella della heatmap scriverebbe un giorno.
          `pointerEvents="none"` è quel prezzo, e costa una riga.
        */}
        <View pointerEvents="none" style={{ opacity: 0.45, paddingVertical: spacing.md }}>
          {body}
        </View>
      </View>
    );
  }

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

      {body}

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

/**
 * La barretta di comando sopra il grafico: nome, su, giù, e la × per toglierlo.
 *
 * **La × è `danger` e non `expense`**, che pure è a un passo di distanza a vederli.
 * `tokens.ts` li definisce come due cose diverse — *uscite di denaro* e *azioni
 * distruttive* — e su una schermata il cui soggetto sono i soldi, il rosa di `expense` si
 * legge come un importo. Il precedente giusto è `ListRow tone="danger"`. Proprio perché i
 * due colori sono vicini, la distinzione va tenuta dove è dichiarata: nei nomi.
 */
function EditBar({ spec, editing }: { spec: WidgetSpec; editing: WidgetEditing }) {
  const { t } = useTranslation();
  const { colors, spacing, fontSize, fontWeight } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: spacing.md,
        paddingRight: spacing.sm,
        paddingVertical: spacing.xs + 1,
        backgroundColor: colors.surface,
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          color: colors.text,
          fontSize: fontSize.xxs,
          fontWeight: fontWeight.bold,
          letterSpacing: 1.3,
          textTransform: 'uppercase',
        }}
      >
        {spec.title}
      </Text>

      <IconButton
        name="chevron-up"
        label={t('dashboard.moveUp', { title: spec.title })}
        disabled={!editing.canMoveUp}
        onPress={() => editing.onMove(-1)}
      />
      <IconButton
        name="chevron-down"
        label={t('dashboard.moveDown', { title: spec.title })}
        disabled={!editing.canMoveDown}
        onPress={() => editing.onMove(1)}
      />
      <IconButton
        name="x"
        label={t('dashboard.remove', { title: spec.title })}
        disabled={false}
        tone="danger"
        onPress={editing.onRemove}
      />
    </View>
  );
}

function IconButton({
  name,
  label,
  disabled,
  tone = 'accent',
  onPress,
}: {
  name: 'chevron-up' | 'chevron-down' | 'x';
  label: string;
  disabled: boolean;
  tone?: 'accent' | 'danger';
  onPress: () => void;
}) {
  const { colors, radius } = useTheme();
  const color = disabled ? colors.textFaint : tone === 'danger' ? colors.danger : colors.accent;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => ({
        width: 34,
        height: 34,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.pill,
        backgroundColor: pressed ? colors.surfacePressed : 'transparent',
      })}
    >
      <Feather name={name} size={name === 'x' ? 17 : 19} color={color} />
    </Pressable>
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
