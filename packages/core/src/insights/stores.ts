/**
 * Dove si è speso, e sotto quali etichette.
 *
 * Stessa forma di `CategoryTotal` e stesso ordinamento deterministico, così i componenti
 * che disegnano una classifica non devono sapere di cosa la stanno disegnando.
 */
import type { Cents } from '../model/money';
import type { Expense } from '../model/types';
import { mostUsedSpelling, storeKey, tagKey } from './naming';
import { amountFor, type ExpenseQuery } from './query';

export interface NamedTotal {
  /** La grafia più usata fra quelle che condividono la stessa chiave. */
  name: string;
  /** La chiave normalizzata, stabile: da usare come `key` di lista e nei filtri. */
  key: string;
  totalCents: Cents;
  count: number;
  /** Quota sul totale coperto da questa classifica, fra 0 e 1. */
  share: number;
}

/**
 * Totali per negozio, dal più alto al più basso.
 *
 * **Le spese senza negozio non compaiono**, e non c'è una voce «senza negozio»: il campo è
 * facoltativo e quasi tutte le spese ne saranno prive, quindi quella voce dominerebbe ogni
 * grafico dicendo soltanto che il campo è facoltativo. La conseguenza va detta a chi
 * guarda: **la somma di questa classifica è minore del totale della schermata**, e `share`
 * è calcolata sul totale coperto qui, non su quello generale.
 */
export function totalsByStore(expenses: Expense[], query: ExpenseQuery = {}): NamedTotal[] {
  return rank(
    expenses,
    query,
    (expense) => (expense.store === '' ? [] : [expense.store]),
    storeKey,
  );
}

/**
 * Totali per tag, dal più alto al più basso.
 *
 * **Una spesa con due tag conta per intero in entrambi**, quindi la somma di questa
 * classifica può superare il totale della schermata. È il comportamento giusto — la domanda
 * è «quanto ho speso in cose etichettate casa», non «come si ripartisce il totale» — ma è
 * anche il posto in cui i numeri sembrano non tornare, e va detto dove si mostrano.
 */
export function totalsByTag(expenses: Expense[], query: ExpenseQuery = {}): NamedTotal[] {
  return rank(expenses, query, (expense) => expense.tags, tagKey);
}

function rank(
  expenses: Expense[],
  query: ExpenseQuery,
  pick: (expense: Expense) => string[],
  keyOf: (value: string) => string,
): NamedTotal[] {
  const groups = new Map<
    string,
    { totalCents: Cents; count: number; spellings: Map<string, number> }
  >();

  for (const expense of expenses) {
    if (expense.deletedAt !== null) continue;
    const amount = amountFor(expense, query);
    for (const raw of pick(expense)) {
      const key = keyOf(raw);
      if (key === '') continue;
      const group = groups.get(key) ?? {
        totalCents: 0,
        count: 0,
        spellings: new Map<string, number>(),
      };
      group.totalCents += amount;
      group.count++;
      const spelling = raw.trim().replace(/\s+/g, ' ');
      group.spellings.set(spelling, (group.spellings.get(spelling) ?? 0) + 1);
      groups.set(key, group);
    }
  }

  const covered = [...groups.values()].reduce((sum, group) => sum + group.totalCents, 0);

  return (
    [...groups.entries()]
      .map(([key, group]) => ({
        name: mostUsedSpelling(group.spellings),
        key,
        totalCents: group.totalCents,
        count: group.count,
        share: covered === 0 ? 0 : group.totalCents / covered,
      }))
      // A parità di importo decide la chiave, non l'ordine di iterazione della mappa: i due
      // telefoni devono disegnare la stessa classifica.
      .sort((a, b) => b.totalCents - a.totalCents || (a.key < b.key ? -1 : 1))
  );
}
