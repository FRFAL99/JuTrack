import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { RELAY_URL } from '@/config';
import { expoHttp, expoKeyStore, expoRandom } from '@/platform';
import { chooseCurrentGroup, CURRENT_GROUP_KEY, nextAfterLeave } from './current-group';
import { useAppData } from './ProfileProvider';
import { GroupRegistry, httpRelayGateway, normalizeGroupName, type GroupRecord } from './groups';

/**
 * I gruppi di questo telefono, e quale è aperto adesso.
 *
 * Sta fra il profilo e il vault: il profilo deve esistere prima (il membro nasce da lì),
 * e il runtime del vault sotto si monta sul gruppo che questo provider dichiara corrente.
 *
 * **Può non esserci alcun gruppo** (Step 21): al primo avvio l'elenco è vuoto, e uscire
 * dall'ultimo gruppo non ne fa più nascere uno al suo posto. Le due ragioni, in ordine:
 *
 * - **Lo Step 12 creava un primo gruppo d'ufficio** per far sparire da tutta l'app lo
 *   stato «non c'è ancora un vault», che era un ramo condizionale in mezza dozzina di
 *   schermate. Costava 32 byte casuali e nessuna richiesta di rete.
 * - **Lo Step 21 lo rimette**, ma in **un punto solo**: chi apre l'app per la prima volta
 *   si trovava dentro un gruppo che non aveva chiesto, chiamato «Le mie spese», e non
 *   capiva se fosse quello condiviso o no; e chi usciva dall'ultimo gruppo si ritrovava
 *   dentro un gruppo vuoto nuovo, che sembrava il suo svuotato. Il ramo condizionale ora
 *   vive in `app/(gruppo)/_layout.tsx` (Step 19) e in tre stati vuoti dichiarati, non
 *   sparso per le schermate.
 */
export interface GroupsData {
  registry: GroupRegistry;
  /** Dall'ultimo aperto. Vuoto al primo avvio e dopo essere usciti dall'ultimo gruppo. */
  groups: GroupRecord[];
  /** `null` quando non ne esiste nessuno: è l'unico caso, e vale solo quando `groups` è vuoto. */
  current: GroupRecord | null;
  /** Crea un gruppo nuovo e lo apre. */
  create(name: string): Promise<GroupRecord>;
  /** Entra in un gruppo esistente e lo apre. Se c'è già, lo apre e basta. */
  join(key: Uint8Array, name: string): Promise<GroupRecord>;
  /** Apre un gruppo che c'è già: smonta il runtime corrente e ne monta un altro. */
  select(vaultId: string): Promise<void>;
  /**
   * Chiude il gruppo aperto senza uscirne: resta in elenco, semplicemente non è più
   * corrente.
   *
   * Esiste per l'azzeramento. Cancellare le tabelle di un gruppo mentre il suo motore
   * gira significa che un ciclo in volo può riscrivere ciò che si è appena eliminato — un
   * update scaricato applicato su una `y_updates_<id>` che non c'è più, o una coda
   * ricreata dopo la spazzata. Chiudendolo, il `VaultProvider` smonta motore e
   * persistenza e passa a `absent`: è quel passaggio che `useWipeDevice` attende.
   */
  closeCurrent(): Promise<void>;
  /** Aggiorna la copia locale del nome. Quello dentro il vault lo scrive il runtime. */
  rename(vaultId: string, name: string): Promise<void>;
  /** Registra a quale membro ci si è ricollegati in questo gruppo. */
  setMyMemberId(vaultId: string, memberId: string): Promise<void>;
  /**
   * Esce da un gruppo. Se era il corrente, ne apre un altro — o nessuno, se era l'ultimo.
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
        const list = await opened.list();
        const stored = await meta.get(CURRENT_GROUP_KEY);
        // Con la lista piena si comporta come ha sempre fatto, `stored` assente compreso:
        // è ciò che protegge chi ha già dei gruppi con dentro delle spese. Risponde `null`
        // in un caso solo, quello nuovo — nessun gruppo.
        const chosen = chooseCurrentGroup(list, stored);
        if (cancelled) return;

        if (chosen !== null) {
          await opened.touch(chosen);
          await meta.set(CURRENT_GROUP_KEY, chosen);
        }

        setRegistry(opened);
        setGroups(await opened.list());
        setCurrentId(chosen);
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

  const closeCurrent = useCallback(async (): Promise<void> => {
    // Anche il ricordo su disco, non solo lo stato in memoria: `wipeDevice` cancella
    // `app_meta` per intero, e lasciarlo qui vorrebbe dire riscriverlo un istante prima
    // che venga eliminato — cioè far dipendere l'esito da chi arriva primo.
    await meta.delete(CURRENT_GROUP_KEY);
    setCurrentId(null);
  }, [meta]);

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
      const next = nextAfterLeave(list, vaultId);
      // Uscendo dall'ultimo gruppo si resta **senza**, invece di ritrovarsi dentro uno
      // nuovo e vuoto che sembrava il proprio appena svuotato. Il ricordo va cancellato,
      // non lasciato a puntare a un vault che non esiste più.
      if (next === null) {
        await meta.delete(CURRENT_GROUP_KEY);
        setCurrentId(null);
        return;
      }
      await select(next);
    },
    [meta, refresh, registry, select],
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
    if (registry === null) return { phase: 'loading' };
    // `currentId === null` non è più un'attesa: è lo stato «nessun gruppo». Resta invece
    // un'attesa il caso in cui l'id ci sia ma la riga non sia ancora stata riletta — è la
    // finestra fra `setCurrentId` e `setGroups` durante un cambio di gruppo.
    const current =
      currentId === null ? null : (groups.find((g) => g.vaultId === currentId) ?? null);
    if (currentId !== null && current === null) return { phase: 'loading' };
    return {
      phase: 'ready',
      data: {
        registry,
        groups,
        current,
        create,
        join,
        select,
        closeCurrent,
        rename,
        setMyMemberId,
        leave,
        regenerate,
      },
    };
  }, [
    closeCurrent,
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

/**
 * Il gruppo aperto adesso, o `null` se non ce n'è nessuno.
 *
 * Nullabile e senza un gemello che solleva: due hook quasi uguali diventerebbero il posto
 * in cui qualcuno usa quello sbagliato, e lo userebbe proprio nella schermata che deve
 * funzionare senza gruppi. Cambiare questa firma è ciò che ha fatto trovare al
 * compilatore tutti i chiamanti da sistemare.
 */
export function useCurrentGroup(): GroupRecord | null {
  return useGroups().current;
}
