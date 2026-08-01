/**
 * Backup della chiave del vault protetto da passphrase.
 *
 * È l'unica via di recupero esistente: non c'è reset lato server, perché un server capace
 * di ripristinare i dati sarebbe un server capace di leggerli.
 *
 * Qui — e **solo** qui — la sicurezza dipende da una passphrase scelta da un umano. Nel
 * funzionamento quotidiano la chiave è casuale a 256 bit. Vedi docs/threat-model.md.
 *
 * Formato (92 byte, poi base64url con prefisso `JTBK1.`):
 *
 *   byte 0        versione del formato (0x01)
 *   byte 1        log2(N) di scrypt
 *   byte 2        r di scrypt
 *   byte 3        p di scrypt
 *   byte 4..19    salt (16 byte)
 *   byte 20..43   nonce (24 byte)
 *   byte 44..91   vaultKey cifrata (32 byte + tag 16)
 *
 * I parametri scrypt viaggiano nel backup: un file esportato oggi resta importabile anche
 * dopo che avremo alzato il costo di default su dispositivi più veloci.
 */
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import { base64urlToBytes, bytesToBase64url, concatBytes, utf8ToBytes } from './encoding';
import { assertVaultKey, VAULT_KEY_BYTES } from './keys';
import type { RandomSource } from './types';

export const BACKUP_VERSION = 0x01;
export const BACKUP_PREFIX = 'JTBK1.';

const SALT_BYTES = 16;
const NONCE_BYTES = 24;
const TAG_BYTES = 16;
const HEADER_BYTES = 4;
const BACKUP_BYTES = HEADER_BYTES + SALT_BYTES + NONCE_BYTES + VAULT_KEY_BYTES + TAG_BYTES;

/**
 * Costo di default di scrypt.
 *
 * N=2^16 è un compromesso: su desktop ~175 ms, su telefono qualche secondo. Serve solo
 * per export e import del backup, operazioni rare e volontarie, quindi l'attesa è
 * accettabile in cambio della resistenza a un attacco offline sulla passphrase.
 *
 * Il valore va calibrato sul dispositivo reale: se risulta troppo lento si abbassa, se
 * risulta istantaneo va alzato. I backup già esportati restano importabili in ogni caso,
 * perché i parametri sono scritti nel backup stesso.
 */
export const DEFAULT_SCRYPT_PARAMS = { logN: 16, r: 8, p: 1 } as const;

export interface ScryptParams {
  logN: number;
  r: number;
  p: number;
}

/** Lega i parametri KDF al ciphertext: impedisce di rigiocare il backup con costo abbassato. */
function associatedData(version: number, params: ScryptParams): Uint8Array {
  return concatBytes(
    new Uint8Array([version, params.logN, params.r, params.p]),
    utf8ToBytes('jutrack/backup'),
  );
}

async function deriveFromPassphrase(
  passphrase: string,
  salt: Uint8Array,
  params: ScryptParams,
): Promise<Uint8Array> {
  // scryptAsync e non scrypt: la variante sincrona bloccherebbe il thread JS per secondi,
  // congelando l'interfaccia. Questa cede il controllo periodicamente.
  return scryptAsync(utf8ToBytes(passphrase.normalize('NFKC')), salt, {
    N: 2 ** params.logN,
    r: params.r,
    p: params.p,
    dkLen: 32,
  });
}

/** Esporta la chiave del vault come stringa condivisibile, cifrata con la passphrase. */
export async function exportBackup(
  vaultKey: Uint8Array,
  passphrase: string,
  random: RandomSource,
  params: ScryptParams = DEFAULT_SCRYPT_PARAMS,
): Promise<string> {
  assertVaultKey(vaultKey);
  if (passphrase.length === 0) throw new Error('la passphrase non può essere vuota');

  const salt = random.getRandomBytes(SALT_BYTES);
  const nonce = random.getRandomBytes(NONCE_BYTES);
  const wrappingKey = await deriveFromPassphrase(passphrase, salt, params);
  const aad = associatedData(BACKUP_VERSION, params);
  const ciphertext = xchacha20poly1305(wrappingKey, nonce, aad).encrypt(vaultKey);

  const blob = concatBytes(
    new Uint8Array([BACKUP_VERSION, params.logN, params.r, params.p]),
    salt,
    nonce,
    ciphertext,
  );
  return BACKUP_PREFIX + bytesToBase64url(blob);
}

/**
 * Ripristina la chiave del vault da un backup.
 *
 * Solleva un errore se il backup è malformato o se la passphrase è sbagliata. Le due
 * cause restano distinguibili nel messaggio: non è un'informazione utile a un attaccante
 * — chi ha il backup può comunque provare le passphrase — ma lo è molto per l'utente
 * che sta cercando di capire perché il ripristino non funziona.
 */
export async function importBackup(backup: string, passphrase: string): Promise<Uint8Array> {
  const trimmed = backup.trim();
  if (!trimmed.startsWith(BACKUP_PREFIX)) {
    throw new Error(`backup non riconosciuto: manca il prefisso ${BACKUP_PREFIX}`);
  }

  const blob = base64urlToBytes(trimmed.slice(BACKUP_PREFIX.length));
  if (blob.length !== BACKUP_BYTES) {
    throw new Error(`backup malformato: attesi ${BACKUP_BYTES} byte, trovati ${blob.length}`);
  }

  const version = blob[0] ?? 0;
  if (version !== BACKUP_VERSION) {
    throw new Error(`versione di backup non supportata: 0x${version.toString(16)}`);
  }

  const params: ScryptParams = { logN: blob[1] ?? 0, r: blob[2] ?? 0, p: blob[3] ?? 0 };
  if (params.logN < 10 || params.logN > 22 || params.r < 1 || params.p < 1) {
    // Un logN assurdo farebbe allocare gigabyte o renderebbe banale il brute force.
    throw new Error('backup malformato: parametri scrypt fuori intervallo');
  }

  const salt = blob.subarray(HEADER_BYTES, HEADER_BYTES + SALT_BYTES);
  const nonce = blob.subarray(HEADER_BYTES + SALT_BYTES, HEADER_BYTES + SALT_BYTES + NONCE_BYTES);
  const ciphertext = blob.subarray(HEADER_BYTES + SALT_BYTES + NONCE_BYTES);

  const wrappingKey = await deriveFromPassphrase(passphrase, salt, params);
  const aad = associatedData(version, params);

  let vaultKey: Uint8Array;
  try {
    vaultKey = xchacha20poly1305(wrappingKey, nonce, aad).decrypt(ciphertext);
  } catch {
    throw new Error('passphrase errata, oppure backup danneggiato');
  }

  assertVaultKey(vaultKey);
  return vaultKey;
}
