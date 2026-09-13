/**
 * Export in `.xlsx` — il formato che si apre e si somma.
 *
 * Prende il posto del CSV, e il motivo sta scritto nell'ADR che l'ha deciso
 * (`docs/adr/0004-l-xlsx-al-posto-del-csv.md`). In breve: il CSV serviva a «leggere i dati
 * altrove», e in un Excel con locale italiano finiva tutto in una colonna sola. La cella di
 * un foglio di calcolo è **tipata**, quindi un numero è un numero in qualunque locale, e
 * con essa cadono tre cose che esistevano solo per sopravvivere al CSV:
 *
 * - **il BOM UTF-8**, che serviva a convincere Excel su Windows della codifica: qui la
 *   codifica è dichiarata dentro l'XML;
 * - **la colonna `importo_centesimi`**, che era la copia intera e non fraintendibile
 *   dell'importo: ora l'importo è già un numero, e non c'è niente da fraintendere;
 * - **il disinnesco delle formule.** Questa merita una riga in più, perché è l'unica delle
 *   tre che sarebbe **dannoso** portarsi dietro.
 *
 * **Qui non si disinnescano le formule, ed è deliberato.** Nel CSV una cella che comincia
 * per `=` viene valutata da Excel, e `neutralizeFormula` le anteponeva un apice. In un
 * `.xlsx` una cella `t="inlineStr"` non è mai una formula: lo è solo un `<f>`, e questo
 * modulo non ne scrive nessuno. Ereditare l'abitudine vorrebbe dire anteporre un apice a un
 * testo che una persona ha scritto davvero, cioè **corrompere il dato** per difendersi da
 * un rischio che il formato ha già chiuso. C'è un test che lo afferma.
 *
 * Come il CSV prima di lui, questo file **non contiene la chiave del vault**, e non è
 * reimportabile: è appiattito per essere letto. Il formato che rientra è il JSON.
 */
import type { Cents } from '../model/money';
import { assertCents } from '../model/money';
import type { Expense, Member, VaultSnapshot } from '../model/types';
import { buildWorkbook } from './xlsx/workbook';
import { date, EMPTY, money, text, type Cell, type Sheet } from './xlsx/parts';

/**
 * Formatta centesimi come decimale col punto, senza separatore delle migliaia.
 *
 * Arriva da `csv.ts`, dove è nata, e **non è cambiata di una riga**. Serve ancora, e per la
 * stessa ragione di prima: è aritmetica intera: divide e prende il resto, non divide per
 * cento. La stringa che produce finisce dritta dentro il `<v>` della cella, quindi lungo
 * tutto il percorso **non esiste mai un float** — la regola ferrea di `model/money.ts`.
 *
 * Diversa da `formatCents`, che produce la forma italiana leggibile (`1.234,56`): quella è
 * per gli occhi, questa per un parser. Qui il parser è Excel.
 */
export function centsToDecimal(cents: Cents): string {
  assertCents(cents);
  const negative = cents < 0;
  const abs = Math.abs(cents);
  return `${negative ? '-' : ''}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/**
 * Intestazioni per la colonna della quota di ciascun membro.
 *
 * Arriva da `csv.ts` e non è cambiata. Due persone possono chiamarsi allo stesso modo: in
 * quel caso al nome si accoda un frammento di id, o due colonne diverse avrebbero la stessa
 * intestazione e chi legge il file non saprebbe a chi si riferiscono.
 */
export function shareColumnLabels(members: Member[]): string[] {
  const counts = new Map<string, number>();
  for (const member of members) counts.set(member.name, (counts.get(member.name) ?? 0) + 1);

  return members.map((member) =>
    (counts.get(member.name) ?? 0) > 1
      ? `quota_${member.name}_${member.id.slice(0, 6)}`
      : `quota_${member.name}`,
  );
}

export interface XlsxOptions {
  /**
   * Include le spese e i pareggi cancellati, con la colonna `cancellata_il` in più.
   * Default: `false`.
   *
   * **Il default è quello del CSV, e la ragione è più forte qui che là.** Questo file esiste
   * perché si possa selezionare la colonna «importo» e leggere una somma: righe cancellate
   * dentro quella colonna darebbero un totale che non corrisponde a niente che l'app mostri,
   * e nessuno saprebbe da dove viene la differenza. Il formato che conserva **tutto**,
   * tombstone compresi, è il JSON, ed è quello il backup.
   */
  includeDeleted?: boolean;
}

/** I tag in una cella sola. */
function joinTags(tags: string[]): string {
  // Virgola e spazio, non `;` come nel CSV: là la virgola era già il separatore del file e
  // non poteva essere anche quello interno. Qui quel conflitto non esiste.
  return tags.join(', ');
}

function expensesSheet(snapshot: VaultSnapshot, includeDeleted: boolean): Sheet {
  const categoryNames = new Map(snapshot.categories.map((c) => [c.id, c.name]));
  const memberNames = new Map(snapshot.members.map((m) => [m.id, m.name]));
  const shareLabels = shareColumnLabels(snapshot.members);

  const header = [
    'data',
    'importo',
    'valuta',
    'categoria',
    'note',
    'negozio',
    'tag',
    'pagata_da',
    'divisione',
    ...shareLabels,
    'creata_il',
    'aggiornata_il',
    ...(includeDeleted ? ['cancellata_il'] : []),
    'id',
  ];

  const rows = snapshot.expenses
    .filter((expense) => includeDeleted || expense.deletedAt === null)
    .map((expense) =>
      expenseRow(expense, snapshot.members, categoryNames, memberNames, includeDeleted),
    );

  return { name: 'Spese', header, rows };
}

function expenseRow(
  expense: Expense,
  members: Member[],
  categoryNames: Map<string, string>,
  memberNames: Map<string, string>,
  includeDeleted: boolean,
): Cell[] {
  // Una categoria archiviata o un membro rimosso lasciano riferimenti che non risolvono
  // più: si scrive l'id grezzo invece di una cella vuota, così il dato non sparisce.
  const category =
    expense.categoryId === null
      ? ''
      : (categoryNames.get(expense.categoryId) ?? expense.categoryId);
  const payer = memberNames.get(expense.paidBy) ?? expense.paidBy;

  const shares = members.map((member) => {
    const share = expense.split.shares[member.id];
    return share === undefined ? EMPTY : money(centsToDecimal(share));
  });

  return [
    date(expense.date),
    money(centsToDecimal(expense.amountCents)),
    text(expense.currency),
    text(category),
    text(expense.note),
    text(expense.store),
    text(joinTags(expense.tags)),
    text(payer),
    text(expense.split.mode),
    ...shares,
    // I timestamp restano **testo**, le date no. `createdAt` è UTC (`IsoTimestamp`), ed
    // Excel non ha il concetto di fuso: convertirlo in una data-ora del foglio sposterebbe
    // in silenzio il giorno di una spesa creata dopo le 22:00. Meglio un testo esatto che
    // un numero plausibile.
    text(expense.createdAt),
    text(expense.updatedAt),
    ...(includeDeleted ? [text(expense.deletedAt ?? '')] : []),
    text(expense.id),
  ];
}

/**
 * I pareggi in un foglio a parte.
 *
 * Non sono spese e non vanno sommati con esse: in un unico foglio prima o poi qualcuno
 * somma una colonna che comprende entrambi e ottiene un numero privo di significato. È la
 * stessa ragione per cui il CSV erano due file — qui però restano dentro lo stesso, e
 * questo è il guadagno: un file solo da passare, due fogli da leggere.
 */
function settlementsSheet(snapshot: VaultSnapshot, includeDeleted: boolean): Sheet {
  const memberNames = new Map(snapshot.members.map((m) => [m.id, m.name]));
  const name = (id: string): string => memberNames.get(id) ?? id;

  const header = [
    'data',
    'importo',
    'da',
    'a',
    'note',
    ...(includeDeleted ? ['cancellato_il'] : []),
    'id',
  ];

  const rows = snapshot.settlements
    .filter((settlement) => includeDeleted || settlement.deletedAt === null)
    .map((settlement): Cell[] => [
      date(settlement.date),
      money(centsToDecimal(settlement.amountCents)),
      text(name(settlement.fromMember)),
      text(name(settlement.toMember)),
      text(settlement.note),
      ...(includeDeleted ? [text(settlement.deletedAt ?? '')] : []),
      text(settlement.id),
    ]);

  return { name: 'Pareggi', header, rows };
}

/** I fogli, nell'ordine in cui compaiono nelle linguette. */
export function vaultSheets(snapshot: VaultSnapshot, options: XlsxOptions = {}): Sheet[] {
  const includeDeleted = options.includeDeleted ?? false;
  return [expensesSheet(snapshot, includeDeleted), settlementsSheet(snapshot, includeDeleted)];
}

/** Il file `.xlsx`, pronto da scrivere su disco o da passare al foglio di condivisione. */
export function toXlsxExport(snapshot: VaultSnapshot, options: XlsxOptions = {}): Uint8Array {
  return buildWorkbook(vaultSheets(snapshot, options));
}
