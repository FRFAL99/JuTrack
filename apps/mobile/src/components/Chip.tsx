import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/theme';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /**
   * Colore proprio di ciò che la pillola rappresenta: la categoria, un domani un tag.
   *
   * Senza, la pillola selezionata si riempie d'accento — è una **scelta fra modi**, e il
   * colore non aggiunge informazione. Con, prende bordo del colore e fondo `color + '22'`:
   * il colore *è* l'informazione, ed è la stessa tinta con cui quella cosa compare nei
   * grafici.
   */
  color?: string;
  /** Nodo a sinistra dell'etichetta, per l'icona della categoria. */
  icon?: ReactNode;
  accessibilityLabel?: string;
}

/**
 * La pillola selezionabile, in un posto solo.
 *
 * Era scritta a mano due volte dentro `ExpenseForm.tsx` — le modalità di divisione e le
 * categorie — e lo Step 24 ne avrebbe aggiunta una terza per i tag. Tre copie della stessa
 * cosa significano che la prossima modifica ne aggiorna due su tre.
 *
 * **Il peso dell'etichetta è una regola sola per entrambe le famiglie**: `semibold` da
 * selezionata, `medium` altrimenti. Le due copie divergevano — le modalità stavano su
 * `medium` sempre, le categorie su `semibold`/`regular` — ed era un'inezia nata dallo
 * scriverle in due momenti diversi, non una distinzione voluta.
 */
export function Chip({ label, selected, onPress, color, icon, accessibilityLabel }: ChipProps) {
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();

  const tinted = color !== undefined;
  const background = selected ? (tinted ? color + '22' : colors.accent) : 'transparent';
  const border = selected ? (color ?? colors.accent) : colors.border;
  const labelColor = selected ? (tinted ? colors.text : colors.textOnAccent) : colors.textMuted;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      {...(accessibilityLabel !== undefined && { accessibilityLabel })}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs + 2,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.pill,
        backgroundColor: background,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: border,
      }}
    >
      {icon}
      <Text
        style={{
          color: labelColor,
          fontSize: fontSize.sm,
          fontWeight: selected ? fontWeight.semibold : fontWeight.medium,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
