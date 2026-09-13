import type { ReactNode } from 'react';
import { Pressable, Text } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';

interface ListRowProps {
  label: string;
  /** Lo stato corrente dell'impostazione, a destra prima del chevron. */
  value?: string;
  /**
   * `warning` sul **valore**, non sulla label.
   *
   * Distinto da `tone`, che colora la label per le righe che portano a un gesto
   * distruttivo: qui a non andare bene non è dove la riga porta, è **ciò che dice** — gli
   * avvisi accesi che Android non lascia arrivare. Colorare la label direbbe che è la voce
   * a essere pericolosa.
   */
  valueTone?: 'default' | 'warning';
  /**
   * Nodo al posto del valore, per gli stati che una parola non descrive.
   *
   * Lo usa la riga del colore personale: «Blu» sarebbe un nome inventato da tenere
   * allineato alla palette, e la pallina *è* l'informazione. Esclusivo con `value`.
   */
  accessory?: ReactNode;
  /**
   * `danger` colora la label, per le righe che portano a un gesto che distrugge dati.
   *
   * Come per `NavCard`, è un tono e non un pulsante: la riga naviga, e a chiedere conferma
   * è la schermata che si apre.
   */
  tone?: 'default' | 'danger';
  onPress: () => void;
}

/**
 * La riga di impostazione del registro: label, valore, chevron.
 *
 * Sostituisce la `NavCard` ovunque il sottotitolo esplicativo non serva davvero — cioè
 * quasi ovunque. `NavCard` resta per i due casi in cui una frase di spiegazione è
 * necessaria prima di toccare (Diagnostica, Ripristina da backup): lì il sottotitolo è
 * l'informazione, non decorazione.
 *
 * **Non disegna separatori.** A comporre la sezione è la schermata, che sa quale riga è
 * l'ultima e quanto rientrare il filetto: una riga che si porta dietro il proprio bordo
 * inferiore ne lascia sempre uno di troppo in fondo all'elenco.
 */
export function ListRow({
  label,
  value,
  valueTone = 'default',
  accessory,
  tone = 'default',
  onPress,
}: ListRowProps) {
  const { colors, spacing, fontSize } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={value === undefined ? label : `${label}, ${value}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md + 2,
        paddingHorizontal: spacing.lg,
        backgroundColor: pressed ? colors.surfacePressed : 'transparent',
      })}
    >
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          color: tone === 'danger' ? colors.danger : colors.text,
          fontSize: fontSize.md,
        }}
      >
        {label}
      </Text>

      {value !== undefined && (
        <Text
          numberOfLines={1}
          style={{
            flexShrink: 1,
            color: valueTone === 'warning' ? colors.warning : colors.textMuted,
            fontSize: fontSize.sm,
          }}
        >
          {value}
        </Text>
      )}

      {accessory}

      <Feather name="chevron-right" size={18} color={colors.textFaint} />
    </Pressable>
  );
}
