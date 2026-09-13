/**
 * Le parti XML di un `.xlsx`, e le celle che ci finiscono dentro.
 *
 * Questo modulo non sa niente di spese, di centesimi o di vault: riceve righe di celle già
 * decise e produce XML. La conoscenza del dominio sta in `../vault-xlsx.ts`, e tenerla
 * fuori di qui è ciò che rende questi file confrontabili byte per byte in un test.
 *
 * **Le parti sono sei, ed è il minimo che Excel accetta**: `[Content_Types].xml`,
 * `_rels/.rels`, `xl/workbook.xml`, `xl/_rels/workbook.xml.rels`, `xl/styles.xml` e un
 * `xl/worksheets/sheetN.xml` per foglio. Manca di proposito `xl/sharedStrings.xml`: serve
 * a non ripetere le stringhe uguali, e con `t="inlineStr"` il testo sta dentro la cella.
 * Costa qualche byte in più e toglie di mezzo una tabella da tenere in sincrono.
 */

/* -------------------------------------------------------------------------- */
/* Celle                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Una cella.
 *
 * `number` porta **una stringa**, non un numero, e non è una svista: il valore arriva già
 * formattato da `centsToDecimal`, che è aritmetica intera sui centesimi. Accettare un
 * `number` vorrebbe dire che qualcuno, da qualche parte, ha diviso per cento — cioè ha
 * creato il float che `model/money.ts` tiene fuori dal modello.
 */
export type Cell =
  | { kind: 'empty' }
  | { kind: 'text'; value: string }
  /** Un testo in grassetto: i titoli delle sezioni dentro un foglio di riepilogo. */
  | { kind: 'heading'; value: string }
  | { kind: 'number'; value: string }
  | { kind: 'money'; value: string }
  /** Una quota fra 0 e 1, mostrata come percentuale. */
  | { kind: 'percent'; value: string }
  /** Una data `YYYY-MM-DD`. Diventa un seriale Excel, quindi si ordina e si filtra. */
  | { kind: 'date'; value: string };

export const EMPTY: Cell = { kind: 'empty' };

export function text(value: string): Cell {
  return value === '' ? EMPTY : { kind: 'text', value };
}

export function heading(value: string): Cell {
  return { kind: 'heading', value };
}

export function number(value: string): Cell {
  return { kind: 'number', value };
}

export function money(value: string): Cell {
  return { kind: 'money', value };
}

export function percent(value: string): Cell {
  return { kind: 'percent', value };
}

export function date(value: string): Cell {
  return { kind: 'date', value };
}

export interface Sheet {
  /** Il nome sulla linguetta. Al massimo 31 caratteri, senza `[ ] : * ? / \`. */
  name: string;
  /**
   * L'intestazione delle colonne, sulla riga 1.
   *
   * **Vuota per un foglio a sezioni** come il Riepilogo, dove le colonne non hanno un
   * significato unico per tutta l'altezza: lì un'intestazione mentirebbe su tre quarti del
   * foglio, e il filtro che la accompagna filtrerebbe insieme tabelle diverse. Senza
   * intestazione non si congela niente e non si mette nessun filtro.
   */
  header: string[];
  rows: Cell[][];
}

/* -------------------------------------------------------------------------- */
/* Date                                                                        */
/* -------------------------------------------------------------------------- */

/** Giorni dal 1970-01-01, con l'algoritmo dei giorni civili di Howard Hinnant. */
function daysFromEpoch(year: number, month: number, day: number): number {
  const y = year - (month <= 2 ? 1 : 0);
  const era = Math.floor(y / 400);
  const yearOfEra = y - era * 400;
  const dayOfYear = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
  const dayOfEra =
    yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra - 719468;
}

/**
 * Il seriale Excel di una data `YYYY-MM-DD`, oppure `null` se la stringa non lo è.
 *
 * Aritmetica intera sui tre campi della stringa, **senza mai costruire un `Date`**: un
 * `new Date('2026-03-29')` è UTC, e in un fuso con l'ora legale che comincia quella notte
 * tornerebbe indietro di un giorno a seconda di dove sta il telefono. Qui la data non ha
 * fuso perché non ha mai smesso di essere tre numeri.
 *
 * Lo sfasamento è 25569, cioè i giorni fra il 1899-12-30 — l'origine del calendario di
 * Excel — e l'epoca Unix. L'origine è il **30** e non il 31 dicembre perché Excel crede che
 * il 1900 sia bisestile: l'errore è dentro i suoi seriali sotto il 61, e questa costante lo
 * assorbe per ogni data dal 1900-03-01 in poi.
 */
export function dateSerial(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return daysFromEpoch(year, month, day) + 25569;
}

/* -------------------------------------------------------------------------- */
/* XML                                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Mette al sicuro un testo scritto da una persona dentro un documento XML.
 *
 * Oltre ai cinque caratteri d'obbligo, **butta via i caratteri di controllo** che XML 1.0
 * non ammette affatto (0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F). Non è teoria: un byte di quelli
 * dentro una nota — arrivato da un incolla sfortunato — non produrrebbe una cella strana,
 * produrrebbe un file che Excel **rifiuta per intero**, senza dire quale cella. Si
 * sostituiscono con U+FFFD, che è ciò che fa ogni decodificatore davanti a un carattere
 * che non può rappresentare.
 *
 * Quello che **non** si fa qui è anteporre un apice ai testi che cominciano per `=`: vedi
 * il commento in cima a `../vault-xlsx.ts`.
 */
export function escapeXml(value: string): string {
  let out = '';
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) {
      out += '�';
      continue;
    }
    switch (char) {
      case '&':
        out += '&amp;';
        break;
      case '<':
        out += '&lt;';
        break;
      case '>':
        out += '&gt;';
        break;
      case '"':
        out += '&quot;';
        break;
      case "'":
        out += '&apos;';
        break;
      default:
        out += char;
    }
  }
  return out;
}

/** `0 → A`, `25 → Z`, `26 → AA`. Serve oltre la Z: le colonne quota sono una per persona. */
export function columnName(index: number): string {
  let name = '';
  let n = index;
  do {
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return name;
}

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

/* -------------------------------------------------------------------------- */
/* Stili                                                                       */
/* -------------------------------------------------------------------------- */

/** Gli indici di `cellXfs` in `styles.xml`. Vanno letti insieme a `stylesXml`. */
export const STYLE = { normal: 0, header: 1, date: 2, money: 3, percent: 4 } as const;

/**
 * Il foglio di stili minimo.
 *
 * **I due `fill` non sono facoltativi e non sono in quest'ordine per caso**: Excel pretende
 * che l'indice 0 sia `none` e l'indice 1 `gray125`, e un file che ne dichiara uno solo si
 * apre con un avviso di riparazione. È il genere di dettaglio che nessun test di byte
 * scopre e che solo l'apertura vera rivela.
 */
export function stylesXml(): string {
  return (
    XML_HEAD +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    // 164 è il primo id libero per un formato personalizzato: sotto il 164 sono riservati.
    '<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts>' +
    '<fonts count="2">' +
    '<font><sz val="11"/><name val="Calibri"/></font>' +
    '<font><b/><sz val="11"/><name val="Calibri"/></font>' +
    '</fonts>' +
    '<fills count="2"><fill><patternFill patternType="none"/></fill>' +
    '<fill><patternFill patternType="gray125"/></fill></fills>' +
    '<borders count="1"><border/></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="5">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    // 14 è il formato data predefinito di Excel: si mostra secondo il locale di chi apre.
    '<xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    // 10 è `0.00%`, anch'esso predefinito: il valore nel file resta una frazione fra 0 e 1.
    '<xf numFmtId="10" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '</cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>'
  );
}

/* -------------------------------------------------------------------------- */
/* Fogli                                                                       */
/* -------------------------------------------------------------------------- */

function cellXml(cell: Cell, reference: string): string {
  switch (cell.kind) {
    case 'empty':
      return '';
    case 'text':
      // `xml:space="preserve"`: senza, uno spazio in testa o in coda a una nota sparisce.
      return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(cell.value)}</t></is></c>`;
    case 'heading':
      return `<c r="${reference}" t="inlineStr" s="${STYLE.header}"><is><t>${escapeXml(cell.value)}</t></is></c>`;
    case 'number':
      return `<c r="${reference}"><v>${cell.value}</v></c>`;
    case 'money':
      return `<c r="${reference}" s="${STYLE.money}"><v>${cell.value}</v></c>`;
    case 'percent':
      return `<c r="${reference}" s="${STYLE.percent}"><v>${cell.value}</v></c>`;
    case 'date': {
      const serial = dateSerial(cell.value);
      // Una data che non è una data esce come testo invece di sparire: un record storto
      // resta visibile a chi apre il file, ed è l'unico modo perché qualcuno lo corregga.
      if (serial === null) return cellXml({ kind: 'text', value: cell.value }, reference);
      return `<c r="${reference}" s="${STYLE.date}"><v>${serial}</v></c>`;
    }
  }
}

/** Quanti caratteri occupa una cella, per decidere la larghezza della sua colonna. */
function cellWidth(cell: Cell): number {
  switch (cell.kind) {
    case 'empty':
      return 0;
    case 'text':
    case 'heading':
      return cell.value.length;
    case 'date':
      // Il seriale si mostra come data, quindi conta quanto una data, non quanto il numero.
      return 10;
    default:
      return cell.value.length;
  }
}

/**
 * Larghezze calcolate dal contenuto, non dalla sola intestazione.
 *
 * Le colonne larghe uguale costringono ad allargarle a mano prima di poter leggere: una
 * nota lunga e un `id` non chiedono lo stesso spazio. I limiti sono 8 e 42 caratteri —
 * sotto l'intestazione si troncherebbe, sopra una nota lunga spingerebbe tutto il resto
 * fuori dallo schermo, ed è meglio allargarla a mano quella che serve che subirle tutte.
 */
function colsXml(sheet: Sheet): string {
  const columns = Math.max(sheet.header.length, ...sheet.rows.map((row) => row.length), 0);
  if (columns === 0) return '';

  const widths: number[] = [];
  for (let i = 0; i < columns; i++) {
    widths[i] = (sheet.header[i]?.length ?? 0) + 2;
  }
  for (const row of sheet.rows) {
    for (let i = 0; i < row.length; i++) {
      const cell = row[i];
      if (cell === undefined) continue;
      widths[i] = Math.max(widths[i] ?? 0, cellWidth(cell) + 2);
    }
  }

  const cols = widths
    .map((width, index) => {
      const clamped = Math.min(42, Math.max(8, width));
      return `<col min="${index + 1}" max="${index + 1}" width="${clamped}" customWidth="1"/>`;
    })
    .join('');
  return `<cols>${cols}</cols>`;
}

/**
 * Un foglio.
 *
 * La riga 1 è **congelata** e porta un `<autoFilter>`: un export di qualche centinaio di
 * righe senza intestazioni fisse si scorre tenendo a mente cosa fosse la colonna H, che è
 * esattamente il lavoro che un foglio di calcolo dovrebbe evitare.
 */
export function sheetXml(sheet: Sheet): string {
  const hasHeader = sheet.header.length > 0;
  const lastColumn = columnName(Math.max(0, sheet.header.length - 1));

  const headerRow = hasHeader
    ? '<row r="1">' +
      sheet.header
        .map(
          (label, index) =>
            `<c r="${columnName(index)}1" t="inlineStr" s="${STYLE.header}"><is><t>${escapeXml(label)}</t></is></c>`,
        )
        .join('') +
      '</row>'
    : '';

  // Con l'intestazione i record partono dalla riga 2; senza, dalla 1.
  const firstBodyRow = hasHeader ? 2 : 1;

  const bodyRows = sheet.rows
    .map((row, rowIndex) => {
      const rowNumber = rowIndex + firstBodyRow;
      const cells = row
        .map((cell, index) => cellXml(cell, `${columnName(index)}${rowNumber}`))
        .join('');
      return `<row r="${rowNumber}">${cells}</row>`;
    })
    .join('');

  return (
    XML_HEAD +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    (hasHeader
      ? '<sheetViews><sheetView workbookViewId="0">' +
        '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' +
        '</sheetView></sheetViews>'
      : '') +
    colsXml(sheet) +
    `<sheetData>${headerRow}${bodyRows}</sheetData>` +
    (hasHeader ? `<autoFilter ref="A1:${lastColumn}1"/>` : '') +
    '</worksheet>'
  );
}

/* -------------------------------------------------------------------------- */
/* Le parti di contorno                                                        */
/* -------------------------------------------------------------------------- */

export function contentTypesXml(sheetCount: number): string {
  const sheets = Array.from(
    { length: sheetCount },
    (_, i) =>
      `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  ).join('');

  return (
    XML_HEAD +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    sheets +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '</Types>'
  );
}

export function rootRelsXml(): string {
  return (
    XML_HEAD +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>'
  );
}

export function workbookXml(names: string[]): string {
  const sheets = names
    .map((name, i) => `<sheet name="${escapeXml(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join('');

  return (
    XML_HEAD +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"' +
    ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets>${sheets}</sheets>` +
    '</workbook>'
  );
}

/** Le relazioni del workbook: un `rId` per foglio, e l'ultimo per gli stili. */
export function workbookRelsXml(sheetCount: number): string {
  const sheets = Array.from(
    { length: sheetCount },
    (_, i) =>
      `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
  ).join('');

  return (
    XML_HEAD +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    sheets +
    `<Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    '</Relationships>'
  );
}
