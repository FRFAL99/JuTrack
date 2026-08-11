/**
 * Durable Object: un'istanza per vault.
 *
 * Conserva un log append-only di blob **opachi**. Non ha la chiave di cifratura e non
 * può interpretarne il contenuto: per questo oggetto un update Yjs e un file qualsiasi
 * sono indistinguibili.
 *
 * Backend SQLite, obbligatorio sul piano Workers Free.
 */
import {
  AUTH_TOKEN_PATTERN,
  MAX_BLOBS_PER_REQUEST,
  MAX_BLOB_BYTES,
  MAX_UPDATES_PER_RESPONSE,
  UPDATE_TTL_DAYS,
  type PullResponse,
  type PushResponse,
} from './protocol';

const MS_PER_DAY = 86_400_000;

export class VaultRoom implements DurableObject {
  private readonly sql: SqlStorage;
  private readonly storage: DurableObjectStorage;

  constructor(state: DurableObjectState) {
    this.storage = state.storage;
    this.sql = state.storage.sql;

    // `blockConcurrencyWhile` garantisce che nessuna richiesta venga servita prima
    // che lo schema esista: senza, la prima richiesta potrebbe trovare la tabella
    // assente e fallire.
    state.blockConcurrencyWhile(async () => {
      this.ensureSchema();
    });
  }

  private ensureSchema(): void {
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS updates (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        blob BLOB NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);
    this.sql.exec('CREATE INDEX IF NOT EXISTS idx_updates_created ON updates (created_at)');
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    const authResult = await this.checkAuth(request);
    if (authResult !== null) return authResult;

    if (request.method === 'POST' && url.pathname.endsWith('/updates')) {
      return this.push(request);
    }
    if (request.method === 'GET' && url.pathname.endsWith('/updates')) {
      return this.pull(url);
    }
    if (request.method === 'DELETE' && url.pathname.endsWith('/vault')) {
      return this.destroy();
    }

    return json({ error: 'endpoint sconosciuto' }, 404);
  }

  /**
   * Verifica l'appartenenza al vault, con trust-on-first-use.
   *
   * Il primo client a scrivere registra l'hash del proprio token; i successivi devono
   * presentarne uno che produca lo stesso hash. Il relay non conosce mai la chiave di
   * cifratura: `authToken` è derivato con HKDF su un dominio separato, quindi averlo
   * non aiuta in alcun modo a decifrare i contenuti.
   *
   * Restituisce `null` se l'accesso è consentito, altrimenti la risposta di errore.
   */
  private async checkAuth(request: Request): Promise<Response | null> {
    const header = request.headers.get('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

    if (!AUTH_TOKEN_PATTERN.test(token)) {
      return json({ error: 'token di autenticazione mancante o malformato' }, 401);
    }

    const presented = await sha256Hex(token);
    const stored = await this.storage.get<string>('authHash');

    if (stored === undefined) {
      // Primo accesso al vault: si registra questo token come quello legittimo.
      await this.storage.put('authHash', presented);
      return null;
    }

    if (!timingSafeEqualHex(stored, presented)) {
      return json({ error: 'token non valido per questo vault' }, 403);
    }

    return null;
  }

  private async push(request: Request): Promise<Response> {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'corpo della richiesta non è JSON valido' }, 400);
    }

    if (
      typeof body !== 'object' ||
      body === null ||
      !Array.isArray((body as { blobs?: unknown }).blobs)
    ) {
      return json({ error: 'campo "blobs" mancante o non è un array' }, 400);
    }

    const blobs = (body as { blobs: unknown[] }).blobs;
    if (blobs.length === 0) {
      return json({ error: 'nessun blob da inserire' }, 400);
    }
    if (blobs.length > MAX_BLOBS_PER_REQUEST) {
      return json({ error: `massimo ${MAX_BLOBS_PER_REQUEST} blob per richiesta` }, 413);
    }

    const decoded: Uint8Array[] = [];
    for (const [index, entry] of blobs.entries()) {
      if (typeof entry !== 'string') {
        return json({ error: `blob ${index}: atteso base64, ricevuto ${typeof entry}` }, 400);
      }
      let bytes: Uint8Array;
      try {
        bytes = base64ToBytes(entry);
      } catch {
        return json({ error: `blob ${index}: base64 non valido` }, 400);
      }
      if (bytes.length === 0) {
        return json({ error: `blob ${index}: vuoto` }, 400);
      }
      if (bytes.length > MAX_BLOB_BYTES) {
        return json({ error: `blob ${index}: supera ${MAX_BLOB_BYTES} byte` }, 413);
      }
      decoded.push(bytes);
    }

    // Tutti i blob sono validati prima di scriverne uno solo: un inserimento parziale
    // lascerebbe il client incerto su quali siano stati accettati.
    const now = Date.now();
    for (const bytes of decoded) {
      this.sql.exec('INSERT INTO updates (blob, created_at) VALUES (?, ?)', bytes, now);
    }

    this.pruneExpired(now);

    const response: PushResponse = { head: this.head(), accepted: decoded.length };
    return json(response, 200);
  }

  private pull(url: URL): Response {
    const sinceParam = url.searchParams.get('since') ?? '0';
    const since = Number(sinceParam);
    if (!Number.isInteger(since) || since < 0) {
      return json({ error: '"since" deve essere un intero non negativo' }, 400);
    }

    // `SqlStorageValue` non include `Uint8Array`: i BLOB tornano come `ArrayBuffer`.
    // Si usa `toArray()` invece di `raw()` per accedere alle colonne per nome, così
    // un cambio nell'ordine della SELECT non produce silenziosamente valori scambiati.
    const rows = this.sql
      .exec<{
        seq: number;
        blob: ArrayBuffer;
      }>(
        'SELECT seq, blob FROM updates WHERE seq > ? ORDER BY seq ASC LIMIT ?',
        since,
        MAX_UPDATES_PER_RESPONSE + 1,
      )
      .toArray();

    // Si richiede un elemento in più del limite: se arriva, significa che ce ne sono
    // altri e il client deve richiamare con il nuovo cursore.
    const hasMore = rows.length > MAX_UPDATES_PER_RESPONSE;
    const page = hasMore ? rows.slice(0, MAX_UPDATES_PER_RESPONSE) : rows;

    const response: PullResponse = {
      updates: page.map((row) => ({
        seq: row.seq,
        blob: bytesToBase64(new Uint8Array(row.blob)),
      })),
      head: this.head(),
      hasMore,
    };
    return json(response, 200);
  }

  /** Cancella l'intero vault. Irreversibile. */
  private async destroy(): Promise<Response> {
    await this.storage.deleteAll();

    // `deleteAll()` su un Durable Object con backend SQLite **elimina anche le
    // tabelle**, non solo le chiavi. Lo schema viene creato nel costruttore, che però
    // non viene rieseguito finché l'istanza resta viva: senza ricrearlo qui, ogni
    // richiesta successiva a questo vault fallirebbe con `no such table` — cioè una
    // cancellazione romperebbe il vault in modo permanente.
    //
    // Trovato da un test nel runtime reale; con dei mock sarebbe passato inosservato.
    this.ensureSchema();

    return json({ deleted: true }, 200);
  }

  private head(): number {
    // `MAX(seq)` su una tabella vuota restituisce NULL, non 0.
    const rows = this.sql
      .exec<{ head: number | null }>('SELECT MAX(seq) AS head FROM updates')
      .toArray();
    return rows[0]?.head ?? 0;
  }

  /**
   * Elimina gli update più vecchi del TTL.
   *
   * Il relay è una cache di transito, non un archivio: lo stato completo vive su ogni
   * dispositivo. Un client rimasto offline oltre il TTL recupera comunque tutto dal
   * partner alla prima sincronizzazione diretta.
   */
  private pruneExpired(now: number): void {
    this.sql.exec('DELETE FROM updates WHERE created_at < ?', now - UPDATE_TTL_DAYS * MS_PER_DAY);
  }
}

/* -------------------------------------------------------------------------- */
/* Utilità                                                                     */
/* -------------------------------------------------------------------------- */

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Confronto a tempo costante fra due stringhe esadecimali.
 *
 * Un `===` esce al primo carattere diverso, e la differenza di tempo rivela quanti
 * caratteri iniziali erano corretti: abbastanza per ricostruire il valore un carattere
 * alla volta.
 */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function base64ToBytes(input: string): Uint8Array {
  const binary = atob(input);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  // A blocchi: `String.fromCharCode(...bytes)` su un blob da 1 MB supererebbe il
  // limite di argomenti dello stack.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}
