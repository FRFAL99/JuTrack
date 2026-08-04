import { describe, expect, it } from 'vitest';
import type { SyncState } from '@jutrack/core';
import { describeSync, syncTone } from './describe';

const NOW = new Date('2026-08-01T12:00:00Z').getTime();

describe('describeSync', () => {
  it('descrive lo stato iniziale', () => {
    expect(describeSync({ phase: 'idle' }, NOW).text).toBe('In attesa');
  });

  it('descrive la sincronizzazione in corso', () => {
    expect(describeSync({ phase: 'syncing' }, NOW).text).toContain('Sincronizzazione');
  });

  it.each([
    [0, 'adesso'],
    [5_000, 'adesso'],
    [30_000, '30 secondi fa'],
    [60_000, '1 minuto fa'],
    [300_000, '5 minuti fa'],
    [3_600_000, '1 ora fa'],
    [7_200_000, '2 ore fa'],
  ])('formatta uno scarto di %i ms come %j', (elapsed, expected) => {
    const state: SyncState = { phase: 'synced', at: NOW - elapsed };
    expect(describeSync(state, NOW).text).toBe(`Aggiornato ${expected}`);
  });

  it('non mostra tempi negativi se l orologio va indietro', () => {
    // L'ora di sistema può essere corretta all'indietro: «fra 3 secondi» sarebbe
    // solo confondente.
    const state: SyncState = { phase: 'synced', at: NOW + 3_000 };
    expect(describeSync(state, NOW).text).toBe('Aggiornato adesso');
  });

  it('rende visibile l errore invece di nasconderlo', () => {
    // È la proprietà che conta davvero: se il sync è fermo, l'utente deve saperlo,
    // altrimenti crede che i due telefoni siano allineati quando non lo sono.
    const state: SyncState = { phase: 'error', message: 'HTTP 500', retryAt: NOW + 1000 };
    const { text, icon } = describeSync(state, NOW);
    expect(text).toContain('Non sincronizzato');
    expect(text).toContain('HTTP 500');
    expect(icon).toBe('⚠');
  });

  it('non fa credere che un accesso rifiutato si risolverà da solo', () => {
    // `error` promette implicitamente un altro tentativo. `blocked` no: la chiave non
    // apre quel vault, e nessuna attesa cambierà l'esito.
    const { text } = describeSync({ phase: 'blocked', message: 'HTTP 403' }, NOW);
    expect(text).toContain('fermata');
    expect(text).not.toContain('Sincronizzazione…');
  });

  it('segnala che le modifiche offline non sono perse', () => {
    const { text } = describeSync({ phase: 'offline' }, NOW);
    expect(text).toContain('coda');
  });
});

describe('syncTone', () => {
  it.each([
    ['error', 'warn'],
    ['offline', 'warn'],
    ['blocked', 'warn'],
    ['synced', 'ok'],
    ['idle', 'muted'],
    ['syncing', 'muted'],
  ] as const)('%s è %s', (phase, expected) => {
    expect(syncTone(phase)).toBe(expected);
  });
});
