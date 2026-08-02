/**
 * JuTrack relay — Cloudflare Worker.
 *
 * Instrada le richieste al Durable Object del vault indicato. Riceve blob cifrati e li
 * inoltra: non ha la chiave e non può leggerne il contenuto. Per il relay ogni payload
 * è una sequenza di byte opachi.
 *
 * Rotte:
 *   POST   /v1/vault/:vaultId/updates          { blobs: [base64] } → { head, accepted }
 *   GET    /v1/vault/:vaultId/updates?since=N  → { updates, head, hasMore }
 *   DELETE /v1/vault/:vaultId/vault            → { deleted: true }
 *   GET    /health                             → { ok: true }
 *   GET    /j                                  → pagina di atterraggio degli inviti
 */
import { INVITE_PATH, invitePage } from './invite-page';
import { VAULT_ID_PATTERN } from './protocol';

export { VaultRoom } from './vault-room';

/** Binding dichiarati in `src/env.d.ts`, coerenti con `wrangler.toml`. */
export type Env = Cloudflare.Env;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return json({ ok: true }, 200);
    }

    // Prima di qualunque instradamento verso un vault, e senza toccare `env`: la pagina
    // degli inviti è statica, e l'invito che la porta qui vive tutto nel fragment — che
    // il browser non ha mandato. Non c'è alcun vault da aprire per servirla.
    if (url.pathname === INVITE_PATH || url.pathname === `${INVITE_PATH}/`) {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return json({ error: 'metodo non consentito' }, 405);
      }
      return invitePage();
    }

    const match = /^\/v1\/vault\/([^/]+)\/(updates|vault)$/.exec(url.pathname);
    if (match === null) {
      return json({ error: 'endpoint sconosciuto' }, 404);
    }

    const vaultId = match[1] as string;
    if (!VAULT_ID_PATTERN.test(vaultId)) {
      // Il vaultId ha una forma fissa (32 esadecimali): rifiutare qui evita di
      // istanziare un Durable Object per ogni stringa arbitraria che qualcuno provi.
      return json({ error: 'vaultId malformato' }, 400);
    }

    // `idFromName` è deterministico: lo stesso vaultId raggiunge sempre la stessa
    // istanza, da qualunque dispositivo e senza alcun registro centrale.
    const id = env.VAULT_ROOM.idFromName(vaultId);
    return env.VAULT_ROOM.get(id).fetch(request);
  },
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
