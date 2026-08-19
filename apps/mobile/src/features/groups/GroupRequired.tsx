import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { useTheme } from '@/theme';

interface GroupRequiredProps {
  /** Cosa non si può fare senza un gruppo, al posto del generico «questa schermata». */
  what?: string;
}

/**
 * Cosa si vede al posto di una schermata che ha bisogno di un gruppo, quando non ce n'è.
 *
 * È un componente condiviso e non un testo ripetuto perché lo mostrano due posti diversi:
 * il layout di `app/(gruppo)/`, che copre categorie, budget, pareggi, export e il form
 * spesa; e `pair/invite.tsx`, che un gruppo lo richiede ma **non** può stare in quella
 * cartella — `app/(gruppo)/pair/invite.tsx` e `app/pair/index.tsx` farebbero convergere due
 * cartelle diverse sullo stesso segmento `/pair`, ed è il tipo di ambiguità che si paga con
 * un'ora di debug su una rotta che non risolve.
 *
 * **Oggi non compare mai**: c'è sempre almeno un gruppo (Step 12). Dallo Step 21, in cui al
 * primo avvio non ne esiste nessuno, diventa il ramo vero — ed è per questo che la guardia
 * viene scritta prima dello stato vuoto che la attiva: quando arriva il ramo, il posto dove
 * metterlo esiste già.
 */
export function GroupRequired({ what }: GroupRequiredProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const resolvedWhat = what ?? t('groups.required.defaultWhat');
  return (
    <View style={{ flex: 1 }}>
      <EmptyState
        icon="👥"
        title={t('groups.required.title')}
        hint={t('groups.required.hint', { what: resolvedWhat })}
      />
      <View style={{ padding: spacing.lg }}>
        <Button label={t('groups.title')} onPress={() => router.push('/')} />
      </View>
    </View>
  );
}
