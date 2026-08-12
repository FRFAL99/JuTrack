import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { currencySymbol, DEFAULT_CURRENCY, type SqliteDatabase } from '@jutrack/core';
import {
  ExpoSqliteDatabase,
  expoKeyStore,
  expoRandom,
  SqliteAppMeta,
  type KeyValueStore,
} from '@/platform';
import { createProfile, loadProfile, saveProfile, type Profile } from './profile';
import { ensureSchema } from './schema';

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
  /** Rinomina, cambia colore o valuta. Il membro nel vault aperto si aggiorna da sé. */
  update(patch: { name?: string; color?: string; currency?: string }): Promise<void>;
  /**
   * Dimentica il profilo, e con lui tutto ciò che gli sta sotto.
   *
   * Solo lo stato in memoria: la riga su disco l'ha già cancellata `wipeDevice`, che
   * svuota `app_meta` per intero. Serve perché senza riavvio nessuno rileggerebbe quel
   * `null`, e il telefono resterebbe a mostrare un profilo che non esiste più.
   *
   * L'effetto è più largo di quanto sembri, ed è voluto: il `ProfileGate` torna
   * all'onboarding e **smonta `GroupsProvider` e `VaultProvider` con tutto il loro stato
   * in memoria**. Registrando un profilo nuovo, quei provider rimontano e trovano le
   * tabelle vuote — identico a un'installazione nuova, senza chiedere un riavvio.
   */
  forgetProfile(): void;
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
        // Prima di qualunque altra cosa: se sul telefono c'è ancora lo schema a vault
        // unico va eliminato adesso, mentre nessuno lo sta usando. Trovare quelle tabelle
        // dopo darebbe «no such column: vault_id» a ogni scrittura di sync.
        await ensureSchema(db, meta, expoKeyStore);
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
    async (patch: { name?: string; color?: string; currency?: string }): Promise<void> => {
      if (opened === null || profile === null) return;
      const next: Profile = { ...profile, ...patch };
      await saveProfile(opened.meta, next);
      setProfile(next);
    },
    [opened, profile],
  );

  const forgetProfile = useCallback((): void => {
    setProfile(null);
  }, []);

  const status = useMemo((): AppDataStatus => {
    if (error !== null) return { phase: 'error', message: error };
    if (opened === null) return { phase: 'loading' };
    return { phase: 'ready', data: { ...opened, profile, register, update, forgetProfile } };
  }, [error, forgetProfile, opened, profile, register, update]);

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

/** Il codice della valuta scelta su questo telefono. `DEFAULT_CURRENCY` finché non si sceglie. */
export function useCurrencyCode(): string {
  return useProfile().currency ?? DEFAULT_CURRENCY;
}

/**
 * Il simbolo da scrivere accanto a un numero, su questo telefono.
 *
 * È il modo in cui la scelta fatta in Tu arriva alle quaranta e passa chiamate a
 * `formatMoney` sparse nell'app. Passa dal profilo, che è già in contesto ovunque: un
 * `CurrencyProvider` a parte sarebbe un secondo contesto per un dato che sta già nel primo.
 *
 * I moduli puri (`split-text.ts`, `balance-line.ts`, `stats/format.ts`) non possono usare un
 * hook e ricevono lo stesso valore come parametro, con `'€'` come default: è ciò che tiene
 * verdi i loro test senza doverli riscrivere tutti.
 */
export function useCurrencySymbol(): string {
  return currencySymbol(useCurrencyCode());
}
