/**
 * Configurazione dell'app.
 *
 * L'URL del relay non è un segreto: è un endpoint pubblico, protetto dal token di
 * autenticazione derivato dalla chiave del vault. Un relay che conoscesse l'URL ma non
 * il token non può leggere nulla — e nemmeno con il token, perché i dati sono cifrati.
 */

/** Relay predefinito. Sovrascrivibile con EXPO_PUBLIC_RELAY_URL per puntare a uno locale. */
export const RELAY_URL =
  process.env.EXPO_PUBLIC_RELAY_URL ?? 'https://jutrack-relay.jutrack-relayfrfal.workers.dev';
