import { GroupHome } from '@/features/expenses/GroupHome';
import { useCurrentGroup } from '@/state';

/**
 * Le spese del gruppo dell'**URL**: `/groups/<vaultId>`.
 *
 * È l'indirizzo su cui atterra chi entra da un invito, e per questo non si può cambiare —
 * i link già mandati lo contengono. Mostra la stessa schermata della radice del tab, con lo
 * stesso componente: la differenza è solo chi decide quale gruppo, l'URL qui e il registro
 * là. A rendere corrente il gruppo di questa rotta è la guardia in `[vaultId]/_layout.tsx`,
 * prima che questo si monti.
 *
 * **Non è un redirect verso `/`**, che sarebbe stata la strada più corta: in uno stack le
 * schermate sotto quella a fuoco restano montate, quindi un `<Redirect>` qui scatterebbe
 * anche mentre si guarda `/groups/<id>/manage` — che sta nello stesso stack, sopra questa —
 * e chiuderebbe la gestione del gruppo appena aperta. Un componente condiviso non naviga.
 *
 * **Quella stessa guardia rende `null` impossibile qui**, ma il compilatore non lo sa, e la
 * risposta non è un `!`: è il ramo qui sotto, prima di ogni hook che legga il vault.
 */
export default function GroupExpensesScreen() {
  const group = useCurrentGroup();
  // Irraggiungibile: il layout mostra il proprio caricamento finché il gruppo dell'URL non
  // è quello corrente, quindi qui non si arriva mai senza. Niente stato vuoto da disegnare.
  if (group === null) return null;
  return <GroupHome key={group.vaultId} group={group} />;
}
