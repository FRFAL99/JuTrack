import { describe, expect, it } from 'vitest';
import { utf8ToBytes } from '../../crypto/encoding';
import { crc32, zipStore, type ZipEntry } from './zip';

function bytes(text: string): Uint8Array {
  return utf8ToBytes(text);
}

function byteAt(data: Uint8Array, at: number): number {
  return data[at] ?? 0;
}

function u16(data: Uint8Array, at: number): number {
  return byteAt(data, at) | (byteAt(data, at + 1) << 8);
}

function u32(data: Uint8Array, at: number): number {
  return (
    (byteAt(data, at) |
      (byteAt(data, at + 1) << 8) |
      (byteAt(data, at + 2) << 16) |
      (byteAt(data, at + 3) << 24)) >>>
    0
  );
}

/**
 * Un lettore di ZIP minimo, che entra dalla porta principale.
 *
 * Passa dalla **directory centrale**, cioè come fa un lettore vero: legge l'EOCD in coda,
 * salta all'indice, e per ogni voce risale all'intestazione locale. Un test che si
 * limitasse a confrontare i byte prodotti verificherebbe che il codice fa quel che fa; così
 * invece verifica che i tre blocchi si **rimandino** l'un l'altro senza contraddirsi, che è
 * l'unico modo in cui uno ZIP può essere sbagliato in silenzio.
 */
function readZip(archive: Uint8Array): { name: string; data: Uint8Array; crc: number }[] {
  const eocd = archive.length - 22;
  expect(u32(archive, eocd)).toBe(0x06054b50);

  const count = u16(archive, eocd + 10);
  let at = u32(archive, eocd + 16);

  const entries: { name: string; data: Uint8Array; crc: number }[] = [];
  for (let i = 0; i < count; i++) {
    expect(u32(archive, at)).toBe(0x02014b50);
    const crc = u32(archive, at + 16);
    const size = u32(archive, at + 24);
    const nameLength = u16(archive, at + 28);
    const localOffset = u32(archive, at + 42);
    const name = String.fromCharCode(...archive.slice(at + 46, at + 46 + nameLength));

    expect(u32(archive, localOffset)).toBe(0x04034b50);
    expect(u16(archive, localOffset + 8)).toBe(0); // metodo STORE
    const localNameLength = u16(archive, localOffset + 26);
    const localExtraLength = u16(archive, localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;

    entries.push({ name, data: archive.slice(start, start + size), crc });
    at += 46 + nameLength + u16(archive, at + 30) + u16(archive, at + 32);
  }
  return entries;
}

describe('crc32', () => {
  it('produce il valore di riferimento su «123456789»', () => {
    // Il vettore di prova classico del CRC-32 IEEE. Se cambia questo, è cambiata la tabella.
    expect(crc32(bytes('123456789'))).toBe(0xcbf43926);
  });

  it('vale zero su un ingresso vuoto', () => {
    expect(crc32(new Uint8Array(0))).toBe(0);
  });

  it('restituisce sempre un intero senza segno', () => {
    // Senza lo `>>> 0` finale questo sarebbe negativo, e il campo nello ZIP sbagliato.
    expect(crc32(bytes('a'))).toBeGreaterThan(0);
    expect(crc32(bytes('jutrack'))).toBeGreaterThanOrEqual(0);
  });
});

describe('zipStore', () => {
  const entries: ZipEntry[] = [
    { name: '[Content_Types].xml', data: bytes('<Types/>') },
    { name: 'xl/workbook.xml', data: bytes('<workbook/>') },
  ];

  it('rilegge dalla directory centrale ciò che ha scritto', () => {
    const read = readZip(zipStore(entries));

    expect(read.map((e) => e.name)).toEqual(['[Content_Types].xml', 'xl/workbook.xml']);
    expect(read[0]!.data).toEqual(bytes('<Types/>'));
    expect(read[1]!.data).toEqual(bytes('<workbook/>'));
  });

  it('scrive in ogni intestazione il CRC del contenuto', () => {
    const read = readZip(zipStore(entries));
    expect(read[0]!.crc).toBe(crc32(bytes('<Types/>')));
    expect(read[1]!.crc).toBe(crc32(bytes('<workbook/>')));
  });

  it('conserva l’ordine delle voci: il primo file dell’archivio è il primo passato', () => {
    // Non è pignoleria: `[Content_Types].xml` deve stare in testa, e l'ordine è l'unico
    // modo che chi chiama ha per garantirlo.
    const read = readZip(zipStore([...entries].reverse()));
    expect(read[0]!.name).toBe('xl/workbook.xml');
  });

  it('è deterministico: le stesse voci danno gli stessi byte', () => {
    // Niente `Date.now()` da nessuna parte. È la proprietà che rende confrontabili i test
    // di `parts.ts`, e che fa sì che due export dello stesso vault siano identici.
    expect(zipStore(entries)).toEqual(zipStore(entries));
  });

  it('scrive una data DOS valida, non zero', () => {
    const archive = zipStore(entries);
    // `0x0000` significherebbe «mese 0, giorno 0»: alcuni lettori lo segnalano come corrotto.
    expect(u16(archive, 12)).toBe(0x0021);
  });

  it('dichiara nell’EOCD il numero di voci e la posizione dell’indice', () => {
    const archive = zipStore(entries);
    const eocd = archive.length - 22;
    expect(u16(archive, eocd + 8)).toBe(2);
    expect(u16(archive, eocd + 10)).toBe(2);
    // L'indice comincia dove finiscono i dati, e la sua dimensione copre fino all'EOCD.
    expect(u32(archive, eocd + 16) + u32(archive, eocd + 12)).toBe(eocd);
  });

  it('gestisce un archivio vuoto senza rompere l’EOCD', () => {
    const archive = zipStore([]);
    expect(archive.length).toBe(22);
    expect(u32(archive, 0)).toBe(0x06054b50);
    expect(readZip(archive)).toEqual([]);
  });

  it('alza la bandiera UTF-8 solo quando il nome ne ha bisogno', () => {
    const ascii = zipStore([{ name: 'a.xml', data: bytes('x') }]);
    expect(u16(ascii, 6)).toBe(0);

    const accented = zipStore([{ name: 'però.xml', data: bytes('x') }]);
    expect(u16(accented, 6)).toBe(0x0800);
  });
});
