import { Redirect } from 'expo-router';

/**
 * Le impostazioni sono confluite nel tab Tu (redesign, passo 4): sincronizzazione e
 * diagnostica non riguardano un gruppo più di quanto riguardino me, e un tab in meno chiude
 * il problema dei quattro tab senza gerarchia.
 *
 * Il file resta come redirect, non si cancella: chi riapre l'app dopo l'aggiornamento con
 * `/settings` come ultima rotta salvata — expo-router persiste lo stack — deve arrivare
 * comunque da qualche parte, non su una rotta sparita. Da togliere dopo un ciclo, quando
 * nessuna installazione può più avere quello stato salvato.
 */
export default function SettingsRedirect() {
  return <Redirect href="/tu" />;
}
