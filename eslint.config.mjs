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
);
