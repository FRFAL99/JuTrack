import { Text } from 'react-native';
import { useTheme } from '@/theme';

/**
 * L'etichetta che apre una sezione del registro.
 *
 * Maiuscoletta piccola e spaziata: deve dire di cosa parla il blocco che segue senza
 * competere con il contenuto. È l'alternativa alla card nelle schermate di lettura — dove
 * la card raggruppa con un bordo, qui a raggruppare è un'intestazione e un filetto.
 *
 * Il testo si passa come figlio invece che come prop perché è sempre e solo testo, e
 * `<SectionLabel>Dove sono finiti</SectionLabel>` si legge come quello che è.
 */
export function SectionLabel({ children }: { children: string }) {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  return (
    <Text
      accessibilityRole="header"
      style={{
        color: colors.textMuted,
        fontSize: fontSize.xxs,
        fontWeight: fontWeight.bold,
        letterSpacing: 1.3,
        textTransform: 'uppercase',
        paddingTop: spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.sm,
      }}
    >
      {children}
    </Text>
  );
}
