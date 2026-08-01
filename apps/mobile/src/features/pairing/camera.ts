// `import type` e non un import normale: viene cancellato in compilazione, quindi
// descrive il modulo senza generare la richiesta che si vuole rimandare.
import type * as ExpoCamera from 'expo-camera';
import { markError } from '@/diagnostics';

type ExpoCameraModule = typeof ExpoCamera;

/** `unavailable`: la fotocamera non è raggiungibile su questa build, non è stata negata. */
export type CameraPermission = 'granted' | 'denied' | 'unavailable';

/**
 * Carica `expo-camera` solo quando serve davvero.
 *
 * expo-router importa **tutte** le route all'avvio: un `import` in cima alla schermata di
 * scansione verrebbe eseguito al boot, e su una build in cui il modulo nativo della
 * fotocamera manca o fallisce l'inizializzazione porterebbe giù l'intera app — non solo
 * questa schermata. Con il caricamento pigro il guasto resta confinato qui, e il pairing
 * si completa comunque incollando il codice a mano.
 */

// `undefined` = mai tentato, `null` = tentato e non disponibile.
let cached: ExpoCameraModule | null | undefined;

export function loadCameraModule(): ExpoCameraModule | null {
  if (cached !== undefined) return cached;
  try {
    // require e non import: deve poter fallire a runtime senza rompere il modulo.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-camera') as ExpoCameraModule;
  } catch (error) {
    markError('expo-camera non disponibile', error);
    cached = null;
  }
  return cached;
}

/**
 * Chiede il permesso di usare la fotocamera.
 *
 * Passa dall'API imperativa `Camera.requestCameraPermissionsAsync` e non dall'hook
 * `useCameraPermissions`, che pure sarebbe la via documentata: un hook va chiamato
 * incondizionatamente a ogni render, e qui il modulo potrebbe non esistere affatto.
 * L'accesso è difensivo perché quell'API è marcata `@hidden` a monte e potrebbe sparire
 * in una versione futura — nel qual caso resta il campo per incollare il codice.
 */
export async function requestCameraPermission(module: ExpoCameraModule): Promise<CameraPermission> {
  const request = module.Camera?.requestCameraPermissionsAsync;
  if (typeof request !== 'function') {
    markError('permessi fotocamera', new Error('Camera.requestCameraPermissionsAsync assente'));
    return 'unavailable';
  }
  const response = await request();
  return response.granted ? 'granted' : 'denied';
}
