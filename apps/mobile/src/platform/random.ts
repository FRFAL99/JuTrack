import * as Crypto from 'expo-crypto';
import type { RandomSource } from '@jutrack/core';

/**
 * Sorgente casuale del dispositivo.
 *
 * `expo-crypto.getRandomBytes` è sincrona e attinge al CSPRNG di sistema.
 *
 * Nota: expo-crypto **non** installa un polyfill globale di `crypto.getRandomValues`.
 * È il motivo per cui `packages/core` riceve la sorgente per dependency injection invece
 * di leggerla da un global: su React Native quel global potrebbe non esistere, e il
 * fallimento si manifesterebbe solo a runtime, sul dispositivo.
 */
export const expoRandom: RandomSource = {
  getRandomBytes: (length) => Crypto.getRandomBytes(length),
};
