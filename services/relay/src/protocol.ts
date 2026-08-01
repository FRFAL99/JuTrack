/**
 * Protocollo del relay.
 *
 * Definizioni condivise fra Worker e Durable Object. Nessuna di queste strutture
 * contiene dati in chiaro: i blob sono byte opachi.
 */

/** Massima dimensione di un singolo blob cifrato. */
export const MAX_BLOB_BYTES = 1024 * 1024;

/** Massimo numero di blob accettati in una singola richiesta. */
export const MAX_BLOBS_PER_REQUEST = 100;

/** Massimo numero di update restituiti in una singola risposta. */
export const MAX_UPDATES_PER_RESPONSE = 200;

/** Giorni dopo i quali un update viene eliminato. */
export const UPDATE_TTL_DAYS = 30;

/** Formato di `vaultId`: 32 caratteri esadecimali (16 byte). */
export const VAULT_ID_PATTERN = /^[0-9a-f]{32}$/;

/** Formato del token di autenticazione: 64 caratteri esadecimali (32 byte). */
export const AUTH_TOKEN_PATTERN = /^[0-9a-f]{64}$/;

export interface PushRequest {
  /** Blob cifrati, in base64. */
  blobs: string[];
}

export interface PushResponse {
  /** Numero di sequenza più alto dopo l'inserimento. */
  head: number;
  accepted: number;
}

export interface PullResponse {
  updates: { seq: number; blob: string }[];
  /** Numero di sequenza più alto presente sul relay. */
  head: number;
  /** `true` se ci sono altri update oltre quelli restituiti. */
  hasMore: boolean;
}

export interface ErrorResponse {
  error: string;
}
