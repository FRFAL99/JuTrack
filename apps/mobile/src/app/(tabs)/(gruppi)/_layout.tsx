import { Stack } from 'expo-router';
import { useTheme } from '@/theme';

/**
 * Il primo tab è uno stack: elenco dei gruppi → gruppo aperto.
 *
 * Lo stack sta **dentro** il tab e non sulla radice, perché il gruppo aperto è la
 * schermata principale dell'app: da lì si va ai Grafici e alle Impostazioni. Spinto sulla
 * radice coprirebbe la tab bar, e per cambiare tab bisognerebbe prima chiudere il gruppo.
 * Le schermate-foglia (categorie, budget, pareggi, form spesa) restano invece sulla
 * radice, dove coprire la tab bar è giusto: sono compiti che si aprono e si chiudono.
 *
 * **Le parentesi non compaiono nell'URL.** L'elenco resta a `/` e il gruppo a
 * `/groups/<vaultId>`, esattamente com'erano prima di questo spostamento: sono i percorsi
 * con cui si entra in un gruppo dopo un invito, e cambiarli li romperebbe in silenzio.
 */
export const unstable_settings = { initialRouteName: 'index' };

export default function GruppiLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    />
  );
}
