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
        },
      ],
    },
  },
);
