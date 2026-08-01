import { defineConfig } from 'vitest/config';
import path from 'node:path';

// `import.meta.dirname` e non `__dirname`: quest'ultimo non esiste in ESM e verrà
// rifiutato dal loader nativo di Vite nelle prossime versioni.
const here = import.meta.dirname;

/**
 * Test della sola logica pura dell'app.
 *
 * Non è un ambiente React Native: qui si testano funzioni che non importano nulla da
 * `react-native` (raggruppamenti, formattazione date, calcoli). I componenti si
 * verificano sul dispositivo, dove i problemi veri si manifestano.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(here, 'src') },
  },
});
