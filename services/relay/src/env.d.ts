/**
 * Binding del Worker.
 *
 * `cloudflare:test` tipizza `env` come `Cloudflare.Env`, il namespace globale che
 * `wrangler types` genera di norma. Dichiarandolo qui, i binding restano definiti in un
 * unico posto: `src/index.ts` riesporta questo tipo invece di duplicarne la forma.
 *
 * Deve restare coerente con `wrangler.toml`.
 */
declare namespace Cloudflare {
  interface Env {
    VAULT_ROOM: DurableObjectNamespace;
  }
}
