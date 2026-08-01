/**
 * Codifiche binarie, senza dipendere da Buffer, da atob/btoa o da TextEncoder.
 *
 * `Buffer` non esiste nel browser, `atob`/`btoa` non esistono in React Native senza
 * polyfill, e **`TextEncoder` non è disponibile su Hermes**: Expo installa `TextDecoder`
 * e `TextEncoderStream`, ma non `TextEncoder` (vedi `expo/src/winter/runtime.native.ts`).
 * Implementarle qui tiene il package davvero indipendente dalla piattaforma.
 */
import { bytesToHex, concatBytes, hexToBytes } from '@noble/hashes/utils.js';

export { bytesToHex, hexToBytes, concatBytes };

/**
 * Codifica una stringa in UTF-8.
 *
 * Scritta a mano invece di usare `utf8ToBytes` di `@noble/hashes`, che internamente
 * usa `TextEncoder` e quindi va in crash su Hermes con `TextEncoder is not defined`.
 *
 * Le coppie surrogate sono gestite esplicitamente: senza, ogni emoji — che nei nomi
 * delle categorie sono la norma — verrebbe codificata come due caratteri di
 * sostituzione, cambiando i byte e quindi il risultato di cifratura e derivazione.
 */
export function utf8ToBytes(input: string): Uint8Array {
  const out: number[] = [];

  for (let i = 0; i < input.length; i++) {
    let codePoint = input.charCodeAt(i);

    // Surrogato alto seguito da uno basso: vanno ricomposti nel codepoint reale.
    if (codePoint >= 0xd800 && codePoint <= 0xdbff && i + 1 < input.length) {
      const low = input.charCodeAt(i + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        codePoint = (codePoint - 0xd800) * 0x400 + (low - 0xdc00) + 0x10000;
        i++;
      }
    }

    // Un surrogato spaiato non è un carattere valido: si sostituisce con U+FFFD,
    // come fa TextEncoder, invece di produrre byte non validi.
    if (codePoint >= 0xd800 && codePoint <= 0xdfff) codePoint = 0xfffd;

    if (codePoint < 0x80) {
      out.push(codePoint);
    } else if (codePoint < 0x800) {
      out.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint < 0x10000) {
      out.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    } else {
      out.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }

  return Uint8Array.from(out);
}

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
