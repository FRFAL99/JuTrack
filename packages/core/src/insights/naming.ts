/**
 * Negozi e tag: come si scrivono e come si contano.
 *
 * Non sono entità con un id, ma due campi di testo della spesa. Il vocabolario si deriva
 * in lettura da chi li usa — un negozio esiste finché esiste una spesa che lo nomina — e
 * questo file è il posto in cui le due grafie della stessa cosa tornano a essere una.
 *
 * `Esselunga`, `esselunga` e `Esselunga ` sono lo stesso negozio e devono fare una barra
 * sola. Si conserva la grafia scritta dall'utente, si aggrega sulla chiave, e a schermo
 * compare la grafia **più usata**. Senza questo, «top negozi» diventa un elenco di refusi.
 */
import type { Expense } from '../model/types';

/** Spazi ai margini tolti, spazi interni collassati. È la grafia che si salva. */
function tidy(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/** Forma canonica per il confronto: come `tidy`, ma minuscola. */
function fold(value: string): string {
  return tidy(value).toLowerCase();
}

/** Chiave su cui due grafie dello stesso negozio si riconoscono uguali. */
export function storeKey(name: string): string {
  return fold(name);
}

/**
 * Chiave su cui due grafie dello stesso tag si riconoscono uguali.
 *
 * Oggi è la stessa regola di `storeKey`, e resta una funzione a parte perché le due cose
 * possono divergere: un tag è una parola scelta da chi scrive, un negozio è un nome
 * proprio, e il giorno in cui uno dei due volesse una regola sua non si dovrà andare a
 * cercare quale dei due chiamanti intendeva cosa.
 */
export function tagKey(tag: string): string {
  return fold(tag);
}

/** Il negozio come va salvato: spazi ripuliti, maiuscole com'è stato scritto. */
export function normalizeStore(name: string): string {
  return tidy(name);
}

/**
 * I tag come vanno salvati: ripuliti, vuoti scartati, duplicati rimossi.
 *
 * La deduplica è **sulla chiave normalizzata**: salvare `Spesa` e `spesa` sulla stessa
 * riga sarebbe un doppione che poi produce due barre. Sopravvive la prima grafia scritta,
 * e l'ordine di inserimento resta quello che l'utente ha visto.
 */
export function normalizeTags(tags: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of tags) {
    const tag = tidy(raw);
    if (tag === '') continue;
    const key = tagKey(tag);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

/** I negozi già usati, dal più frequente al meno. */
export function knownStores(expenses: Expense[]): string[] {
  return vocabulary(expenses, (expense) => (expense.store === '' ? [] : [expense.store]));
}

/** I tag già usati, dal più frequente al meno. */
export function knownTags(expenses: Expense[]): string[] {
  return vocabulary(expenses, (expense) => expense.tags);
}

/**
 * Il vocabolario di un campo: una voce per chiave, nella grafia più usata.
 *
 * Le spese cancellate non contano. Un negozio nominato solo da una spesa che qualcuno ha
 * cancellato non deve continuare a comparire fra i suggerimenti: è sparito con lei.
 *
 * A parità di frequenza decide la chiave in ordine alfabetico, non l'ordine di
 * iterazione: i due telefoni devono proporre lo stesso elenco, altrimenti la stessa
 * situazione sembra due situazioni diverse.
 */
function vocabulary(expenses: Expense[], pick: (expense: Expense) => string[]): string[] {
  const byKey = new Map<string, { total: number; spellings: Map<string, number> }>();

  for (const expense of expenses) {
    if (expense.deletedAt !== null) continue;
    for (const raw of pick(expense)) {
      const name = tidy(raw);
      if (name === '') continue;
      const key = fold(name);
      const entry = byKey.get(key) ?? { total: 0, spellings: new Map<string, number>() };
      entry.total++;
      entry.spellings.set(name, (entry.spellings.get(name) ?? 0) + 1);
      byKey.set(key, entry);
    }
  }

  return [...byKey.entries()]
    .sort(([keyA, a], [keyB, b]) => b.total - a.total || (keyA < keyB ? -1 : 1))
    .map(([, entry]) => mostUsed(entry.spellings));
}

/** La grafia scritta più volte; a parità, la prima in ordine alfabetico. */
function mostUsed(spellings: Map<string, number>): string {
  let best = '';
  let bestCount = -1;
  for (const [name, count] of spellings) {
    if (count > bestCount || (count === bestCount && name < best)) {
      best = name;
      bestCount = count;
    }
  }
  return best;
}
