import { useEffect, useMemo, useRef } from 'react';
import { computeBalances, simplifyDebts } from '@jutrack/core';
import {
  useAppData,
  useCurrencySymbol,
  useExpenses,
  useGroups,
  useMembers,
  useMyMemberId,
  useSettlements,
  useVaultStatus,
} from '@/state';
import { publishSnapshot } from './publish';
import { balanceSnapshot } from './snapshot';

/**
 * Tiene aggiornato il foglietto dei widget. Non disegna niente **dentro** l'app.
 *
 * Sta accanto allo `Stack` come `BudgetWatcher` e `SyncWatcher`, e per la stessa ragione
 * portata un passo più in là: il widget vive **fuori** dall'app, quindi legarne
 * l'aggiornamento a una schermata vorrebbe dire che chi apre l'app per registrare una spesa
 * e la chiude — cioè l'uso normale — lascia sulla home il saldo di ieri. Da qui invece si
 * aggiorna in tutte le occasioni che contano, senza che nessuna schermata debba ricordarsene:
 * l'app aperta, una spesa registrata, una arrivata dall'altro telefono col sync, un pareggio,
 * il gruppo cambiato.
 *
 * Il piano prevedeva anche «a fine ciclo di sync»: non serve una riga apposta, perché un
 * ciclo di sync che porta qualcosa lo porta **dentro il documento**, e il documento è ciò a
 * cui questi hook sono iscritti. Un ciclo che non porta niente non ha niente da ridisegnare.
 *
 * **Il conto si rifà a ogni modifica del documento, ed è accettato.** È lo stesso calcolo che
 * fa la home (`computeBalances` su tutta la storia, che un debito non lo azzera il
 * calendario), e qui si paga anche quando la home non è aperta. Il freno non sta nel non
 * calcolare, ma nel non **scrivere**: `publishSnapshot` confronta con il disco e quasi sempre
 * non fa niente.
 */
export function WidgetPublisher() {
  const status = useVaultStatus();
  // Diviso in due come i due watcher: gli hook che leggono il vault esistono solo dove il
  // vault esiste, invece di un ramo nullable propagato in ogni riga sotto.
  //
  // Senza gruppi non si pubblica nulla, e il foglietto di prima resta: è giusto così, perché
  // «nessun gruppo aperto» qui capita anche per la frazione di secondo in cui si passa da un
  // gruppo all'altro, e azzerare il widget a ogni cambio lo farebbe lampeggiare. A ripulirlo
  // per davvero c'è `clearWidgets`, sull'azzeramento del telefono, che è l'unico caso in cui
  // il saldo di prima non deve più esistere.
  if (status.phase !== 'ready') return null;
  return <Publish vaultId={status.runtime.vaultId} />;
}

function Publish({ vaultId }: { vaultId: string }) {
  const { meta } = useAppData();
  const { groups } = useGroups();
  const symbol = useCurrencySymbol();

  const expenses = useExpenses();
  const settlements = useSettlements();
  const members = useMembers();
  const myMemberId = useMyMemberId();

  const groupName = groups.find((group) => group.vaultId === vaultId)?.name ?? 'Gruppo';

  const snapshot = useMemo(() => {
    const namesById = new Map(members.map((member) => [member.id, member.name]));
    return {
      balance: balanceSnapshot({
        groupName,
        transfers: simplifyDebts(
          computeBalances(
            expenses,
            settlements,
            members.map((member) => member.id),
          ),
        ),
        myMemberId,
        memberCount: members.length,
        // Lo stesso ripiego della card in cima alle spese: un membro mai sincronizzato dà
        // una frase incompleta, non un widget che non si disegna.
        nameOf: (id) => namesById.get(id) ?? 'qualcuno',
        symbol,
      }),
    };
  }, [groupName, expenses, settlements, members, myMemberId, symbol]);

  /**
   * I giri si mettono in fila, non in parallelo — stessa ragione dei due watcher.
   *
   * Ogni giro è un leggi-confronta-scrivi su `app_meta`: due che si accavallano — succede
   * quando il sync applica più update di seguito — leggerebbero lo stesso foglietto e
   * potrebbero disegnare in ordine invertito, lasciando sulla home il più vecchio dei due.
   */
  const chain = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;

    chain.current = chain.current
      .then(async () => {
        if (cancelled) return;
        await publishSnapshot(meta, snapshot);
      })
      .catch(() => {
        // Un widget non aggiornato non è un guasto da mostrare: l'app funziona, il saldo si
        // legge in cima alle spese, e la prossima modifica del documento riprova.
      });

    return () => {
      cancelled = true;
    };
  }, [meta, snapshot]);

  return null;
}
