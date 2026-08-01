import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';
import * as Y from 'yjs';
import {
  RelayClient,
  SqliteYPersistence,
  SyncEngine,
  VaultStore,
  type SyncState,
  type VaultKeys,
} from '@jutrack/core';
import { RELAY_URL } from '@/config';
import { expoHttp, expoKeyStore, expoRandom, SqliteSyncStore } from '@/platform';
import { loadMyMemberId, loadVaultOrigin } from './profile';
import { useAppData, useProfile } from './ProfileProvider';
import { seedDefaults } from './seed';
import { loadVaultKeys } from './vault-key';

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
  /** `null` finché non esiste un vault: l'app funziona comunque, solo in locale. */
  keys: VaultKeys | null;
  /** `null` se il sync non è attivo. */
  engine: SyncEngine | null;
  /**
   * Il membro che rappresenta **me** in questo vault.
   *
   * Di norma coincide col `profileId`. È lui il `paidBy` predefinito di una spesa nuova,
   * ed è la ragione per cui i due telefoni non contano più due persone al posto di una.
   */
  myMemberId: string;
}

type VaultStatus =
  | { phase: 'loading' }
  | { phase: 'ready'; runtime: VaultRuntime }
  | { phase: 'error'; message: string };

const VaultContext = createContext<VaultStatus>({ phase: 'loading' });
const SyncContext = createContext<SyncState>({ phase: 'idle' });

/**
 * Apre il database, ricostruisce il documento Yjs e, se esiste una chiave, avvia il sync.
 *
 * Finché la persistenza non ha finito di caricare lo stato resta `loading`: mostrare la
 * UI prima significherebbe far comparire un vault vuoto che si riempie subito dopo.
 */
export function VaultProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<VaultStatus>({ phase: 'loading' });
  const [syncState, setSyncState] = useState<SyncState>({ phase: 'idle' });
  const { db, meta } = useAppData();
  const profile = useProfile();
  const { profileId, name, color } = profile;
  // Il documento vive per tutta la durata dell'app: tenerlo in un ref evita che un
  // re-render ne crei uno nuovo, perdendo lo stato in memoria.
  const docRef = useRef<Y.Doc | null>(null);

  useEffect(() => {
    let cancelled = false;
    let persistence: SqliteYPersistence | null = null;
    let engine: SyncEngine | null = null;
    let doc: Y.Doc | null = null;
    let onUpdate: (() => void) | null = null;
    let appStateSub: { remove: () => void } | null = null;

    async function boot(): Promise<void> {
      try {
        doc = new Y.Doc();
        docRef.current = doc;

        persistence = new SqliteYPersistence(db, doc);
        await persistence.load();

        if (cancelled) return;

        // Il sync parte solo se esiste una chiave. Senza, l'app resta un tracker
        // locale perfettamente funzionante: è uno stato legittimo, non un errore.
        const keys = await loadVaultKeys(expoKeyStore);
        if (cancelled) return;

        // Chi è entrato nel vault di qualcun altro non semina le categorie: le riceve
        // col primo sync, e seminarle vorrebbe dire ritrovarsene sedici invece di otto.
        const origin = keys === null ? null : await loadVaultOrigin(meta, keys.vaultId);
        const myMemberId =
          keys === null ? profileId : await loadMyMemberId(meta, keys.vaultId, profileId);
        if (cancelled) return;

        const store = new VaultStore(doc, { random: expoRandom });
        seedDefaults(store, { seedCategories: origin !== 'joined' });

        let version = 0;
        const listeners = new Set<() => void>();
        onUpdate = () => {
          version++;
          for (const listener of listeners) listener();
        };
        doc.on('update', onUpdate);

        if (keys !== null && !cancelled) {
          const syncStore = await SqliteSyncStore.open(db);
          const client = new RelayClient(RELAY_URL, keys, expoHttp, expoRandom);
          engine = new SyncEngine(doc, client, syncStore);
          engine.subscribe((state) => {
            if (!cancelled) setSyncState(state);
          });
          await engine.start();
          // Senza await: il ciclo continua per tutta la vita dell'app e non deve
          // bloccare la comparsa dell'interfaccia.
          void engine.runForever();

          // In background il sistema può congelare i timer: il ciclo resterebbe fermo
          // e, al ritorno, ancora addormentato per tutto il backoff maturato. `resume`
          // lo azzera e fa subito un giro, così riaprendo l'app si vede l'aggiornamento
          // invece di aspettarlo.
          //
          // Solo `background`: su iOS `inactive` è uno stato di passaggio (notifiche,
          // commutatore di app) e sospendere lì darebbe pause continue.
          const currentEngine = engine;
          appStateSub = AppState.addEventListener('change', (next) => {
            if (next === 'active') currentEngine.resume();
            else if (next === 'background') currentEngine.pause();
          });
        }

        if (cancelled) return;

        setStatus({
          phase: 'ready',
          runtime: {
            store,
            keys,
            engine,
            myMemberId,
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
      appStateSub?.remove();
      engine?.stop();
      if (doc !== null && onUpdate !== null) doc.off('update', onUpdate);
      void persistence?.destroy();
    };
    // `profileId` e non l'intero profilo: rinominarsi non deve smontare e rimontare
    // motore e persistenza. Il nome è gestito dall'effetto sotto.
  }, [db, meta, profileId]);

  // Il membro che sono io nasce qui, con il `profileId` come id — non con un id casuale
  // generato a ogni installazione. Scritto solo se manca o se è cambiato: rieseguirlo a
  // ogni avvio non duplica nulla, e un cambio di nome raggiunge l'altro telefono da sé.
  useEffect(() => {
    if (status.phase !== 'ready') return;
    const { store, myMemberId } = status.runtime;
    const current = store.getMember(myMemberId);
    if (current !== null && current.name === name && current.color === color) return;
    store.setMember(myMemberId, { name, color });
  }, [status, name, color]);

  return (
    <VaultContext.Provider value={status}>
      <SyncContext.Provider value={syncState}>{children}</SyncContext.Provider>
    </VaultContext.Provider>
  );
}

/** Stato di caricamento del vault, inclusi gli errori. */
export function useVaultStatus(): VaultStatus {
  return useContext(VaultContext);
}

/** Stato corrente della sincronizzazione. */
export function useSyncState(): SyncState {
  return useContext(SyncContext);
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
