/**
 * Sostituto di `lib0/webcrypto` su React Native.
 *
 * Perché esiste. Yjs usa `lib0/random` per generare il clientID del documento, e
 * `lib0/random` importa `getRandomValues` da `lib0/webcrypto`. Su React Native
 * l'export map di lib0 punta a un file che richiede `isomorphic-webcrypto`, un
 * pacchetto **fermo al 2022**. Senza intervento il bundle non si risolve nemmeno.
 *
 * Installarlo avrebbe messo una dipendenza abbandonata da quattro anni sul percorso
 * da cui dipende l'integrità dei dati — esattamente ciò che abbiamo evitato scrivendo
 * a mano il provider di persistenza. Qui reindirizziamo invece a `expo-crypto`, che è
 * mantenuto da Expo, è già una nostra dipendenza, e attinge al CSPRNG di sistema.
 *
 * L'alias è configurato in `metro.config.js`.
 *
 * File JavaScript e non TypeScript perché Metro lo risolve prima della compilazione TS.
 */
const { getRandomValues: expoGetRandomValues } = require('expo-crypto');

/** Riempie l'array con byte casuali sicuri. Firma identica a `crypto.getRandomValues`. */
function getRandomValues(array) {
  return expoGetRandomValues(array);
}

/**
 * `SubtleCrypto` non è disponibile.
 *
 * Yjs e le parti di lib0 che usiamo non ne hanno bisogno. Se un giorno un import
 * finisse per richiederla, questo proxy solleva un errore che dice cosa fare, invece
 * di lasciare un `undefined` che esplode molto più a valle e senza indizi.
 */
const subtle = new Proxy(
  {},
  {
    get(_target, prop) {
      throw new Error(
        `lib0/webcrypto: SubtleCrypto.${String(prop)} non è disponibile su React Native. ` +
          'Lo shim in src/platform/lib0-webcrypto-shim.js fornisce solo getRandomValues. ' +
          'Se serve davvero SubtleCrypto, valutare react-native-quick-crypto.',
      );
    },
  },
);

module.exports = { getRandomValues, subtle };
