import { Stack } from 'expo-router';
import { ModalScreen } from '@/components/ModalScreen';
import { GroupRequired } from '@/features/groups/GroupRequired';
import { useGroups } from '@/state';
import { useTheme } from '@/theme';

/**
 * Le schermate che senza un gruppo non hanno senso, dietro **un'unica** guardia.
 *
 * Ci stanno categorie, budget, pareggi, export e il form della spesa: tutte leggono o
 * scrivono il vault del gruppo aperto. Restano invece fuori, deliberatamente:
 *
 * - **`backup.tsx`**, che è l'unica schermata da cui si **ripristina** una chiave, cioè
 *   la cosa che serve proprio a chi non ha nessun gruppo — dopo un azzeramento, o su un
 *   telefono nuovo. Metterla qui renderebbe irraggiungibile il ripristino quando serve.
 * - **`pair/invite.tsx`**, che un gruppo lo richiede ma non può traslocare: `app/(gruppo)/pair/`
 *   e `app/pair/` convergerebbero sullo stesso segmento `/pair`. Usa `GroupRequired` in linea.
 * - **`probe.tsx`** e le impostazioni, che parlano dell'app e non di un gruppo.
 *
 * **Le parentesi non compaiono nell'URL**: `/categories`, `/budget`, `/settle`, `/export`,
 * `/expense/new` e `/expense/<id>` sono rimasti quelli di prima, quindi nessun `router.push`
 * è stato toccato.
 *
 * Lo `Stack` va reso davvero: con un `<Slot />` si perderebbero le animazioni di push e la
 * pila di ritorno di queste schermate, che sono compiti che si aprono e si chiudono.
 */
export default function GroupRequiredLayout() {
  const { colors } = useTheme();
  const { current } = useGroups();

  // Oggi è sempre vero — c'è sempre almeno un gruppo. Dallo Step 21 sarà il **solo** punto
  // dell'app in cui questo ramo esiste, invece di mezza dozzina di condizioni sparse.
  if (current === null) {
    return (
      <ModalScreen title="Serve un gruppo">
        <GroupRequired />
      </ModalScreen>
    );
  }

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    />
  );
}
