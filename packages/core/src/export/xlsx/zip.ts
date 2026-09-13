/**
 * Un archivio ZIP scritto a mano, con le voci **non compresse**.
 *
 * Un `.xlsx` è uno ZIP di file XML, e questo è il pezzo che li impacchetta. Le voci usano
 * il metodo **STORE** (compressione 0), che è ciò che permette a questo file di esistere:
 * con DEFLATE servirebbe un compressore, cioè una dipendenza, e `packages/core` ne ha tre
 * in tutto. STORE è un metodo legittimo dello stesso formato — un lettore che apre gli ZIP
 * apre anche questi — e il prezzo è che il file esce grande quanto l'XML che contiene.
 *
 * **Se un giorno la dimensione desse fastidio**, si aggiunge un deflate e le voci passano
 * da STORE a DEFLATE cambiando due campi nell'intestazione. Il formato del file non cambia,
 * e nessuno deve riscrivere niente sopra questo modulo.
 *
 * **Tutto qui dentro è deterministico**: nessun `Date.now()`, nessun ordine di iterazione
 * di una mappa. Le stesse voci producono gli stessi byte, sempre — è ciò che rende i test
 * capaci di confrontare byte, invece di limitarsi a «non ha lanciato».
 */
import { utf8ToBytes } from '../../crypto/encoding';

/** Un file dentro l'archivio. */
export interface ZipEntry {
  /** Percorso interno, sempre con `/` come separatore e senza `/` iniziale. */
  name: string;
  data: Uint8Array;
}

const LOCAL_HEADER = 0x04034b50;
const CENTRAL_HEADER = 0x02014b50;
const END_OF_CENTRAL = 0x06054b50;

/**
 * Data e ora di modifica, in formato MS-DOS: **1980-01-01 00:00:00** per ogni voce.
 *
 * Fissa e non l'ora vera, perché due export dello stesso vault devono produrre gli stessi
 * byte: è la proprietà su cui poggiano i test. Lo zero puro non va bene — in DOS il mese e
 * il giorno partono da 1, e uno `0x0000` significa «mese 0, giorno 0», che alcuni lettori
 * segnalano come archivio corrotto.
 */
const DOS_TIME = 0;
const DOS_DATE = 0x0021;

/** Bit 11 delle flag: «il nome di questa voce è in UTF-8». */
const UTF8_NAME_FLAG = 0x0800;

let crcTable: Uint32Array | null = null;

function table(): Uint32Array {
  if (crcTable !== null) return crcTable;
  const built = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let value = i;
    for (let bit = 0; bit < 8; bit++) {
      value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    built[i] = value >>> 0;
  }
  crcTable = built;
  return built;
}

/**
 * CRC-32 (polinomio IEEE 802.3), quello che lo ZIP richiede in ogni intestazione.
 *
 * Restituisce un intero senza segno: lo `>>> 0` finale non è decorativo, senza di esso
 * JavaScript consegnerebbe un negativo e il campo uscirebbe con i byte giusti ma il valore
 * sbagliato in ogni confronto di test.
 */
export function crc32(data: Uint8Array): number {
  const lookup = table();
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    // I `?? 0` sono l'idioma del repo sotto `noUncheckedIndexedAccess`: l'indice qui è
    // sempre fra 0 e 255, ma TypeScript non ha modo di saperlo.
    crc = (lookup[(crc ^ (data[i] ?? 0)) & 0xff] ?? 0) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Scrittore sequenziale little-endian: lo ZIP è little-endian in ogni suo campo. */
class Writer {
  private readonly parts: Uint8Array[] = [];
  private length = 0;

  get offset(): number {
    return this.length;
  }

  u16(value: number): void {
    this.push(new Uint8Array([value & 0xff, (value >>> 8) & 0xff]));
  }

  u32(value: number): void {
    this.push(
      new Uint8Array([
        value & 0xff,
        (value >>> 8) & 0xff,
        (value >>> 16) & 0xff,
        (value >>> 24) & 0xff,
      ]),
    );
  }

  bytes(value: Uint8Array): void {
    this.push(value);
  }

  private push(part: Uint8Array): void {
    this.parts.push(part);
    this.length += part.length;
  }

  concat(): Uint8Array {
    const out = new Uint8Array(this.length);
    let at = 0;
    for (const part of this.parts) {
      out.set(part, at);
      at += part.length;
    }
    return out;
  }
}

interface Prepared {
  nameBytes: Uint8Array;
  flags: number;
  crc: number;
  size: number;
  data: Uint8Array;
  offset: number;
}

/**
 * Impacchetta le voci nell'ordine in cui arrivano.
 *
 * **L'ordine conta**: `[Content_Types].xml` deve essere la prima voce dell'archivio. Non è
 * lo ZIP a pretenderlo — è che alcuni lettori di OOXML cercano quel file all'inizio invece
 * di consultare la directory centrale, e un archivio che li scontenta non si apre affatto.
 * Garantirlo è compito di chi chiama: qui l'ordine si rispetta e basta.
 */
export function zipStore(entries: ZipEntry[]): Uint8Array {
  const writer = new Writer();
  const prepared: Prepared[] = [];

  for (const entry of entries) {
    const nameBytes = utf8ToBytes(entry.name);
    // I nostri nomi sono ASCII, ma dichiararlo costa due righe e toglie di mezzo il caso
    // in cui un domani qualcuno ci metta un nome di foglio dentro il percorso.
    const ascii = nameBytes.every((byte) => byte < 0x80);
    const flags = ascii ? 0 : UTF8_NAME_FLAG;
    const crc = crc32(entry.data);

    const offset = writer.offset;
    writer.u32(LOCAL_HEADER);
    writer.u16(20); // versione necessaria per estrarre: 2.0
    writer.u16(flags);
    writer.u16(0); // metodo: STORE
    writer.u16(DOS_TIME);
    writer.u16(DOS_DATE);
    writer.u32(crc);
    writer.u32(entry.data.length); // compressa e non compressa coincidono
    writer.u32(entry.data.length);
    writer.u16(nameBytes.length);
    writer.u16(0); // niente campo extra
    writer.bytes(nameBytes);
    writer.bytes(entry.data);

    prepared.push({ nameBytes, flags, crc, size: entry.data.length, data: entry.data, offset });
  }

  const centralStart = writer.offset;
  for (const entry of prepared) {
    writer.u32(CENTRAL_HEADER);
    writer.u16(20); // versione di chi ha scritto
    writer.u16(20); // versione necessaria per estrarre
    writer.u16(entry.flags);
    writer.u16(0); // metodo: STORE
    writer.u16(DOS_TIME);
    writer.u16(DOS_DATE);
    writer.u32(entry.crc);
    writer.u32(entry.size);
    writer.u32(entry.size);
    writer.u16(entry.nameBytes.length);
    writer.u16(0); // extra
    writer.u16(0); // commento
    writer.u16(0); // disco di partenza
    writer.u16(0); // attributi interni
    writer.u32(0); // attributi esterni
    writer.u32(entry.offset);
    writer.bytes(entry.nameBytes);
  }
  const centralSize = writer.offset - centralStart;

  writer.u32(END_OF_CENTRAL);
  writer.u16(0); // numero di questo disco
  writer.u16(0); // disco su cui comincia la directory centrale
  writer.u16(prepared.length);
  writer.u16(prepared.length);
  writer.u32(centralSize);
  writer.u32(centralStart);
  writer.u16(0); // commento dell'archivio

  return writer.concat();
}
