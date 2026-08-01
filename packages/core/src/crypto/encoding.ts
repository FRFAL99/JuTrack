/**
 * Codifiche binarie, senza dipendere da Buffer o da atob/btoa.
 *
 * `Buffer` non esiste nel browser e `atob`/`btoa` non esistono in React Native senza
 * polyfill. Implementarle qui tiene il package indipendente dalla piattaforma.
 */
import { bytesToHex, concatBytes, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';

export { bytesToHex, hexToBytes, concatBytes, utf8ToBytes };

const B64URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/**
 * Codifica in base64url senza padding.
 *
 * base64url e non base64 standard perché questi valori finiscono in URL di pairing e
 * in JSON: `+` e `/` richiederebbero escaping, `-` e `_` no.
 */
export function bytesToBase64url(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] ?? 0;
    const b1 = bytes[i + 1] ?? 0;
    const b2 = bytes[i + 2] ?? 0;
    const remaining = bytes.length - i;

    out += B64URL_ALPHABET[b0 >> 2];
    out += B64URL_ALPHABET[((b0 & 0x03) << 4) | (b1 >> 4)];
    if (remaining > 1) out += B64URL_ALPHABET[((b1 & 0x0f) << 2) | (b2 >> 6)];
    if (remaining > 2) out += B64URL_ALPHABET[b2 & 0x3f];
  }
  return out;
}

/** Decodifica base64url. Accetta anche input con padding `=` o in alfabeto base64 standard. */
export function base64urlToBytes(input: string): Uint8Array {
  const clean = input.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

  const lookup = new Map<string, number>();
  for (let i = 0; i < B64URL_ALPHABET.length; i++) {
    lookup.set(B64URL_ALPHABET[i] as string, i);
  }

  const sextets: number[] = [];
  for (const ch of clean) {
    const v = lookup.get(ch);
    if (v === undefined) throw new Error(`base64url non valido: carattere ${JSON.stringify(ch)}`);
    sextets.push(v);
  }

  // 4 sextetti (6 bit) → 3 byte. Un resto di 1 sextetto è impossibile: sarebbero 6 bit orfani.
  if (sextets.length % 4 === 1) throw new Error('base64url non valido: lunghezza incoerente');

  const out = new Uint8Array(Math.floor((sextets.length * 6) / 8));
  let pos = 0;
  for (let i = 0; i < sextets.length; i += 4) {
    const s0 = sextets[i] ?? 0;
    const s1 = sextets[i + 1] ?? 0;
    const s2 = sextets[i + 2] ?? 0;
    const s3 = sextets[i + 3] ?? 0;

    if (pos < out.length) out[pos++] = (s0 << 2) | (s1 >> 4);
    if (pos < out.length) out[pos++] = ((s1 & 0x0f) << 4) | (s2 >> 2);
    if (pos < out.length) out[pos++] = ((s2 & 0x03) << 6) | s3;
  }
  return out;
}
