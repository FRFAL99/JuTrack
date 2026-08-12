// `import type` e non un import normale: viene cancellato in compilazione, quindi descrive
// il modulo senza generare la richiesta che si vuole rimandare.
import type * as ExpoNotifications from 'expo-notifications';
import { markError } from '@/diagnostics';

type NotificationsModule = typeof ExpoNotifications;

/**
 * Carica `expo-notifications` solo quando serve davvero.
 *
 * Stessa ragione della fotocamera (`features/pairing/camera.ts`), e qui è più urgente: la
 * development build installata sul telefono **è stata compilata prima** che questo modulo
 * esistesse, e lo resterà finché non se ne installa una nuova. Un `import` in cima a una
 * schermata verrebbe eseguito al boot — expo-router importa tutte le rotte — e porterebbe
 * giù l'intera app su quella build, non solo la parte che avvisa.
 *
 * Il ripiego è che le notifiche non compaiono. Non è un ripiego che serva mostrare: chi ha
 * la build vecchia non ha ancora attivato niente, perché gli interruttori arrivano con gli
 * Step 31–33.
 */

// `undefined` = mai tentato, `null` = tentato e non disponibile.
let cached: NotificationsModule | null | undefined;

export function loadNotificationsModule(): NotificationsModule | null {
  if (cached !== undefined) return cached;
  try {
    // require e non import: deve poter fallire a runtime senza rompere il modulo.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-notifications') as NotificationsModule;
  } catch (error) {
    markError('expo-notifications non disponibile', error);
    cached = null;
  }
  return cached;
}

/**
 * Lo stato del permesso di notificare, **senza chiederlo**.
 *
 * `getPermissionsAsync` legge, `requestPermissionsAsync` apre il dialogo di sistema. La
 * diagnostica deve poter dire come stanno le cose senza cambiarle: un permesso chiesto da
 * una schermata di sonda è un permesso chiesto nel momento in cui l'utente meno se lo
 * aspetta, e su Android 13 il dialogo si può rifiutare una volta sola.
 *
 * `null` se il modulo non c'è: è diverso da «negato», e le due cose non vanno confuse.
 */
export async function readNotificationPermission(): Promise<'granted' | 'denied' | null> {
  const module = loadNotificationsModule();
  if (module === null) return null;
  try {
    const status = await module.getPermissionsAsync();
    return status.granted ? 'granted' : 'denied';
  } catch (error) {
    markError('stato del permesso notifiche', error);
    return null;
  }
}
