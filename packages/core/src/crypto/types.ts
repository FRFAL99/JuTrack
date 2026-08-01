/**
 * Interfacce delle primitive fornite dalla piattaforma.
 *
 * Il core non sa se gira su React Native, browser o Node: riceve queste
 * implementazioni per dependency injection. È ciò che rende il package riusabile
 * sul web senza modifiche.
 */

/**
 * Sorgente di numeri casuali crittograficamente sicura.
 *
 * Deve provenire dal CSPRNG di sistema (`expo-crypto` su mobile, `crypto.getRandomValues`
 * sul web). `Math.random()` non è accettabile: è prevedibile e comprometterebbe chiavi e nonce.
 */
export interface RandomSource {
  getRandomBytes(length: number): Uint8Array;
}

/**
 * Archivio protetto per la chiave del vault.
 *
 * Su mobile è `expo-secure-store` (Keychain iOS / Keystore Android). Le operazioni sono
 * asincrone perché l'accesso al portachiavi di sistema lo è.
 */
export interface SecureKeyStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}
