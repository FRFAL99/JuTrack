import { defineConfig } from 'vitest/config';
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';

/**
 * I test girano dentro workerd, il runtime reale dei Workers, con Durable Object e
 * storage SQLite veri.
 *
 * Con dei mock si verificherebbe solo la nostra idea di come si comporta un Durable
 * Object — proprio la parte che non conosciamo e che vogliamo mettere alla prova.
 *
 * Nota sull'API: dalla 0.20 (per vitest 4) `@cloudflare/vitest-pool-workers` non espone
 * più `defineWorkersConfig` da `./config`; si usa il plugin `cloudflareTest`. Il package
 * include un codemod `vitest-v3-to-v4` che documenta la migrazione.
 */
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.toml' },
      // Ogni file di test parte da uno storage pulito: senza, il vault creato da un
      // test resterebbe visibile a quello successivo.
      isolatedStorage: true,
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
