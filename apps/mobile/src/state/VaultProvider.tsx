import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import * as Y from 'yjs';
import { SqliteYPersistence, VaultStore } from '@jutrack/core';
import { ExpoSqliteDatabase, expoRandom } from '@/platform';
import { seedDefaults } from './seed';

/**
 * Vault pronto all'uso.
 *
 * Oltre allo store espone `subscribe`/`getVersion`: sono ciò che serve a
 * `useSyncExternalStore` per rendere reattive le liste. Il contatore vive qui perché
 * l'observer sul documento va registrato **una volta sola**, non a ogni render.
 */
export interface VaultRuntime {
  store: VaultStore;
  subscribe(listener: () => void): () => void;
  getVersion(): number;
}

type VaultStatus =
  | { phase: 'loading' }
  | { phase: 'ready'; runtime: VaultRuntime }
  | { phase: 'error'; message: string };

const VaultContext = createContext<VaultStatus>({ phase: 'loading' });

/**
 * Apre il database, ricostruisce il documento Yjs e lo rende disponibile all'app.
 *
 * Finché la persistenza non ha finito di caricare lo stato resta `loading`: mostrare la
 * UI prima significherebbe far comparire un vault vuoto che si riempie subito dopo.
 */
export function VaultProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<VaultStatus>({ phase: 'loading' });
  // Il documento vive per tutta la durata dell'app: tenerlo in un ref evita che un
  // re-render ne crei uno nuovo, perdendo lo stato in memoria.
  const docRef = useRef<Y.Doc | null>(null);

  useEffect(() => {
    let cancelled = false;
    let persistence: SqliteYPersistence | null = null;
    let doc: Y.Doc | null = null;
    let onUpdate: (() => void) | null = null;

    async function boot(): Promise<void> {
      try {
        doc = new Y.Doc();
        docRef.current = doc;

        const db = await ExpoSqliteDatabase.open();
        persistence = new SqliteYPersistence(db, doc);
        await persistence.load();

        if (cancelled) return;

        const store = new VaultStore(doc, { random: expoRandom });
        seedDefaults(store);

        let version = 0;
        const listeners = new Set<() => void>();

        onUpdate = () => {
          version++;
          for (const listener of listeners) listener();
        };
        doc.on('update', onUpdate);

        setStatus({
          phase: 'ready',
          runtime: {
            store,
            getVersion: () => version,
            subscribe: (listener) => {
              listeners.add(listener);
              return () => listeners.delete(listener);
            },
          },
        });
      } catch (error) {
        if (cancelled) return;
        // Un fallimento qui significa che i dati locali non sono accessibili: va
        // mostrato, non ingoiato con un vault vuoto che sembra funzionante.
        setStatus({
          phase: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    void boot();

    return () => {
      cancelled = true;
      if (doc !== null && onUpdate !== null) doc.off('update', onUpdate);
      void persistence?.destroy();
    };
  }, []);

  return <VaultContext.Provider value={status}>{children}</VaultContext.Provider>;
}

/** Stato di caricamento del vault, inclusi gli errori. */
export function useVaultStatus(): VaultStatus {
  return useContext(VaultContext);
}

/**
 * Vault garantito pronto.
 *
 * Da usare solo nel ramo dell'albero renderizzato quando lo stato è `ready`: altrimenti
 * solleva un errore, invece di restituire uno store fittizio che fallirebbe più a valle.
 */
export function useVaultRuntime(): VaultRuntime {
  const status = useVaultStatus();
  if (status.phase !== 'ready') {
    throw new Error(
      `useVaultRuntime chiamato con vault in stato "${status.phase}". ` +
        'Va usato solo dentro un ramo in cui il vault è pronto.',
    );
  }
  return status.runtime;
}

export function useVaultStore(): VaultStore {
  return useVaultRuntime().store;
}
