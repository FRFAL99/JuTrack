/**
 * Derivazione delle chiavi del vault.
 *
 * Una sola radice casuale (`vaultKey`), da cui HKDF-SHA256 deriva tutto il resto su
 * domini separati. Vedi docs/architecture.md § Gestione delle chiavi.
 */
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { equalBytes } from '@noble/ciphers/utils.js';
import { bytesToHex, utf8ToBytes } from './encoding';
import type { RandomSource } from './types';

/** Lunghezza della chiave radice e di tutte le chiavi derivate. */
export const VAULT_KEY_BYTES = 32;

/**
 * Etichette di dominio per HKDF.
 *
 * Il suffisso di versione consente di ruotare lo schema di derivazione in futuro senza
 * ambiguità. **Non modificare queste stringhe**: cambiarle rende illeggibili tutti i
 * dati già cifrati e invalida i vault esistenti.
 */
const INFO_CONTENT = 'jutrack/content/v1';
const INFO_AUTH = 'jutrack/auth/v1';
const INFO_VAULT_ID = 'jutrack/vault-id/v1';

/** Byte dell'identificatore di vault prima della codifica esadecimale. */
const VAULT_ID_BYTES = 16;

/** Chiavi derivate da una vaultKey. */
export interface VaultKeys {
  /**
   * Identificatore pubblico del vault, 32 caratteri esadecimali.
   * Derivato dalla chiave, quindi i due dispositivi lo calcolano identico senza scambiarselo.
   * La derivazione è a senso unico: dal vaultId non si risale alla chiave.
   */
  vaultId: string;
  /** Cifra e decifra i contenuti. Non lascia mai il dispositivo. */
  contentKey: Uint8Array;
  /** Prova l'appartenenza al vault verso il relay. Il relay la vede, ma è a senso unico. */
  authKey: Uint8Array;
}

function derive(vaultKey: Uint8Array, info: string, length: number): Uint8Array {
  // salt omesso di proposito: la ikm è già una chiave casuale a piena entropia,
  // quindi la separazione la fa `info`. Con una passphrase servirebbe un salt.
  return hkdf(sha256, vaultKey, undefined, utf8ToBytes(info), length);
}

/** Genera una nuova chiave radice. Da chiamare una sola volta, sul primo dispositivo. */
export function generateVaultKey(random: RandomSource): Uint8Array {
  const key = random.getRandomBytes(VAULT_KEY_BYTES);
  if (key.length !== VAULT_KEY_BYTES) {
    // Una RandomSource difettosa che restituisce meno byte del richiesto produrrebbe
    // chiavi deboli in silenzio. Meglio fallire subito e rumorosamente.
    throw new Error(`RandomSource ha restituito ${key.length} byte invece di ${VAULT_KEY_BYTES}`);
  }
  return key;
}

/** Deriva vaultId, contentKey e authKey dalla chiave radice. Deterministica. */
export function deriveVaultKeys(vaultKey: Uint8Array): VaultKeys {
  assertVaultKey(vaultKey);
  return {
    vaultId: bytesToHex(derive(vaultKey, INFO_VAULT_ID, VAULT_ID_BYTES)),
    contentKey: derive(vaultKey, INFO_CONTENT, VAULT_KEY_BYTES),
    authKey: derive(vaultKey, INFO_AUTH, VAULT_KEY_BYTES),
  };
}

/**
 * Token di autenticazione da inviare al relay nell'header Authorization.
 *
 * È `authKey` in esadecimale. Il relay ne memorizza lo SHA-256 e confronta: conoscere
 * il token non dà alcun vantaggio verso `contentKey`.
 */
export function authToken(keys: VaultKeys): string {
  return bytesToHex(keys.authKey);
}

/**
 * Confronto a tempo costante fra due segreti.
 *
 * Un `===` fra stringhe esce al primo carattere diverso, e il tempo di risposta rivela
 * quanti caratteri iniziali erano corretti — abbastanza per ricostruire un token a forza
 * bruta un carattere alla volta.
 */
export function secretsMatch(a: Uint8Array, b: Uint8Array): boolean {
  return equalBytes(a, b);
}

/** Verifica che una chiave abbia la lunghezza attesa, con messaggio diagnostico chiaro. */
export function assertVaultKey(key: Uint8Array): void {
  if (key.length !== VAULT_KEY_BYTES) {
    throw new Error(`vaultKey non valida: attesi ${VAULT_KEY_BYTES} byte, ricevuti ${key.length}`);
  }
}
