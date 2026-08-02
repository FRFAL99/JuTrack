import * as SecureStore from 'expo-secure-store';
import type { SecureKeyStore } from '@jutrack/core';

/**
 * Archivio protetto del dispositivo: Keychain su iOS, Keystore su Android.
 *
 * È qui che vive la chiave del vault. Protegge la chiave **a riposo**: con il telefono
 * sbloccato e l'app aperta i dati restano leggibili. Vedi docs/threat-model.md.
 */
export const expoKeyStore: SecureKeyStore = {
  get: (key) => SecureStore.getItemAsync(key),
  set: (key, value) =>
    SecureStore.setItemAsync(key, value, {
      // Accessibile solo dopo il primo sblocco successivo all'avvio, e non incluso
      // nei backup verso un altro dispositivo: una chiave end-to-end non deve
      // propagarsi fuori dal telefono che l'ha ricevuta.
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }),
  delete: (key) => SecureStore.deleteItemAsync(key),
};

export { groupKeyStorageKey, LEGACY_VAULT_KEY_STORAGE_KEY } from './key-names';
