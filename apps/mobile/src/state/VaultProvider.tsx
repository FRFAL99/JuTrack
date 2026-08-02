import { createContext, useCallback, useContext, useEffect, useState } from 'react';
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
import { expoHttp, expoRandom, SqliteSyncStore } from '@/platform';
import { useGroups } from './GroupsProvider';
import { updatesTableName } from './groups';
import { useAppData, useProfile } from './ProfileProvider';
import { seedDefaults } from './seed';

/**
 * Il gruppo aperto, pronto all'uso.
 *
 * Oltre allo store espone `subscribe`/`getVersion`: sono ciò che serve a
 * `useSyncExternalStore` per rendere reattive le liste. Il contatore vive qui perché
 * l'observer sul documento va registrato **una volta sola**, non a ogni render.
 */
export interface VaultRuntime {
  vaultId: string;
  store: VaultStore;
  subscribe(listener: () => void): () => void;
  getVersion(): number;
  keys: VaultKeys;
  engine: SyncEngine;
  /**
   * Il membro che rappresenta **me** in questo gruppo, o `null` se non è ancora deciso.
   *
   * Di norma è il `profileId`. È lui il `paidBy` predefinito di una spesa nuova, ed è la
   * ragione per cui i due telefoni non contano più due persone al posto di una.
   *
   * `null` capita in un caso solo: si è appena entrati in un gruppo altrui e non si sa
   * ancora se si è una persona nuova o qualcuno che c'era già con un altro telefono —
   * vedi `identity`. Finché è `null` **non viene scritto alcun membro**, perché scriverne
   * uno e poi ricollegarsi a un altro lascerebbe lì il primo: i membri non hanno
   * tombstone, e nessuno saprebbe più toglierlo.
   */
  myMemberId: string | null;
}

/**
 * Chi sono io in questo gruppo, quando la risposta non è ovvia.
 *
 * `resolved` è il caso normale. `pending` è chi è appena entrato in un gruppo altrui:
 * potrebbe essere una persona nuova, oppure la stessa persona che era già dentro da un
 * altro telefono e ha appena ripristinato il backup della chiave. Scegliere per lei
 * significherebbe, nel secondo caso, farla comparire due volte e sbagliare il saldo — che
 * è esattamente il bug corretto allo Step 11.
 */
export type GroupIdentity =
  | { status: 'resolved'; memberId: string }
  | { status: 'pending'; choose: (memberId: string) => Promise<void> };

type VaultStatus =
  | { phase: 'loading' }
  | { phase: 'ready'; runtime: VaultRuntime }
  | { phase: 'error'; message: string };

const VaultContext = createContext<VaultStatus>({ phase: 'loading' });
const SyncContext = createContext<SyncState>({ phase: 'idle' });
const IdentityContext = createContext<GroupIdentity | null>(null);

/**
 * Monta il documento, la persistenza e il motore di sync **del gruppo corrente**.
 *
 * L'effetto dipende da `vaultId`: cambiare gruppo smonta engine e persistenza e ne monta
 * altri, invece di richiedere il riavvio dell'app. È lo stesso meccanismo che fa sparire
 * il «riavvia l'app» dopo il pairing e dopo la creazione di un gruppo — il motore non è
 * più costruito una volta per vita del processo con le chiavi di quel momento.
 *
 * Un solo motore attivo per volta, quello del gruppo aperto. Gli altri si allineano con
 * un ciclo immediato quando li si apre: due motori in parallelo raddoppierebbero le
 * richieste al relay per un gruppo che nessuno sta guardando.
 */
export function VaultProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<VaultStatus>({ phase: 'loading' });
  const [syncState, setSyncState] = useState<SyncState>({ phase: 'idle' });
  const { db } = useAppData();
  const { registry, current, rename, setMyMemberId } = useGroups();
  const { profileId, name, color } = useProfile();
  const { vaultId, origin, myMemberId: linkedMemberId } = current;

  useEffect(() => {
    let cancelled = false;
    let persistence: SqliteYPersistence | null = null;
    let engine: SyncEngine | null = null;
    let doc: Y.Doc | null = null;
    let onUpdate: (() => void) | null = null;
    let appStateSub: { remove: () => void } | null = null;

    async function boot(): Promise<void> {
      try {
        setStatus({ phase: 'loading' });
        setSyncState({ phase: 'idle' });

        const keys = await registry.keys(vaultId);
        if (keys === null) {
          throw new Error(
            'La chiave di questo gruppo non è leggibile su questo telefono. ' +
              'Senza, i dati non sono decifrabili: serve ripristinarla dal backup.',
          );
        }
        if (cancelled) return;

        doc = new Y.Doc();
        // Una tabella per gruppo: `SqliteYPersistence` accetta `tableName` proprio per
        // tenere più documenti nello stesso database.
        persistence = new SqliteYPersistence(db, doc, { tableName: updatesTableName(vaultId) });
        await persistence.load();
        if (cancelled) return;

        const store = new VaultStore(doc, { random: expoRandom });

        // Chi è entrato nel gruppo di qualcun altro non semina le categorie: le riceve
        // col primo sync, e seminarle vorrebbe dire ritrovarsene sedici invece di otto.
        seedDefaults(store, { seedCategories: origin !== 'joined' });

        let version = 0;
        const listeners = new Set<() => void>();
        onUpdate = () => {
          version++;
          for (const listener of listeners) listener();
        };
        doc.on('update', onUpdate);

        const syncStore = await SqliteSyncStore.open(db, vaultId);
        const client = new RelayClient(RELAY_URL, keys, expoHttp, expoRandom);
        engine = new SyncEngine(doc, client, syncStore);
        engine.subscribe((state) => {
          if (!cancelled) setSyncState(state);
        });
        await engine.start();
        // Senza await: il ciclo continua finché il gruppo resta aperto e non deve
        // bloccare la comparsa dell'interfaccia.
        void engine.runForever();

        // In background il sistema può congelare i timer: il ciclo resterebbe fermo e, al
        // ritorno, ancora addormentato per tutto il backoff maturato. `resume` lo azzera e
        // fa subito un giro, così riaprendo l'app si vede l'aggiornamento invece di
        // aspettarlo.
        //
        // Solo `background`: su iOS `inactive` è uno stato di passaggio (notifiche,
        // commutatore di app) e sospendere lì darebbe pause continue.
        const currentEngine = engine;
        appStateSub = AppState.addEventListener('change', (next) => {
          if (next === 'active') currentEngine.resume();
          else if (next === 'background') currentEngine.pause();
        });

        if (cancelled) return;

        setStatus({
          phase: 'ready',
          runtime: {
            vaultId,
            store,
            keys,
            engine,
            myMemberId: resolveMyMemberId({ store, origin, linkedMemberId, profileId }),
            getVersion: () => version,
            subscribe: (listener) => {
              listeners.add(listener);
              return () => listeners.delete(listener);
            },
          },
        });
      } catch (error) {
        if (cancelled) return;
        // Un fallimento qui significa che i dati di questo gruppo non sono accessibili:
        // va mostrato, non ingoiato con un vault vuoto che sembra funzionante.
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
  }, [db, registry, vaultId, origin, linkedMemberId, profileId]);

  // Il membro che sono io nasce qui, con il `profileId` come id — non con un id casuale
  // generato a ogni installazione. Scritto solo se manca o se è cambiato: rieseguirlo a
  // ogni avvio non duplica nulla, e un cambio di nome raggiunge l'altro telefono da sé.
  useEffect(() => {
    if (status.phase !== 'ready') return;
    const { store, myMemberId } = status.runtime;
    if (myMemberId === null) return;
    const current = store.getMember(myMemberId);
    if (current !== null && current.name === name && current.color === color) return;
    store.setMember(myMemberId, { name, color });
  }, [status, name, color]);

  // Il nome del gruppo è autorevole **dentro** il vault: se la copia nel registro è
  // rimasta indietro — l'ha rinominato l'altro telefono — è la copia ad aggiornarsi. Al
  // primo avvio di un gruppo creato qui il documento non ha ancora un nome, e allora è il
  // registro a scriverlo dentro.
  //
  // Iscritto al documento e non eseguito una volta sola al montaggio: una rinomina fatta
  // dall'altro telefono arriva col sync, e senza iscrizione il nome nell'intestazione
  // resterebbe quello vecchio fino al prossimo cambio di gruppo.
  useEffect(() => {
    if (status.phase !== 'ready') return;
    const { store, subscribe } = status.runtime;

    const align = (): void => {
      const inVault = store.getGroupName();
      if (inVault === null) {
        store.setGroupName(current.name);
        return;
      }
      if (inVault !== current.name) void rename(current.vaultId, inVault);
    };

    align();
    return subscribe(align);
  }, [status, current.name, current.vaultId, rename]);

  const choose = useCallback(
    async (memberId: string): Promise<void> => {
      await setMyMemberId(vaultId, memberId);
    },
    [setMyMemberId, vaultId],
  );

  const identity: GroupIdentity | null =
    status.phase !== 'ready'
      ? null
      : status.runtime.myMemberId === null
        ? { status: 'pending', choose }
        : { status: 'resolved', memberId: status.runtime.myMemberId };

  return (
    <VaultContext.Provider value={status}>
      <SyncContext.Provider value={syncState}>
        <IdentityContext.Provider value={identity}>{children}</IdentityContext.Provider>
      </SyncContext.Provider>
    </VaultContext.Provider>
  );
}

/**
 * Chi sono io in questo gruppo, deciso al momento del montaggio.
 *
 * - Un ricollegamento già registrato vince su tutto: è una risposta che l'utente ha dato.
 * - In un gruppo **creato qui** sono per definizione una persona nuova.
 * - In un gruppo in cui sono **entrato**, se il mio `profileId` è già fra i membri la
 *   domanda è già stata risposta da un avvio precedente.
 * - Altrimenti resta aperta: potrei essere nuovo, oppure essere già dentro con un altro
 *   nome perché ho ripristinato il backup della chiave su un telefono nuovo. Scegliere da
 *   soli qui è ciò che, allo Step 11, produceva due membri e un saldo sbagliato.
 */
function resolveMyMemberId({
  store,
  origin,
  linkedMemberId,
  profileId,
}: {
  store: VaultStore;
  origin: 'created' | 'joined';
  linkedMemberId: string | null;
  profileId: string;
}): string | null {
  if (linkedMemberId !== null) return linkedMemberId;
  if (origin === 'created') return profileId;
  if (store.getMember(profileId) !== null) return profileId;
  return null;
}

/** Stato di caricamento del gruppo aperto, inclusi gli errori. */
export function useVaultStatus(): VaultStatus {
  return useContext(VaultContext);
}

/** Stato corrente della sincronizzazione. */
export function useSyncState(): SyncState {
  return useContext(SyncContext);
}

/** `null` finché il gruppo non è pronto. */
export function useGroupIdentity(): GroupIdentity | null {
  return useContext(IdentityContext);
}

/**
 * Gruppo garantito pronto.
 *
 * Da usare solo nel ramo dell'albero renderizzato quando lo stato è `ready`: altrimenti
 * solleva un errore, invece di restituire uno store fittizio che fallirebbe più a valle.
 */
export function useVaultRuntime(): VaultRuntime {
  const status = useVaultStatus();
  if (status.phase !== 'ready') {
    throw new Error(
      `useVaultRuntime chiamato con il gruppo in stato "${status.phase}". ` +
        'Va usato solo dentro un ramo in cui il gruppo è pronto.',
    );
  }
  return status.runtime;
}

export function useVaultStore(): VaultStore {
  return useVaultRuntime().store;
}

/**
 * Il mio membro nel gruppo aperto, garantito deciso.
 *
 * Sotto il gate che risolve l'identità non è mai `null`, e le schermate che ci scrivono
 * sopra una spesa non devono portarsi dietro un ramo per un caso che lì non esiste.
 */
export function useMyMemberId(): string {
  const { myMemberId } = useVaultRuntime();
  if (myMemberId === null) {
    throw new Error(
      'useMyMemberId chiamato prima che fosse deciso chi sono io in questo gruppo. ' +
        'Va usato solo sotto il gate che pone la domanda.',
    );
  }
  return myMemberId;
}
