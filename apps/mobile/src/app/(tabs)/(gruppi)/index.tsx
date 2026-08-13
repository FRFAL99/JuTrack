import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { GroupHome } from '@/features/expenses/GroupHome';
import { GroupPicker } from '@/features/groups/GroupPicker';
import { useCurrentGroup } from '@/state';
import { useTheme } from '@/theme';

/**
 * La radice del primo tab: **le spese del gruppo aperto**.
 *
 * Fino al passo 5 del redesign qui c'era l'elenco dei gruppi, e le spese stavano un livello
 * sotto. Era il contrario di come si usa l'app: si apre per registrare una spesa, non per
 * scegliere in quale gruppo si è. L'elenco è diventato il foglio che si apre dalla pill
 * nell'header — `GroupSwitcherSheet` — e questa è la schermata che si trova aprendo l'app.
 *
 * **Gli URL non cambiano.** Questa rotta era `/` ed è rimasta `/`; `/groups/<vaultId>`, che
 * è l'indirizzo su cui atterra chi entra da un invito, continua a esistere e a mostrare la
 * stessa schermata attraverso lo stesso componente. Cambiare uno dei due avrebbe rotto in
 * silenzio gli inviti già mandati.
 *
 * Con zero gruppi (Step 21) mostra gli ingressi invece di zeri: è lo **stesso** componente
 * del foglio, montato a piena pagina. Un componente, due contenitori.
 */
export default function GruppiRootScreen() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const group = useCurrentGroup();

  if (group === null) {
    // Titolo corto: a 34px «Non hai ancora nessun gruppo» andrebbe a tre righe, e a dirlo
    // per esteso c'è già il paragrafo dentro `GroupPicker`.
    return (
      <Screen title={t('groups.title')}>
        <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
          {/* `onDone` non ha nulla da chiudere: qui il selettore **è** la schermata. Le
              sue azioni navigano o cambiano il gruppo corrente, e in entrambi i casi
              questo ramo smette da sé di essere quello montato. */}
          <GroupPicker onDone={() => {}} />
          <View style={{ height: spacing.lg }} />
        </ScrollView>
      </Screen>
    );
  }

  // La chiave rimonta l'albero al cambio di gruppo. Senza, lo stato locale della schermata
  // — il foglio aperto, la posizione di scorrimento — sopravvivrebbe a un gruppo che non
  // c'è più, e la lista mostrerebbe per un istante le spese di quello di prima sotto il
  // nome di quello nuovo.
  return <GroupHome key={group.vaultId} group={group} />;
}
