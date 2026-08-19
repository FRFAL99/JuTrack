import {
  describeQuery as describeQueryWith,
  queryParts as queryPartsWith,
  type ExpenseQuery,
  type QueryLabels,
  type QueryStrings,
} from '@jutrack/core';
import { t } from './translate';

/**
 * `queryParts`/`describeQuery` nella lingua corrente.
 *
 * Stessa forma di `@/i18n/money` (Step 39): il core riceve il testo come parametro invece
 * di importare `i18next` (regola dello Step 0), e qui c'è il modulo che glielo passa già
 * tradotto — così i due punti che chiamano queste funzioni (`FilterBar`, il tab Grafici)
 * restano una riga di import, non un terzo argomento da ricordare a ogni chiamata.
 *
 * `queryStrings()` è una funzione e non una costante di modulo: una costante calcolata
 * all'import resterebbe congelata nella lingua di sistema, lo stesso guasto rischiato dai
 * widget allo Step 38.
 */
export function queryStrings(): QueryStrings {
  return {
    categoriesCount: (count) => t('stats.query.categoriesCount', { count }),
    storesCount: (count) => t('stats.query.storesCount', { count }),
    tagsCount: (count) => t('stats.query.tagsCount', { count }),
    owedBy: (who) => t('stats.query.owedBy', { who }),
    paidBy: (who) => t('stats.query.paidBy', { who }),
    amountFrom: (amount) => t('stats.query.amountFrom', { amount }),
    amountTo: (amount) => t('stats.query.amountTo', { amount }),
    allExpenses: t('stats.query.allExpenses'),
    periodFrom: (date) => t('stats.query.periodFrom', { date }),
    periodTo: (date) => t('stats.query.periodTo', { date }),
  };
}

/** Come `queryParts` del core, ma nella lingua corrente. */
export function queryParts(query: ExpenseQuery, labels: QueryLabels = {}, symbol = '€'): string[] {
  return queryPartsWith(query, labels, symbol, queryStrings());
}

/** Come `describeQuery` del core, ma nella lingua corrente. */
export function describeQuery(query: ExpenseQuery, labels: QueryLabels = {}, symbol = '€'): string {
  return describeQueryWith(query, labels, symbol, queryStrings());
}
