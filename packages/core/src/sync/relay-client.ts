/**
 * Client del relay.
 *
 * Cifra in uscita, decifra in ingresso. Il relay riceve solo byte opachi e un token
 * derivato su un dominio HKDF separato da quello della chiave di contenuto.
 */
import { authToken, type VaultKeys } from '../crypto/keys';
import { open, seal } from '../crypto/seal';
import type { RandomSource } from '../crypto/types';
import type { HttpClient } from './types';

export interface PulledUpdate {
  seq: number;
  update: Uint8Array;
}

export interface PullResult {
  updates: PulledUpdate[];
  head: number;
  hasMore: boolean;
  /**
   * Blob che non è stato possibile decifrare, contati e scartati.
   *
   * Non è un errore fatale: un blob corrotto o prodotto con uno schema futuro non deve
   * bloccare la sincronizzazione di tutti gli altri. Va però riportato, perché un numero
   * diverso da zero significa che qualcosa non va — dati danneggiati o manomessi.
   */
  undecryptable: number;
}

/** Errore che porta con sé lo stato HTTP, per distinguere i casi non ritentabili. */
export class RelayError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'RelayError';
    this.status = status;
  }

  /**
   * `true` se ritentare non ha senso.
   *
   * 401/403 significano token errato, 400/413 richiesta malformata: reinviare la stessa
   * cosa produrrebbe lo stesso esito, consumando batteria e quota.
   */
  get permanent(): boolean {
    return this.status === 400 || this.status === 401 || this.status === 403 || this.status === 413;
  }
}

/** Numero massimo di blob per richiesta, allineato al limite del relay. */
const MAX_BLOBS_PER_PUSH = 100;

export class RelayClient {
  constructor(
    private readonly baseUrl: string,
    private readonly keys: VaultKeys,
    private readonly http: HttpClient,
    private readonly random: RandomSource,
  ) {}

  private get headers(): Record<string, string> {
    return {
      authorization: `Bearer ${authToken(this.keys)}`,
      'content-type': 'application/json',
    };
  }

  private url(path: string): string {
    return `${this.baseUrl.replace(/\/+$/, '')}/v1/vault/${this.keys.vaultId}${path}`;
  }

  /**
   * Cifra e invia gli update.
   *
   * Restituisce quanti ne sono stati accettati: chi chiama deve rimuovere **solo quelli**
   * dalla coda. Con più di `MAX_BLOBS_PER_PUSH` update si invia il primo lotto e si
   * lascia il resto alla chiamata successiva, invece di ricevere un 413 e non inviare
   * nulla.
   */
  async push(updates: Uint8Array[]): Promise<{ accepted: number; head: number }> {
    if (updates.length === 0) return { accepted: 0, head: 0 };

    const batch = updates.slice(0, MAX_BLOBS_PER_PUSH);
    const blobs = batch.map((update) =>
      toBase64(seal(this.keys.contentKey, this.keys.vaultId, update, this.random)),
    );

    const res = await this.http.request(this.url('/updates'), {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ blobs }),
    });

    if (res.status !== 200) {
      throw new RelayError(res.status, `push fallito: HTTP ${res.status} ${await safeText(res)}`);
    }

    const body = JSON.parse(await res.text()) as { head: number; accepted: number };
    return { accepted: batch.length, head: body.head };
  }

  /** Scarica e decifra gli update successivi al cursore. */
  async pull(since: number): Promise<PullResult> {
    const res = await this.http.request(this.url(`/updates?since=${since}`), {
      method: 'GET',
      headers: this.headers,
    });

    if (res.status !== 200) {
      throw new RelayError(res.status, `pull fallito: HTTP ${res.status} ${await safeText(res)}`);
    }

    const body = JSON.parse(await res.text()) as {
      updates: { seq: number; blob: string }[];
      head: number;
      hasMore: boolean;
    };

    const updates: PulledUpdate[] = [];
    let undecryptable = 0;

    for (const entry of body.updates) {
      try {
        updates.push({
          seq: entry.seq,
          update: open(this.keys.contentKey, this.keys.vaultId, fromBase64(entry.blob)),
        });
      } catch {
        // Scartato, non fatale: un blob manomesso o di uno schema futuro non deve
        // impedire di applicare tutti gli altri.
        undecryptable++;
      }
    }

    return { updates, head: body.head, hasMore: body.hasMore, undecryptable };
  }
}

async function safeText(res: { text: () => Promise<string> }): Promise<string> {
  try {
    return (await res.text()).slice(0, 200);
  } catch {
    return '';
  }
}

/**
 * base64 standard, non base64url: è il formato che il protocollo del relay usa sul filo
 * (`btoa`/`atob` lato Worker).
 */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function toBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] as number;
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64[b0 >> 2];
    out += B64[((b0 & 0x03) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? '=' : B64[((b1 & 0x0f) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? '=' : B64[b2 & 0x3f];
  }
  return out;
}

function fromBase64(input: string): Uint8Array {
  const clean = input.replace(/=+$/, '');
  const lookup = new Map<string, number>();
  for (let i = 0; i < B64.length; i++) lookup.set(B64[i] as string, i);

  const out = new Uint8Array(Math.floor((clean.length * 6) / 8));
  let pos = 0;
  let buffer = 0;
  let bits = 0;

  for (const ch of clean) {
    const value = lookup.get(ch);
    if (value === undefined) throw new Error(`base64 non valido: carattere ${JSON.stringify(ch)}`);
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[pos++] = (buffer >> bits) & 0xff;
    }
  }

  return out;
}
