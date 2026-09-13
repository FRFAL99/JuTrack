/**
 * Da un elenco di fogli a un file `.xlsx`.
 *
 * È il pezzo che tiene insieme `parts.ts` (l'XML) e `zip.ts` (l'involucro). Non contiene
 * regole proprie se non una: l'ordine delle voci nell'archivio.
 */
import { utf8ToBytes } from '../../crypto/encoding';
import {
  contentTypesXml,
  rootRelsXml,
  sheetXml,
  stylesXml,
  workbookRelsXml,
  workbookXml,
  type Sheet,
} from './parts';
import { zipStore, type ZipEntry } from './zip';

/** Excel tronca i nomi oltre i 31 caratteri e rifiuta questi sei segni. */
const FORBIDDEN_IN_NAME = /[[\]:*?/\\]/;

function assertSheetNames(sheets: Sheet[]): void {
  const seen = new Set<string>();
  for (const sheet of sheets) {
    if (sheet.name.length === 0 || sheet.name.length > 31) {
      throw new Error(`nome di foglio non valido: «${sheet.name}» (1-31 caratteri)`);
    }
    if (FORBIDDEN_IN_NAME.test(sheet.name)) {
      throw new Error(
        `nome di foglio non valido: «${sheet.name}» non può contenere [ ] : * ? / \\`,
      );
    }
    // Due fogli omonimi producono un file che si apre e mostra un foglio solo: meglio
    // fermarsi qui, dove si sa chi li ha costruiti, che scoprirlo aprendo il file.
    const key = sheet.name.toLowerCase();
    if (seen.has(key)) throw new Error(`due fogli si chiamano «${sheet.name}»`);
    seen.add(key);
  }
}

/**
 * Costruisce il file.
 *
 * **`[Content_Types].xml` è la prima voce dell'archivio**, e non è un vezzo: è il file che
 * dichiara di che tipo è ogni altra parte, e alcuni lettori di OOXML lo cercano all'inizio
 * dello ZIP invece di passare dalla directory centrale. Metterlo altrove produce un file
 * che gli strumenti da riga di comando aprono e Excel no — il guasto peggiore da
 * diagnosticare, perché `unzip -l` non ha niente da ridire.
 */
export function buildWorkbook(sheets: Sheet[]): Uint8Array {
  if (sheets.length === 0) throw new Error('un file .xlsx deve avere almeno un foglio');
  assertSheetNames(sheets);

  const entries: ZipEntry[] = [
    { name: '[Content_Types].xml', data: utf8ToBytes(contentTypesXml(sheets.length)) },
    { name: '_rels/.rels', data: utf8ToBytes(rootRelsXml()) },
    { name: 'xl/workbook.xml', data: utf8ToBytes(workbookXml(sheets.map((s) => s.name))) },
    { name: 'xl/_rels/workbook.xml.rels', data: utf8ToBytes(workbookRelsXml(sheets.length)) },
    { name: 'xl/styles.xml', data: utf8ToBytes(stylesXml()) },
    ...sheets.map((sheet, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: utf8ToBytes(sheetXml(sheet)),
    })),
  ];

  return zipStore(entries);
}
