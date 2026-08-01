import { randomBytes } from '@noble/ciphers/utils.js';
import type { RandomSource } from './types';

/** RandomSource reale per i test, appoggiata al CSPRNG di Node. */
export const testRandom: RandomSource = {
  getRandomBytes: (length) => randomBytes(length),
};

/**
 * RandomSource deterministica: restituisce byte prevedibili.
 *
 * Serve a rendere riproducibili i test che dipendono da nonce e salt.
 * **Da non usare mai fuori dai test.**
 */
export function fixedRandom(fill = 0x42): RandomSource {
  let counter = fill;
  return {
    getRandomBytes: (length) => {
      // Contatore incrementale invece di un valore costante: due chiamate consecutive
      // devono restituire byte diversi, altrimenti un test potrebbe passare pur
      // riutilizzando lo stesso nonce.
      const out = new Uint8Array(length);
      for (let i = 0; i < length; i++) out[i] = (counter + i) & 0xff;
      counter = (counter + 1) & 0xff;
      return out;
    },
  };
}

/** RandomSource difettosa che restituisce meno byte del richiesto. */
export const shortRandom: RandomSource = {
  getRandomBytes: (length) => new Uint8Array(Math.max(0, length - 1)),
};
