import {
  assertVaultKey,
  bytesToHex,
  deriveVaultKeys,
  generateVaultKey,
  hexToBytes,
  type SecureKeyStore,
  type VaultKeys,
} from '@jutrack/core';
import { expoRandom, VAULT_KEY_STORAGE_KEY, type KeyValueStore } from '@/platform';
import { markVaultOrigin } from './profile';

/**
 * Chiave del vault a riposo.
 *
 * Vive in `expo-secure-store` (Keychain iOS / Keystore Android). Il sync è attivo solo
 * se esiste: senza chiave non c'è vault, e l'app resta un tracker puramente locale.
 */

/** Legge la chiave salvata, se c'è. */
export async function loadVaultKeys(store: SecureKeyStore): Promise<VaultKeys | null> {
  const hex = await store.get(VAULT_KEY_STORAGE_KEY);
  if (hex === null) return null;

  try {
    return deriveVaultKeys(hexToBytes(hex));
  } catch {
    // Una chiave illeggibile è peggio di nessuna chiave: proseguire con dati corrotti
    // produrrebbe un vaultId sbagliato e un vault vuoto che sembra funzionante.
    // Meglio comportarsi come se non ci fosse e lasciare che l'utente ne crei o
    // ripristini una.
    return null;
  }
}

/**
 * Legge la chiave radice così com'è, senza derivarla.
 *
 * Serve solo al pairing: è la chiave radice, non le derivate, a dover finire nel QR.
 * Ovunque altrove si usa `loadVaultKeys`, che restituisce già le chiavi d'uso.
 */
export async function loadVaultKeyBytes(store: SecureKeyStore): Promise<Uint8Array | null> {
  const hex = await store.get(VAULT_KEY_STORAGE_KEY);
  if (hex === null) return null;

  try {
    const key = hexToBytes(hex);
    // Meglio non generare alcun invito che generarne uno con una chiave corrotta:
    // l'altro telefono la adotterebbe e finirebbe in un vault che non esiste.
    assertVaultKey(key);
    return key;
  } catch {
    return null;
  }
}

/**
 * Crea un vault nuovo e ne salva la chiave.
 *
 * Da chiamare una sola volta, sul primo dispositivo. Il secondo riceve **questa stessa
 * chiave** tramite il pairing: generarne una propria creerebbe due vault separati che
 * non si sincronizzerebbero mai.
 */
export async function createVault(store: SecureKeyStore, meta: KeyValueStore): Promise<VaultKeys> {
  const key = generateVaultKey(expoRandom);
  const keys = deriveVaultKeys(key);
  await store.set(VAULT_KEY_STORAGE_KEY, bytesToHex(key));
  // Chi crea semina le categorie di default; chi entra no. Va registrato adesso: dopo,
  // guardando un documento pieno di dati sincronizzati, i due casi sono indistinguibili.
  await markVaultOrigin(meta, keys.vaultId, 'created');
  return keys;
}

/** Adotta una chiave ricevuta da un altro dispositivo. */
export async function adoptVaultKey(
  store: SecureKeyStore,
  meta: KeyValueStore,
  key: Uint8Array,
): Promise<VaultKeys> {
  const keys = deriveVaultKeys(key);
  await store.set(VAULT_KEY_STORAGE_KEY, bytesToHex(key));
  await markVaultOrigin(meta, keys.vaultId, 'joined');
  return keys;
}

/**
 * Dimentica la chiave su questo dispositivo.
 *
 * I dati cifrati sul relay restano, ma diventano illeggibili da qui: senza un backup
 * della chiave sono irrecuperabili. Chi chiama deve chiedere conferma.
 */
export async function forgetVault(store: SecureKeyStore): Promise<void> {
  await store.delete(VAULT_KEY_STORAGE_KEY);
}
