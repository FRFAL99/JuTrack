/**
 * Export in CSV — il formato che si apre ovunque.
 *
 * Serve a una cosa sola: non essere prigionieri dell'app. Un CSV si carica in Excel, in
 * Fogli Google, in un notebook Python. Non è però il formato di **backup**: perde la
 * struttura (le quote diventano colonne, i budget un altro file) e non è reimportabile.
 * Per quello c'è l'export JSON, che è lossless.
 *
 * Convenzioni adottate, e il perché:
 *
 * - **Separatore `,` e decimale `.`**, cioè RFC 4180 puro. La convenzione italiana
 *   (separatore `;`, decimale `,`) si aprirebbe meglio in un Excel con locale italiano ma
 *   peggio ovunque altro. Il conflitto si risolve alla radice includendo **anche** la
 *   colonna `importo_centesimi`: intera, senza separatore decimale, senza ambiguità di
 *   locale. È quella la colonna autorevole — nel resto del progetto il denaro è in
 *   centesimi interi, e l'export non fa eccezione.
 * - **Fine riga CRLF**, come prescrive RFC 4180.
 * - **BOM UTF-8 opzionale**, di default attivo: senza, Excel su Windows legge le
 *   accentate come mojibake. Gli altri strumenti lo ignorano.
 */
import type { Cents } from '../model/money';
import { assertCents } from '../model/money';
import type { Expense, Member, VaultSnapshot } from '../model/types';

/** Marcatore d'ordine dei byte: convince Excel che il file è UTF-8. */
export const UTF8_BOM = '﻿';

const EOL = '\r\n';

/**
 * Formatta centesimi come decimale con il punto, senza separatore delle migliaia.
 *
 * Diverso da `formatCents`, che produce la forma italiana leggibile (`1.234,56`): quella
 * è per gli occhi, questa per un parser.
 */
export function centsToDecimal(cents: Cents): string {
  assertCents(cents);
  const negative = cents < 0;
  const abs = Math.abs(cents);
  return `${negative ? '-' : ''}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** Racchiude fra virgolette il campo se contiene separatori, virgolette o a capo. */
export function escapeCsvField(value: string): string {
  if (!/[",\r\n]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Neutralizza i campi di testo che un foglio di calcolo interpreterebbe come formula.
 *
 * Un `=`, `+`, `-`, `@` (o un tab) in testa a una cella fa sì che Excel e Fogli Google
 * valutino il contenuto invece di mostrarlo: è la *CSV injection*. Qui i testi li scrivono
 * i due proprietari del vault, quindi il rischio pratico è basso — ma un export si gira a
 * terzi, e la difesa costa un carattere. Il prefisso è un apice singolo, la convenzione che
 * i fogli di calcolo riconoscono come «tratta il resto come testo».
 */
export function neutralizeFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/** Campo di testo scritto da un umano: prima disinnescato, poi quotato. */
function csvText(value: string): string {
  return escapeCsvField(neutralizeFormula(value));
}

function csvRow(fields: string[]): string {
  return fields.join(',');
}

/**
 * Intestazioni per la colonna della quota di ciascun membro.
 *
 * Due persone possono chiamarsi allo stesso modo: in quel caso al nome si accoda un
 * frammento di id, altrimenti due colonne diverse avrebbero la stessa intestazione e
 * chi legge il file non saprebbe a chi si riferiscono.
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

export interface CsvOptions {
  /** Include le spese cancellate, marcate nella colonna `cancellata_il`. Default: `false`. */
  includeDeleted?: boolean;
  /** Antepone il BOM UTF-8. Default: `true`. */
  bom?: boolean;
}

/**
 * Una riga per spesa, una colonna per membro con la quota che gli compete.
 *
 * Le quote stanno sulla stessa riga della spesa — e non su righe separate — perché il
 * caso d'uso è aprire il file e sommare una colonna, non ricostruire una relazione.
 */
export function expensesToCsv(snapshot: VaultSnapshot, options: CsvOptions = {}): string {
  const { includeDeleted = false, bom = true } = options;

  const categoryNames = new Map(snapshot.categories.map((c) => [c.id, c.name]));
  const memberNames = new Map(snapshot.members.map((m) => [m.id, m.name]));
  const shareLabels = shareColumnLabels(snapshot.members);

  const header = [
    'data',
    'importo',
    'importo_centesimi',
    'valuta',
    'categoria',
    'note',
    'pagata_da',
    'divisione',
    ...shareLabels,
    'creata_il',
    'aggiornata_il',
    'cancellata_il',
    'id',
  ];

  const rows = snapshot.expenses
    .filter((expense) => includeDeleted || expense.deletedAt === null)
    .map((expense) => expenseRow(expense, snapshot.members, categoryNames, memberNames));

  const body = [csvRow(header), ...rows].join(EOL) + EOL;
  return bom ? UTF8_BOM + body : body;
}

function expenseRow(
  expense: Expense,
  members: Member[],
  categoryNames: Map<string, string>,
  memberNames: Map<string, string>,
): string {
  // Una categoria archiviata o un membro rimosso lasciano riferimenti che non risolvono
  // più: meglio scrivere l'id grezzo che una cella vuota, così il dato non sparisce.
  const category =
    expense.categoryId === null
      ? ''
      : (categoryNames.get(expense.categoryId) ?? expense.categoryId);
  const payer = memberNames.get(expense.paidBy) ?? expense.paidBy;

  const shares = members.map((member) => {
    const share = expense.split.shares[member.id];
    return share === undefined ? '' : centsToDecimal(share);
  });

  return csvRow([
    expense.date,
    centsToDecimal(expense.amountCents),
    String(expense.amountCents),
    csvText(expense.currency),
    csvText(category),
    csvText(expense.note),
    csvText(payer),
    expense.split.mode,
    ...shares,
    expense.createdAt,
    expense.updatedAt,
    expense.deletedAt ?? '',
    expense.id,
  ]);
}

/**
 * I pareggi in un file a parte.
 *
 * Non sono spese e non vanno sommati con esse: mescolarli in un unico foglio produrrebbe
 * un totale che non significa niente. Vedi `docs/architecture.md`.
 */
export function settlementsToCsv(snapshot: VaultSnapshot, options: CsvOptions = {}): string {
  const { includeDeleted = false, bom = true } = options;
  const memberNames = new Map(snapshot.members.map((m) => [m.id, m.name]));
  const name = (id: string): string => memberNames.get(id) ?? id;

  const header = ['data', 'importo', 'importo_centesimi', 'da', 'a', 'note', 'cancellato_il', 'id'];

  const rows = snapshot.settlements
    .filter((settlement) => includeDeleted || settlement.deletedAt === null)
    .map((settlement) =>
      csvRow([
        settlement.date,
        centsToDecimal(settlement.amountCents),
        String(settlement.amountCents),
        csvText(name(settlement.fromMember)),
        csvText(name(settlement.toMember)),
        csvText(settlement.note),
        settlement.deletedAt ?? '',
        settlement.id,
      ]),
    );

  const body = [csvRow(header), ...rows].join(EOL) + EOL;
  return bom ? UTF8_BOM + body : body;
}
