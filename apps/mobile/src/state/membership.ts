import type { VaultStore } from '@jutrack/core';
import type { VaultOrigin } from './profile';

/**
 * Chi sono io in questo gruppo.
 *
 * - Un ricollegamento già registrato vince su tutto: è una risposta che l'utente ha dato.
 * - In un gruppo **creato qui** sono per definizione una persona nuova.
 * - In un gruppo in cui sono **entrato**, se il mio `profileId` è già fra i membri la
 *   domanda è già stata risposta da un avvio precedente.
 * - Altrimenti resta aperta: potrei essere nuovo, oppure essere già dentro con un altro
 *   nome perché ho ripristinato il backup della chiave su un telefono nuovo. Scegliere da
 *   soli qui è ciò che, allo Step 11, produceva due membri e un saldo sbagliato.
 *
 * Sta in un modulo suo e non dentro `VaultProvider` per una ragione precisa: è la
 * funzione del bug dei membri duplicati, e dentro un componente React sarebbe
 * verificabile **solo** su un telefono. Qui la eseguono i test e il dispositivo senza
 * schermo di `scripts/device.mts`, che è come si prova il sync avendo un telefono solo.
 */
export function resolveMyMemberId({
  store,
  origin,
  linkedMemberId,
  profileId,
}: {
  store: Pick<VaultStore, 'getMember'>;
  origin: VaultOrigin;
  linkedMemberId: string | null;
  profileId: string;
}): string | null {
  if (linkedMemberId !== null) return linkedMemberId;
  if (origin === 'created') return profileId;
  if (store.getMember(profileId) !== null) return profileId;
  return null;
}
