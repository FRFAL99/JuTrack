import type { ImportCounts, ImportSkip } from '@jutrack/core';
import { plural, t } from '@/i18n/translate';

/**
 * Cosa dire di un file appena letto, prima di scriverlo da qualche parte.
 *
 * Sta in un modulo suo e non dentro la schermata per la ragione di `split-text.ts` e di
 * `extra-fields.ts`: è testo che dipende da dei numeri, cioè la cosa che si sbaglia più
 * facilmente e che dentro un componente nessun test guarderebbe.
 *
 * **Tradotto insieme a `/backup` e `/export`**, accanto a cui questa schermata vive: è lo
 * Step 40, e farlo per una sola delle tre avrebbe lasciato l'utente inglese davanti a due
 * schermate di ripristino su tre in una lingua che non legge — peggio di trovarle tutte e
 * tre coerenti. Il testo che dipende da un numero passa da `plural()` invece che da `t()`.
 */

/** Le famiglie, con la chiave del dizionario che porta singolare e plurale. */
const LABELS: (keyof ImportCounts)[] = [
  'expenses',
  'members',
  'categories',
  'budgets',
  'settlements',
  // Il vocabolario del gruppo (Step 59). Va elencato **e** contato: `keptTotal` passa di
  // qui, e un file che portasse solo l'elenco di tag e negozi direbbe altrimenti «non c'è
  // niente da importare» mentre qualcosa da importare c'è.
  'vocabulary',
];

/**
 * «12 spese, 2 persone, 8 categorie», saltando ciò che non c'è.
 *
 * Le famiglie vuote si omettono invece di scrivere «0 pareggi»: un elenco di zeri fa
 * cercare un problema dove non ce n'è, e un vault senza pareggi è il caso normale.
 */
export function describeKept(counts: ImportCounts): string {
  const parts = LABELS.filter((key) => counts[key] > 0).map((key) =>
    plural(`importScreen.summary.${key}`, counts[key]),
  );
  return parts.length === 0 ? t('importScreen.summary.none') : parts.join(', ');
}

/** Quanti record sono entrati in tutto. Zero significa che non c'è niente da importare. */
export function keptTotal(counts: ImportCounts): number {
  return LABELS.reduce((sum, key) => sum + counts[key], 0);
}

/**
 * Le righe scartate, raggruppate per motivo.
 *
 * **Per motivo e non per record**, che è la differenza fra una schermata leggibile e un
 * muro: un file troncato produce lo stesso scarto su centinaia di spese, e centinaia di
 * righe identiche nascondono l'unica diversa. Il motivo è la cosa che si legge, il conteggio
 * dice quanto pesa.
 *
 * L'ordine è per numerosità decrescente, e a parità alfabetico, così due letture dello
 * stesso file mostrano la stessa lista — che è ciò che permette di confrontare due tentativi.
 */
export function groupSkips(skipped: ImportSkip[]): { reason: string; count: number }[] {
  const byReason = new Map<string, number>();
  for (const skip of skipped) {
    byReason.set(skip.reason, (byReason.get(skip.reason) ?? 0) + 1);
  }

  return [...byReason.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason, 'it'));
}

/**
 * Il nome da proporre per il gruppo importato, in tre gradini.
 *
 * **Dallo Step 63 il file può dire come si chiamava il gruppo** (formato v4), e allora si
 * propone quello: è l'unica proposta che chi importa riconosce a colpo d'occhio. Fino alla
 * v3 quel campo non c'era — `VaultSnapshot` contiene i soli record, mentre il nome sta in
 * `meta` dentro il documento — quindi i file vecchi continuano a passare per i due gradini
 * di prima, ed è il motivo per cui questa funzione ne ha tre e non uno.
 *
 * Il ripiego è la data in cui il file è stato prodotto, che è l'unica cosa che distingue due
 * export dello stesso vault: «Importato del 4/8/2026». Senza nemmeno quella, il nome
 * generico — e chi importa può comunque scriverne uno suo prima di confermare.
 *
 * **Il nome non si sanifica qui.** `GroupRegistry.register` passa già da `normalizeGroupName`
 * e ripiega sul nome di default se resta vuoto: rifarlo adesso vorrebbe dire due regole da
 * tenere allineate, e la seconda invecchierebbe.
 */
export function suggestedName(exportedAt: string | null, groupName: string | null = null): string {
  if (groupName !== null && groupName.trim() !== '') return groupName;

  if (exportedAt === null) return t('importScreen.summary.defaultName');
  const when = new Date(exportedAt);
  if (Number.isNaN(when.getTime())) return t('importScreen.summary.defaultName');
  return t('importScreen.summary.importedOn', {
    day: when.getDate(),
    month: when.getMonth() + 1,
    year: when.getFullYear(),
  });
}
