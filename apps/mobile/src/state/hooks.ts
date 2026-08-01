import { useMemo, useSyncExternalStore } from 'react';
import type { Category, Expense, ExpenseFilter, Member } from '@jutrack/core';
import { useVaultRuntime } from './VaultProvider';

/**
 * Numero di versione del documento, che avanza a ogni modifica.
 *
 * `useSyncExternalStore` richiede che `getSnapshot` restituisca un valore **stabile**
 * fra un cambiamento e l'altro. Restituendo direttamente la lista delle spese si
 * otterrebbe un array nuovo a ogni chiamata, che React interpreta come "cambiato":
 * il risultato sarebbe un ciclo di render infinito.
 *
 * Con un numero, l'identità cambia solo quando i dati cambiano davvero, e le liste si
 * derivano con `useMemo`.
 */
function useDocVersion(): number {
  const { subscribe, getVersion } = useVaultRuntime();
  return useSyncExternalStore(subscribe, getVersion, getVersion);
}

/**
 * Marca il calcolo come dipendente dalla versione del documento.
 *
 * Le liste si leggono da un `Y.Doc` **mutabile**: il risultato dipende dallo stato del
 * documento, che però non compare fra gli argomenti. `version` è ciò che rende quella
 * dipendenza visibile a React.
 *
 * Serve chiamarla dentro il corpo del memo perché `exhaustive-deps` considera
 * "inutile" una dipendenza mai referenziata — e la segnalerebbe, pur essendo l'unica
 * cosa che fa funzionare la reattività.
 */
function dependsOnDocument(_version: number): void {
  /* nessun effetto: conta solo che `version` sia letta */
}

/** Spese che soddisfano il filtro, ricalcolate a ogni modifica del documento. */
export function useExpenses(filter: ExpenseFilter = {}): Expense[] {
  const { store } = useVaultRuntime();
  const version = useDocVersion();
  const { from, to, categoryId, includeDeleted } = filter;

  return useMemo(() => {
    dependsOnDocument(version);
    // Spread condizionale invece di `{ from, to, ... }`: con
    // `exactOptionalPropertyTypes` una proprietà valorizzata a `undefined` è diversa
    // da una proprietà assente, e il tipo la rifiuta.
    return store.listExpenses({
      ...(from !== undefined && { from }),
      ...(to !== undefined && { to }),
      ...(categoryId !== undefined && { categoryId }),
      ...(includeDeleted !== undefined && { includeDeleted }),
    });
    // I singoli campi e non l'oggetto `filter`: i chiamanti passano un letterale
    // nuovo a ogni render, la cui identità cambierebbe sempre.
  }, [store, version, from, to, categoryId, includeDeleted]);
}

export function useCategories(includeArchived = false): Category[] {
  const { store } = useVaultRuntime();
  const version = useDocVersion();
  return useMemo(() => {
    dependsOnDocument(version);
    return store.listCategories(includeArchived);
  }, [store, version, includeArchived]);
}

export function useMembers(): Member[] {
  const { store } = useVaultRuntime();
  const version = useDocVersion();
  return useMemo(() => {
    dependsOnDocument(version);
    return store.listMembers();
  }, [store, version]);
}

/** Singola spesa, o `null` se non esiste. */
export function useExpense(id: string | undefined): Expense | null {
  const { store } = useVaultRuntime();
  const version = useDocVersion();
  return useMemo(() => {
    dependsOnDocument(version);
    return id === undefined ? null : store.getExpense(id);
  }, [store, version, id]);
}
