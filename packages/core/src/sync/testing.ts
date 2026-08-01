import type { HttpClient, SyncCursorStore } from './types';

/** Cursore e coda in memoria, per i test. */
export class MemoryCursorStore implements SyncCursorStore {
  private cursor = 0;
  private pending: Uint8Array[] = [];

  async getCursor(): Promise<number> {
    return this.cursor;
  }
  async setCursor(seq: number): Promise<void> {
    this.cursor = seq;
  }
  async getPending(): Promise<Uint8Array[]> {
    return [...this.pending];
  }
  async setPending(updates: Uint8Array[]): Promise<void> {
    this.pending = [...updates];
  }
}

/**
 * Relay in memoria che riproduce il comportamento di quello reale.
 *
 * Replica i vincoli che contano per il client: log append-only, `since` esclusivo,
 * paginazione con `hasMore` e limite di blob per richiesta. Un fake più permissivo del
 * server vero darebbe test verdi e sincronizzazione rotta in produzione.
 */
export class FakeRelay implements HttpClient {
  private readonly blobs: string[] = [];

  /** Limiti allineati a quelli del relay reale. */
  readonly maxBlobsPerPush = 100;
  readonly maxUpdatesPerResponse = 200;

  /** Errore da restituire alla prossima richiesta, per simulare i guasti. */
  failNextWith: { status: number; body?: string } | null = null;
  /** Se valorizzato, ogni richiesta fallisce con questo stato. */
  failAllWith: { status: number; body?: string } | null = null;
  /** Richieste ricevute, per verificare che il client non ne faccia di superflue. */
  requests: { method: string; url: string }[] = [];

  async request(
    url: string,
    init: { method: 'GET' | 'POST'; headers: Record<string, string>; body?: string },
  ): Promise<{ status: number; text: () => Promise<string> }> {
    this.requests.push({ method: init.method, url });

    const failure = this.failAllWith ?? this.failNextWith;
    if (failure !== null) {
      this.failNextWith = null;
      return respond(failure.status, failure.body ?? JSON.stringify({ error: 'errore simulato' }));
    }

    if (!init.headers.authorization?.startsWith('Bearer ')) {
      return respond(401, JSON.stringify({ error: 'token mancante' }));
    }

    if (init.method === 'POST') {
      const body = JSON.parse(init.body ?? '{}') as { blobs?: string[] };
      const incoming = body.blobs ?? [];
      if (incoming.length > this.maxBlobsPerPush) {
        return respond(413, JSON.stringify({ error: 'troppi blob' }));
      }
      this.blobs.push(...incoming);
      return respond(200, JSON.stringify({ head: this.blobs.length, accepted: incoming.length }));
    }

    const since = Number(new URL(url, 'https://relay.test').searchParams.get('since') ?? '0');
    // `since` è esclusivo: il relay restituisce gli update con seq > since.
    const all = this.blobs.slice(since);
    const page = all.slice(0, this.maxUpdatesPerResponse);

    return respond(
      200,
      JSON.stringify({
        updates: page.map((blob, i) => ({ seq: since + i + 1, blob })),
        head: this.blobs.length,
        hasMore: all.length > this.maxUpdatesPerResponse,
      }),
    );
  }

  get storedCount(): number {
    return this.blobs.length;
  }

  /** Sostituisce un blob con dati non decifrabili, simulando corruzione o manomissione. */
  corruptAt(index: number): void {
    this.blobs[index] = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  }
}

function respond(status: number, body: string) {
  return { status, text: async () => body };
}
