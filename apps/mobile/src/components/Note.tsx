import type { ReactNode } from 'react';
import { Text } from 'react-native';
import { useTheme } from '@/theme';

interface NoteProps {
  children: ReactNode;
  /**
   * `warning` per ciò che va saputo prima di procedere, `danger` per ciò che non si disfa.
   *
   * Il default non è timidezza: una nota è **spiegazione**, e colorarle tutte toglierebbe
   * peso alle due che devono fermare la mano.
   */
  tone?: 'default' | 'warning' | 'danger';
}

/**
 * La riga che spiega, sotto un'intestazione o accanto a un comando.
 *
 * **Prende il posto dei paragrafi dentro le card.** Le schermate di impostazioni erano fatte
 * di `Card` con un titolo in grassetto e sotto duecento o trecento caratteri a `fontSize.sm`
 * con `lineHeight: 20` — un blocco che pesa quanto il comando che accompagna, e che dopo la
 * prima lettura nessuno rilegge più. Qui la spiegazione scende a `xxs` e `textFaint`: resta
 * leggibile per chi la cerca e smette di competere con ciò che si deve toccare.
 *
 * È la stessa regola dei riassunti della nuova spesa, letta al contrario: là `textFaint` era
 * vietato perché quelle righe portavano un **valore**; qui è giusto, perché queste righe
 * portano un **commento**. Il commento in `tokens.ts` dice «mai per il contenuto», e una
 * spiegazione non è il contenuto della schermata: il contenuto sono i comandi.
 */
export function Note({ children, tone = 'default' }: NoteProps) {
  const { colors, spacing, fontSize } = useTheme();
  const color =
    tone === 'danger' ? colors.danger : tone === 'warning' ? colors.warning : colors.textFaint;

  return (
    <Text
      style={{
        color,
        fontSize: fontSize.xxs,
        lineHeight: 16,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.sm,
      }}
    >
      {children}
    </Text>
  );
}
