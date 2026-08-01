/**
 * @jutrack/core
 *
 * Crypto, modello dati Yjs e sync client.
 *
 * Vincolo architetturale: questo package non importa NULLA da react-native o expo.
 * Le primitive specifiche di piattaforma (random, secure storage, database) entrano
 * per dependency injection tramite le interfacce definite qui. È la condizione che
 * rende riusabile lo stesso core su web.
 */

export const CORE_VERSION = '0.1.0';
