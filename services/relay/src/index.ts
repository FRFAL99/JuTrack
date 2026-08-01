/**
 * JuTrack relay — Cloudflare Worker.
 *
 * Riceve blob cifrati e li inoltra. Non ha la chiave e non può leggerne il contenuto:
 * per il relay ogni payload è una sequenza di byte opachi.
 *
 * Implementazione nello Step 5.
 */

export default {
  async fetch(): Promise<Response> {
    return new Response('JuTrack relay — non ancora implementato\n', {
      status: 501,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  },
};
