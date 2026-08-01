/**
 * @jutrack/core
 *
 * Crypto, modello dati Yjs e sync client.
 *
 * Vincolo architetturale: questo package non importa NULLA da react-native o expo.
 * Le primitive specifiche di piattaforma (random, secure storage, database) entrano
 * per dependency injection tramite le interfacce definite qui. È la condizione che
 * rende riusabile lo stesso core su web.
 *
 * Il vincolo non è affidato alla disciplina: è imposto da una regola ESLint su
 * `packages/core/src/**` in eslint.config.mjs.
 */

export const CORE_VERSION = '0.1.0';

export * from './crypto';
export * from './model';
export * from './insights';
export * from './export';
export * from './pairing';
export * from './persistence';
export * from './sync';
