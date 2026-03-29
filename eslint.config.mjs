import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: await import('typescript-eslint').then((m) => m.default.parser),
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': 'off',
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'server/'],
  },
]);
