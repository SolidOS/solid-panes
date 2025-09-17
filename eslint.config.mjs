import tseslintPlugin from '@typescript-eslint/eslint-plugin'
import globals from 'globals'
import tsParser from '@typescript-eslint/parser'
import neostandard from 'neostandard'

export default [
  ...neostandard(),
  {
    ignores: [
      'dist/**',
      'test/**',
      'docs/**',
      'node_modules/**',
      'dev/**',
      'coverage/**',
    ],
  },
  {
    files: ['src/**/*.js', 'src/**/*.ts', 'src/**/*.cjs', 'src/**/*.mjs'],
    plugins: {
      '@typescript-eslint': tseslintPlugin,
    },

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
      },
      parser: tsParser,
    },
    rules: {
      semi: ['error', 'never'],
      quotes: ['error', 'single'],
      'no-unused-vars': 'off', // handled by TS
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }]
    }
  }
]
