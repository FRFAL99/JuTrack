/**
 * Sigillo e apertura dei blob che transitano dal relay.
 *
 * Formato del blob:
 *
 *   byte 0        versione dello schema (0x01)
 *   byte 1..24    nonce (24 byte)
 *   byte 25..     ciphertext + tag Poly1305 (16 byte)
 *
 * Il byte di versione in testa consente di cambiare cifrario in futuro senza ambiguità:
 * un client nuovo riconosce i blob vecchi, uno vecchio rifiuta esplicitamente i nuovi
 * invece di decifrare spazzatura.
 */
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { concatBytes, utf8ToBytes } from './encoding';
import type { RandomSource } from './types';

/** Versione corrente dello schema. Incrementare solo cambiando cifrario o formato. */
export const SEAL_VERSION = 0x01;

const NONCE_BYTES = 24;
const TAG_BYTES = 16;
const HEADER_BYTES = 1 + NONCE_BYTES;

/**
 * Dati autenticati ma non cifrati, legati al blob dal tag Poly1305.
 *
 * Include versione e vaultId: un blob spostato su un altro vault, o riproposto sotto una
 * versione di schema diversa, non supera l'autenticazione. Senza questo legame un relay
 * ostile potrebbe travasare blob fra vault diversi.
 */
function associatedData(vaultId: string, version: number): Uint8Array {
  return concatBytes(new Uint8Array([version]), utf8ToBytes(vaultId));
}

/** Cifra `plaintext` per il vault indicato. Ogni chiamata usa un nonce nuovo. */
export function seal(
  contentKey: Uint8Array,
  vaultId: string,
  plaintext: Uint8Array,
  random: RandomSource,
): Uint8Array {
  const nonce = random.getRandomBytes(NONCE_BYTES);
  if (nonce.length !== NONCE_BYTES) {
    // Un nonce corto o riutilizzato compromette la riservatezza di XChaCha20.
    throw new Error(`nonce non valido: attesi ${NONCE_BYTES} byte, ricevuti ${nonce.length}`);
  }
  const aad = associatedData(vaultId, SEAL_VERSION);
  const ciphertext = xchacha20poly1305(contentKey, nonce, aad).encrypt(plaintext);
  return concatBytes(new Uint8Array([SEAL_VERSION]), nonce, ciphertext);
}

/**
 * Decifra un blob prodotto da `seal`.
 *
 * Solleva un errore se il blob è malformato, manomesso, destinato a un altro vault o
 * prodotto con una versione di schema sconosciuta. Chi chiama deve scartare il blob,
 * non applicarlo.
 */
export function open(contentKey: Uint8Array, vaultId: string, blob: Uint8Array): Uint8Array {
  if (blob.length < HEADER_BYTES + TAG_BYTES) {
    throw new Error(`blob troppo corto: ${blob.length} byte`);
  }

  const version = blob[0];
  if (version !== SEAL_VERSION) {
    throw new Error(`versione di schema non supportata: 0x${version?.toString(16) ?? '??'}`);
  }

  const nonce = blob.subarray(1, HEADER_BYTES);
  const ciphertext = blob.subarray(HEADER_BYTES);
  const aad = associatedData(vaultId, version);

  return xchacha20poly1305(contentKey, nonce, aad).decrypt(ciphertext);
}
