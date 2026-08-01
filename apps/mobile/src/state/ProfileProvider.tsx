import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { SqliteDatabase } from '@jutrack/core';
import { ExpoSqliteDatabase, expoRandom, SqliteAppMeta, type KeyValueStore } from '@/platform';
import { createProfile, loadProfile, saveProfile, type Profile } from './profile';

/**
 * Database e profilo, disponibili **prima** del vault.
 *
 * L'ordine non è arbitrario: il membro che rappresenta me dentro un vault è scritto con
 * il `profileId`, quindi il profilo deve esistere già quando il vault si monta. Se il
 * profilo arrivasse dopo, ci sarebbe una finestra in cui «io» non esisto — ed è
 * esattamente in quella finestra che nascevano i membri duplicati.
 *
 * Il database viene aperto qui e passato al `VaultProvider`: una sola connessione per
 * tutta l'app, invece di una per componente che ne ha bisogno.
 */
export interface AppData {
  db: SqliteDatabase;
  meta: KeyValueStore;
  /** `null` solo prima dell'onboarding: dopo, esiste per sempre. */
  profile: Profile | null;
  /** Crea il profilo al primo avvio. */
  register(name: string, color: string): Promise<void>;
  /** Rinomina o cambia colore. Il membro nel vault aperto si aggiorna da sé. */
  update(patch: { name?: string; color?: string }): Promise<void>;
}

type AppDataStatus =
  { phase: 'loading' } | { phase: 'ready'; data: AppData } | { phase: 'error'; message: string };

const AppDataContext = createContext<AppDataStatus>({ phase: 'loading' });

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [opened, setOpened] = useState<{ db: SqliteDatabase; meta: KeyValueStore } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot(): Promise<void> {
      try {
        const db = await ExpoSqliteDatabase.open();
        const meta = await SqliteAppMeta.open(db);
        const stored = await loadProfile(meta);
        if (cancelled) return;
        setProfile(stored);
        setOpened({ db, meta });
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const register = useCallback(
    async (name: string, color: string): Promise<void> => {
      if (opened === null) throw new Error('database non ancora pronto');
      const created = createProfile(name, color, expoRandom);
      await saveProfile(opened.meta, created);
      setProfile(created);
    },
    [opened],
  );

  const update = useCallback(
    async (patch: { name?: string; color?: string }): Promise<void> => {
      if (opened === null || profile === null) return;
      const next: Profile = { ...profile, ...patch };
      await saveProfile(opened.meta, next);
      setProfile(next);
    },
    [opened, profile],
  );

  const status = useMemo((): AppDataStatus => {
    if (error !== null) return { phase: 'error', message: error };
    if (opened === null) return { phase: 'loading' };
    return { phase: 'ready', data: { ...opened, profile, register, update } };
  }, [error, opened, profile, register, update]);

  return <AppDataContext.Provider value={status}>{children}</AppDataContext.Provider>;
}

export function useAppDataStatus(): AppDataStatus {
  return useContext(AppDataContext);
}

/**
 * Dati d'app garantiti pronti.
 *
 * Da usare solo sotto il gate che li attende: altrimenti solleva, invece di restituire
 * un profilo fittizio che fallirebbe più a valle scrivendo un membro senza id.
 */
export function useAppData(): AppData {
  const status = useAppDataStatus();
  if (status.phase !== 'ready') {
    throw new Error(
      `useAppData chiamato con i dati d'app in stato "${status.phase}". ` +
        'Va usato solo dentro un ramo in cui sono pronti.',
    );
  }
  return status.data;
}

/** Il profilo, garantito esistente. Valido solo dopo l'onboarding. */
export function useProfile(): Profile {
  const { profile } = useAppData();
  if (profile === null) {
    throw new Error('useProfile chiamato prima che il profilo esistesse.');
  }
  return profile;
}
