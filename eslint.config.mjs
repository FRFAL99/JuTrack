import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.expo/**',
      '**/.wrangler/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // Regole degli hook solo sui componenti. exhaustive-deps intercetta le dipendenze
  // mancanti negli effetti, che in React Native si manifestano come stato stantio
  // difficile da diagnosticare a runtime.
  {
    files: ['apps/**/*.{ts,tsx}'],
    // .configs.flat.* è la variante flat config; .configs.recommended è ancora
    // in formato eslintrc e ESLint 10 la rifiuta.
    extends: [reactHooks.configs.flat.recommended],
  },
  // File di configurazione e shim in CommonJS, eseguiti da Node (Metro) e non dal
  // bundle dell'app: `require` e `module` sono legittimi qui.
  {
    files: ['**/metro.config.js', 'apps/**/src/platform/*-shim.js'],
    languageOptions: {
      globals: { require: 'readonly', module: 'writable', __dirname: 'readonly' },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-undef': 'off',
    },
  },
  prettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  // packages/core deve restare indipendente dalla piattaforma: è la condizione che
  // permetterà di riusarlo sul web senza modifiche. Finora era solo una convenzione
  // scritta nei commenti; qui diventa verificabile.
  //
  // I test sono esclusi: usano Buffer di proposito come implementazione di riferimento
  // indipendente per validare la nostra base64url.
  {
    files: ['packages/core/src/**/*.ts'],
    ignores: ['packages/core/src/**/*.test.ts', 'packages/core/src/**/testing.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'Buffer', message: 'Buffer non esiste in React Native. Usa Uint8Array.' },
        { name: 'window', message: 'packages/core non può dipendere da API del browser.' },
        { name: 'document', message: 'packages/core non può dipendere da API del browser.' },
        { name: 'localStorage', message: 'Usa SecureKeyStore per dependency injection.' },
        {
          name: 'TextEncoder',
          message: 'Richiederebbe il lib DOM. Usa utf8ToBytes da ./encoding.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react-native', 'react-native/*', 'expo', 'expo-*', 'node:*'],
              message:
                "packages/core deve restare indipendente dalla piattaforma. Definisci un'interfaccia in crypto/types.ts e inietta l'implementazione.",
            },
          ],
          paths: [
            {
              // `utf8ToBytes` di noble usa TextEncoder al proprio interno, e su Hermes
              // TextEncoder non esiste: Expo installa TextDecoder e TextEncoderStream,
              // ma non TextEncoder. Ha causato un crash all'avvio dell'app.
              // La nostra implementazione in crypto/encoding.ts non ne dipende.
              name: '@noble/hashes/utils.js',
              importNames: ['utf8ToBytes'],
              message:
                'utf8ToBytes di noble usa TextEncoder, assente su Hermes. Importa quello da crypto/encoding.',
            },
          ],
        },
      ],
    },
  },
  // L'app gira su **Hermes**, non su Node. Finché `apps/mobile/tsconfig.json` non ha
  // avuto bisogno di `types: ["node"]` — per `node:sqlite`, usato dal solo adattatore di
  // test — era il typecheck a rifiutare `Buffer` e compagnia, senza che nessuno lo avesse
  // deciso. Ora che i global di Node sono visibili, la guardia va scritta: altrimenti un
  // `Buffer` in una schermata compilerebbe e fallirebbe sul telefono.
  //
  // `TextEncoder` è nell'elenco per esperienza diretta: Expo installa `TextDecoder` ma
  // non `TextEncoder`, e la sua assenza ha già causato un crash all'avvio (devlog Step 3).
  {
    files: ['apps/mobile/src/**/*.{ts,tsx}'],
    ignores: ['apps/mobile/src/testing/**', 'apps/mobile/src/**/*.test.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'Buffer', message: 'Buffer non esiste su Hermes. Usa Uint8Array.' },
        {
          name: 'TextEncoder',
          message: 'Assente su Hermes. Usa utf8ToBytes da @jutrack/core.',
        },
        {
          name: '__dirname',
          message: 'Non esiste nel bundle React Native.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['node:*'],
              message:
                'I moduli di Node non esistono su Hermes. Sono ammessi solo in src/testing/ e nei test.',
            },
          ],
          paths: [
            {
              // Le due del core scrivono sempre all'italiana, perché il core non può
              // dipendere da i18next (regola dello Step 0). Quelle di `@/i18n/money` hanno
              // la stessa firma e in più sanno in che lingua siamo. Senza questa regola la
              // prossima chiamata scritta per abitudine tornerebbe a «1.234,56» in inglese,
              // e nessuno se ne accorgerebbe: il guasto è silenzioso, come lo era quello di
              // `utf8ToBytes` qui sopra.
              name: '@jutrack/core',
              importNames: ['formatCents', 'formatMoney'],
              message:
                'Importa formatCents/formatMoney da @/i18n/money: quelle del core non conoscono la lingua e scrivono sempre «1.234,56».',
            },
          ],
        },
      ],
    },
  },
  // L'unico file autorizzato a importare le due funzioni del core: è quello che le avvolge
  // aggiungendoci la lingua, quindi è per definizione l'eccezione alla regola qui sopra. Il
  // divieto su `node:*` va riscritto perché ridefinire `no-restricted-imports` sostituisce
  // l'intera opzione invece di aggiungersi.
  {
    files: ['apps/mobile/src/i18n/money.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['node:*'],
              message: 'I moduli di Node non esistono su Hermes.',
            },
          ],
        },
      ],
    },
  },
  // In fondo di proposito: nella flat config vince l'ultima regola che corrisponde al
  // file, quindi un override piazzato prima del blocco generale non avrebbe effetto.
  //
  // Script di verifica eseguiti a mano: il loro output *è* console.log.
  {
    files: ['**/scripts/**/*.mts'],
    rules: { 'no-console': 'off' },
  },
);
