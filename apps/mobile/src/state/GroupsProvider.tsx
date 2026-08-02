import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { RELAY_URL } from '@/config';
import { expoHttp, expoKeyStore, expoRandom } from '@/platform';
import { useAppData } from './ProfileProvider';
import {
  FIRST_GROUP_NAME,
  GroupRegistry,
  httpRelayGateway,
  normalizeGroupName,
  type GroupRecord,
} from './groups';

/**
 * I gruppi di questo telefono, e quale è aperto adesso.
 *
 * Sta fra il profilo e il vault: il profilo deve esistere prima (il membro nasce da lì),
 * e il runtime del vault sotto si monta sul gruppo che questo provider dichiara corrente.
 *
 * **C'è sempre almeno un gruppo.** Se l'elenco è vuoto — cioè al primissimo avvio, subito
 * dopo l'onboarding — ne viene creato uno. Costa 32 byte casuali e nessuna richiesta di
 * rete: il relay scopre il vault alla prima scrittura. In cambio sparisce da tutta l'app
 * lo stato «non c'è ancora un vault», che era un ramo condizionale in mezza dozzina di
 * schermate e un'intera categoria di stati intermedi da gestire.
 */
export interface GroupsData {
  registry: GroupRegistry;
  /** Dall'ultimo aperto. Mai vuoto. */
  groups: GroupRecord[];
  current: GroupRecord;
  /** Crea un gruppo nuovo e lo apre. */
  create(name: string): Promise<GroupRecord>;
  /** Entra in un gruppo esistente e lo apre. Se c'è già, lo apre e basta. */
  join(key: Uint8Array, name: string): Promise<GroupRecord>;
  /** Apre un gruppo che c'è già: smonta il runtime corrente e ne monta un altro. */
  select(vaultId: string): Promise<void>;
  /** Aggiorna la copia locale del nome. Quello dentro il vault lo scrive il runtime. */
  rename(vaultId: string, name: string): Promise<void>;
  /** Registra a quale membro ci si è ricollegati in questo gruppo. */
  setMyMemberId(vaultId: string, memberId: string): Promise<void>;
  /**
   * Esce da un gruppo. Se era il corrente, ne apre un altro.
   *
   * Con `wipeRelay` cancella anche la copia sul relay — che non toglie nulla a chi ha
   * già la chiave, e infatti non è una revoca: per quella serve `regenerate`.
   */
  leave(vaultId: string, options?: { wipeRelay?: boolean }): Promise<void>;
  /**
   * Sposta il gruppo su una chiave nuova, portandosi dietro la storia, e lascia quello
   * vecchio. È l'unico modo di escludere qualcuno; chi resta va reinvitato.
   */
  regenerate(
    vaultId: string,
    state: Uint8Array,
    options?: { wipeRelay?: boolean },
  ): Promise<GroupRecord>;
}

type GroupsStatus =
  { phase: 'loading' } | { phase: 'ready'; data: GroupsData } | { phase: 'error'; message: string };

const CURRENT_GROUP_KEY = 'current_group';

const GroupsContext = createContext<GroupsStatus>({ phase: 'loading' });

export function GroupsProvider({ children }: { children: ReactNode }) {
  const { db, meta } = useAppData();
  const [registry, setRegistry] = useState<GroupRegistry | null>(null);
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot(): Promise<void> {
      try {
        const opened = await GroupRegistry.open({
          db,
          keyStore: expoKeyStore,
          random: expoRandom,
          relay: httpRelayGateway(RELAY_URL, expoHttp, expoRandom),
        });
        let list = await opened.list();

        // Il primo gruppo nasce da solo. Chiederlo nell'onboarding significherebbe far
        // rispondere «come si chiama il gruppo?» a chi non ha ancora visto l'app: il nome
        // si cambia in due tocchi, e nel frattempo si è già dentro.
        if (list.length === 0) {
          await opened.create(FIRST_GROUP_NAME);
          list = await opened.list();
        }

        const stored = await meta.get(CURRENT_GROUP_KEY);
        // Se il gruppo ricordato non c'è più — è stato abbandonato, o il database è stato
        // azzerato dalla ripartenza pulita — si apre il primo della lista invece di
        // restare senza gruppo corrente.
        const chosen = list.find((g) => g.vaultId === stored) ?? list[0];
        if (cancelled || chosen === undefined) return;

        await opened.touch(chosen.vaultId);
        await meta.set(CURRENT_GROUP_KEY, chosen.vaultId);

        setRegistry(opened);
        setGroups(await opened.list());
        setCurrentId(chosen.vaultId);
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [db, meta]);

  const refresh = useCallback(async (): Promise<GroupRecord[]> => {
    if (registry === null) return [];
    const list = await registry.list();
    setGroups(list);
    return list;
  }, [registry]);

  const select = useCallback(
    async (vaultId: string): Promise<void> => {
      if (registry === null) return;
      // Un gruppo che non c'è più non si apre. Capita quando si è appena usciti o si è
      // appena rigenerato: la schermata del gruppo vede il corrente cambiare sotto di sé
      // e chiede di tornare a quello della propria rotta, che nel frattempo è sparito.
      // Senza questo controllo il gruppo corrente diventerebbe un id senza riga, e
      // l'intera app resterebbe sul caricamento fino al riavvio.
      if ((await registry.get(vaultId)) === null) return;
      await registry.touch(vaultId);
      await meta.set(CURRENT_GROUP_KEY, vaultId);
      setCurrentId(vaultId);
      await refresh();
    },
    [meta, refresh, registry],
  );

  const create = useCallback(
    async (name: string): Promise<GroupRecord> => {
      if (registry === null) throw new Error('registro dei gruppi non ancora pronto');
      const normalized = normalizeGroupName(name);
      if (normalized === null) throw new Error('il nome del gruppo non può essere vuoto');
      const group = await registry.create(normalized);
      await select(group.vaultId);
      return group;
    },
    [registry, select],
  );

  const join = useCallback(
    async (key: Uint8Array, name: string): Promise<GroupRecord> => {
      if (registry === null) throw new Error('registro dei gruppi non ancora pronto');
      const group = await registry.join(key, normalizeGroupName(name) ?? 'Gruppo condiviso');
      await select(group.vaultId);
      return group;
    },
    [registry, select],
  );

  const rename = useCallback(
    async (vaultId: string, name: string): Promise<void> => {
      if (registry === null) return;
      await registry.rename(vaultId, name);
      await refresh();
    },
    [refresh, registry],
  );

  const setMyMemberId = useCallback(
    async (vaultId: string, memberId: string): Promise<void> => {
      if (registry === null) return;
      await registry.setMyMemberId(vaultId, memberId);
      await refresh();
    },
    [refresh, registry],
  );

  const leave = useCallback(
    async (vaultId: string, { wipeRelay = false } = {}): Promise<void> => {
      if (registry === null) return;
      await registry.forget(vaultId, { wipeRelay });
      const list = await refresh();
      // Non si resta mai senza gruppo: se si è appena usciti dall'ultimo, se ne crea uno
      // nuovo e vuoto, esattamente come al primo avvio.
      const next = list[0] ?? (await registry.create(FIRST_GROUP_NAME));
      await refresh();
      await select(next.vaultId);
    },
    [refresh, registry, select],
  );

  const regenerate = useCallback(
    async (
      vaultId: string,
      state: Uint8Array,
      { wipeRelay = false } = {},
    ): Promise<GroupRecord> => {
      if (registry === null) throw new Error('registro dei gruppi non ancora pronto');
      // Il gruppo nuovo per primo, e con i dati già dentro. All'inverso, un'interruzione
      // fra le due lascerebbe questo telefono senza né il vecchio né il nuovo.
      const fresh = await registry.regenerate(vaultId, state);
      await refresh();
      await select(fresh.vaultId);
      // Solo ora si esce dal vecchio: il runtime si è già spostato altrove, quindi non
      // c'è più un motore che scrive sulle tabelle che stiamo per eliminare.
      await registry.forget(vaultId, { wipeRelay });
      await refresh();
      return fresh;
    },
    [refresh, registry, select],
  );

  const status = useMemo((): GroupsStatus => {
    if (error !== null) return { phase: 'error', message: error };
    if (registry === null || currentId === null) return { phase: 'loading' };
    const current = groups.find((g) => g.vaultId === currentId);
    if (current === undefined) return { phase: 'loading' };
    return {
      phase: 'ready',
      data: {
        registry,
        groups,
        current,
        create,
        join,
        select,
        rename,
        setMyMemberId,
        leave,
        regenerate,
      },
    };
  }, [
    create,
    currentId,
    error,
    groups,
    join,
    leave,
    regenerate,
    registry,
    rename,
    select,
    setMyMemberId,
  ]);

  return <GroupsContext.Provider value={status}>{children}</GroupsContext.Provider>;
}

export function useGroupsStatus(): GroupsStatus {
  return useContext(GroupsContext);
}

/**
 * I gruppi, garantiti pronti.
 *
 * Da usare solo sotto il gate che li attende: altrimenti solleva, invece di restituire un
 * gruppo fittizio che fallirebbe più a valle aprendo un vault che non esiste.
 */
export function useGroups(): GroupsData {
  const status = useGroupsStatus();
  if (status.phase !== 'ready') {
    throw new Error(
      `useGroups chiamato con i gruppi in stato "${status.phase}". ` +
        'Va usato solo dentro un ramo in cui sono pronti.',
    );
  }
  return status.data;
}

/** Il gruppo aperto adesso. */
export function useCurrentGroup(): GroupRecord {
  return useGroups().current;
}
