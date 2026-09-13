import { describe, expect, it } from 'vitest';
import {
  columnName,
  contentTypesXml,
  date,
  dateSerial,
  escapeXml,
  money,
  number,
  sheetXml,
  stylesXml,
  text,
  workbookRelsXml,
  workbookXml,
  EMPTY,
  STYLE,
} from './parts';

describe('dateSerial', () => {
  it('usa l’origine del calendario di Excel', () => {
    // Tre ancore note: l'epoca Unix, il capodanno del 2000, e il primo giorno in cui il
    // calendario di Excel smette di sbagliare (sotto il 61 c'è il 1900 creduto bisestile).
    expect(dateSerial('1970-01-01')).toBe(25569);
    expect(dateSerial('2000-01-01')).toBe(36526);
    expect(dateSerial('1900-03-01')).toBe(61);
  });

  it('avanza di uno al giorno, anche attraverso un 29 febbraio', () => {
    expect(dateSerial('2024-02-29')! - dateSerial('2024-02-28')!).toBe(1);
    expect(dateSerial('2024-03-01')! - dateSerial('2024-02-29')!).toBe(1);
    // Il 2100 non è bisestile: è il caso che un calcolo approssimato sbaglia.
    expect(dateSerial('2100-03-01')! - dateSerial('2100-02-28')!).toBe(1);
  });

  it('non dipende dal fuso della macchina che lo esegue', () => {
    // Se questa funzione costruisse un `Date`, la notte del cambio d'ora la sposterebbe.
    expect(dateSerial('2026-03-29')! - dateSerial('2026-03-28')!).toBe(1);
    expect(dateSerial('2026-10-25')! - dateSerial('2026-10-24')!).toBe(1);
  });

  it('rifiuta ciò che non è una data ISO', () => {
    expect(dateSerial('04/07/2026')).toBeNull();
    expect(dateSerial('2026-13-01')).toBeNull();
    expect(dateSerial('2026-07-32')).toBeNull();
    expect(dateSerial('')).toBeNull();
  });
});

describe('columnName', () => {
  it('conta come le colonne di un foglio, oltre la Z', () => {
    expect(columnName(0)).toBe('A');
    expect(columnName(25)).toBe('Z');
    expect(columnName(26)).toBe('AA');
    expect(columnName(51)).toBe('AZ');
    expect(columnName(52)).toBe('BA');
    expect(columnName(701)).toBe('ZZ');
    expect(columnName(702)).toBe('AAA');
  });
});

describe('escapeXml', () => {
  it('mette al sicuro i cinque caratteri d’obbligo', () => {
    expect(escapeXml('a & b')).toBe('a &amp; b');
    expect(escapeXml('<tag>')).toBe('&lt;tag&gt;');
    expect(escapeXml('vir"golette')).toBe('vir&quot;golette');
    expect(escapeXml("l'apostrofo")).toBe('l&apos;apostrofo');
  });

  it('butta via i caratteri di controllo che XML non ammette', () => {
    // Un solo byte di questi renderebbe il file **intero** illeggibile per Excel, senza
    // che nessun messaggio dica quale cella. Meglio un carattere di sostituzione.
    expect(escapeXml('pa\u0000ne')).toBe('pa�ne');
    expect(escapeXml('pa\u0008ne')).toBe('pa�ne');
    expect(escapeXml('pa\u001Fne')).toBe('pa�ne');
  });

  it('lascia passare tabulazione, a capo e ritorno a capo, che XML ammette', () => {
    expect(escapeXml('a\tb\nc\rd')).toBe('a\tb\nc\rd');
  });

  it('non tocca le accentate né gli emoji', () => {
    expect(escapeXml('perché 🛒')).toBe('perché 🛒');
  });
});

describe('sheetXml', () => {
  const sheet = {
    name: 'Spese',
    header: ['data', 'importo', 'note'],
    rows: [[date('2026-07-04'), money('25.00'), text('pane')]],
  };

  it('congela la riga delle intestazioni e ci mette un filtro', () => {
    const xml = sheetXml(sheet);
    expect(xml).toContain(
      '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>',
    );
    expect(xml).toContain('<autoFilter ref="A1:C1"/>');
  });

  it('scrive l’intestazione in grassetto sulla riga 1, e i record dalla 2', () => {
    const xml = sheetXml(sheet);
    expect(xml).toContain(`<c r="A1" t="inlineStr" s="${STYLE.header}"><is><t>data</t></is></c>`);
    expect(xml).toContain('<row r="2">');
  });

  it('scrive una data come seriale, non come testo', () => {
    // È tutto il punto del formato: la colonna si ordina e si filtra come una data.
    expect(sheetXml(sheet)).toContain(`<c r="A2" s="${STYLE.date}"><v>46207</v></c>`);
  });

  it('scrive un importo come numero, con il formato del denaro', () => {
    expect(sheetXml(sheet)).toContain(`<c r="B2" s="${STYLE.money}"><v>25.00</v></c>`);
  });

  it('conserva gli spazi in testa e in coda a un testo', () => {
    const xml = sheetXml({ name: 'X', header: ['a'], rows: [[text(' pane ')]] });
    expect(xml).toContain('<t xml:space="preserve"> pane </t>');
  });

  it('salta del tutto le celle vuote, invece di scriverle vuote', () => {
    const xml = sheetXml({ name: 'X', header: ['a', 'b'], rows: [[EMPTY, text('x')]] });
    expect(xml).not.toContain('r="A2"');
    expect(xml).toContain('r="B2"');
  });

  it('degrada a testo una data che non è una data, invece di perderla', () => {
    const xml = sheetXml({ name: 'X', header: ['a'], rows: [[date('non una data')]] });
    expect(xml).toContain('<t xml:space="preserve">non una data</t>');
  });

  it('scrive un numero senza stile', () => {
    const xml = sheetXml({ name: 'X', header: ['a'], rows: [[number('42')]] });
    expect(xml).toContain('<c r="A2"><v>42</v></c>');
  });

  it('produce solo l’intestazione se non ci sono righe', () => {
    const xml = sheetXml({ name: 'X', header: ['a'], rows: [] });
    expect(xml).toContain('<row r="1">');
    expect(xml).not.toContain('<row r="2">');
  });
});

describe('stylesXml', () => {
  it('dichiara i due fill che Excel pretende, in quest’ordine', () => {
    // Un file con un `fill` solo si apre con un avviso di riparazione, e nessun test di
    // byte se ne accorge: si scopre solo aprendolo davvero.
    const xml = stylesXml();
    expect(xml).toContain(
      '<fills count="2"><fill><patternFill patternType="none"/></fill>' +
        '<fill><patternFill patternType="gray125"/></fill></fills>',
    );
  });

  it('definisce i cinque stili che le celle indicizzano', () => {
    // `count` e il numero di `xf` devono coincidere: se si aggiunge uno stile e si dimentica
    // il contatore, Excel apre il file e ignora gli stili oltre il conteggio dichiarato.
    const xml = stylesXml();
    expect(xml).toContain('<cellXfs count="5">');
    expect(xml.match(/<xf [^>]*xfId="0"/g)).toHaveLength(5);
    expect(STYLE).toEqual({ normal: 0, header: 1, date: 2, money: 3, percent: 4 });
  });
});

describe('le parti di contorno', () => {
  it('dichiara un tipo per ogni foglio', () => {
    const xml = contentTypesXml(3);
    expect(xml).toContain('/xl/worksheets/sheet1.xml');
    expect(xml).toContain('/xl/worksheets/sheet3.xml');
    expect(xml).not.toContain('/xl/worksheets/sheet4.xml');
  });

  it('dà agli stili l’ultimo rId, dopo i fogli', () => {
    const xml = workbookRelsXml(2);
    expect(xml).toContain('Id="rId3"');
    expect(xml).toContain('Target="styles.xml"');
  });

  it('mette al sicuro un nome di foglio con una e commerciale', () => {
    expect(workbookXml(['Spese & co'])).toContain('name="Spese &amp; co"');
  });
});
