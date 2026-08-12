import { useEffect, useMemo, useRef } from 'react';
import { computeBalances, monthBounds, simplifyDebts } from '@jutrack/core';
import { currentMonth, formatMonthTitle } from '@/features/expenses/grouping';
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
import { balanceSnapshot, monthSnapshot } from './snapshot';

/**
 * Tiene aggiornato il foglietto dei widget. Non disegna niente **dentro** l'app.
 *
 * Sta accanto allo `Stack` come `BudgetWatcher` e `SyncWatcher`, e per la stessa ragione
 * portata un passo più in là: i widget vivono **fuori** dall'app, quindi legarne
 * l'aggiornamento a una schermata vorrebbe dire che chi apre l'app per registrare una spesa
 * e la chiude — cioè l'uso normale — lascia sulla home i numeri di ieri. Da qui invece si
 * aggiornano in tutte le occasioni che contano, senza che nessuna schermata debba
 * ricordarsene: l'app aperta, una spesa registrata, una arrivata dall'altro telefono col sync,
 * un pareggio, il gruppo cambiato.
 *
 * Il piano prevedeva anche «a fine ciclo di sync»: non serve una riga apposta, perché un
 * ciclo di sync che porta qualcosa lo porta **dentro il documento**, e il documento è ciò a
 * cui questi hook sono iscritti. Un ciclo che non porta niente non ha niente da ridisegnare.
 *
 * **Un solo posto per due widget**, e lo Step 35 non ne ha aggiunto un secondo: i due numeri
 * dipendono dallo stesso documento e cambiano nello stesso istante, quindi due componenti
 * avrebbero letto e riscritto lo stesso `app_meta` a turno, con le due letture accavallate che
 * `chain` esiste per evitare. Distinguere quale dei due è cambiato è un lavoro da fare
 * **dopo** aver calcolato entrambi, e lo fa `changedWidgets`.
 *
 * **Il conto si rifà a ogni modifica del documento, ed è accettato.** È lo stesso calcolo che
 * fa la home (`computeBalances` su tutta la storia, che un debito non lo azzera il
 * calendario, più il totale del mese in corso), e qui si paga anche quando la home non è
 * aperta. Il freno non sta nel non calcolare, ma nel non **scrivere**: `publishSnapshot`
 * confronta con il disco e quasi sempre non fa niente.
 */
export function WidgetPublisher() {
  const status = useVaultStatus();
  // Diviso in due come i due watcher: gli hook che leggono il vault esistono solo dove il
  // vault esiste, invece di un ramo nullable propagato in ogni riga sotto.
  //
  // Senza gruppi non si pubblica nulla, e il foglietto di prima resta: è giusto così, perché
  // «nessun gruppo aperto» qui capita anche per la frazione di secondo in cui si passa da un
  // gruppo all'altro, e azzerare i widget a ogni cambio li farebbe lampeggiare. A ripulirli
  // per davvero c'è `clearWidgets`, sull'azzeramento del telefono, che è l'unico caso in cui
  // i numeri di prima non devono più esistere.
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

  // Il mese in corso, con lo stesso taglio della card in cima alle spese: due posti che
  // mostrano lo stesso totale devono contare le stesse spese. `currentMonth()` si rilegge a
  // ogni render — come in `BudgetWatcher` — quindi il primo del mese il numero riparte alla
  // prima occasione in cui l'app ridisegna, e fino ad allora la didascalia dice comunque di
  // che mese parla.
  const month = currentMonth();
  const bounds = useMemo(() => monthBounds(month), [month]);
  const monthExpenses = useExpenses({ from: bounds.from, to: bounds.to });

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
      month: monthSnapshot({
        groupName,
        // Il totale del **gruppo**, non la mia quota: è il numero grande della card in cima
        // alle spese, e non può essere due numeri diversi in due posti.
        totalCents: monthExpenses.reduce((sum, expense) => sum + expense.amountCents, 0),
        monthTitle: formatMonthTitle(month),
        symbol,
      }),
    };
  }, [groupName, expenses, settlements, members, myMemberId, symbol, monthExpenses, month]);

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
