import { Redirect } from 'expo-router';

/**
 * «Componi la dashboard» non esiste più: si compone **dentro** i Grafici (Step 52).
 *
 * Il file resta per **un ciclo** come redirect, e non perché qualcuno ci navighi: expo-router
 * persiste l'ultima rotta, quindi chi aveva questa schermata aperta quando ha aggiornato
 * l'app ci riatterra all'avvio. Senza questo file vedrebbe una rotta inesistente.
 *
 * È la stessa procedura già usata per `settings.tsx` al passo 4 del redesign. **Si cancella
 * al ciclo dopo**, insieme a questo commento.
 */
export default function DashboardRedirect() {
  return <Redirect href="/stats" />;
}
