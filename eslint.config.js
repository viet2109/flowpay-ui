import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const FEATURE_INTERNALS = [
  { group: ['@/features/*/*'], message: 'Import a feature through its top-level files.' },
]

const useFormatMessage = 'Use useFormat() from @/i18n so the value follows the UI language.'
const LOCALE_FORMATTERS = [
  {
    name: '@/lib/format',
    importNames: ['formatDateTime', 'formatShortDate', 'formatRelative', 'formatDuration'],
    message: useFormatMessage,
  },
  { name: '@/lib/money', importNames: ['formatMinor', 'formatNumber'], message: useFormatMessage },
]

// Schemas take z from lib/zod, which keeps zod from probing eval under the production CSP.
const ZOD = [{ name: 'zod', message: "Import { z } from '@/lib/zod'." }]

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'test-results', 'playwright-report', 'shots'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2023, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Features talk to each other through their public files, never deep internals.
      // Display formatters come from useFormat(), which re-renders on a language change.
      'no-restricted-imports': [
        'error',
        { patterns: FEATURE_INTERNALS, paths: [...LOCALE_FORMATTERS, ...ZOD] },
      ],
      // An effect may only return a cleanup function. Expression bodies return
      // whatever the call returns (window.scrollTo returns a Promise in Chromium),
      // which crashes React at unmount with "destroy is not a function".
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'CallExpression[callee.name=/^use(Layout|Insertion)?Effect$/] > ArrowFunctionExpression[expression=true]',
          message: 'Give effects a block body: `useEffect(() => { doThing() }, deps)`.',
        },
      ],
    },
  },
  // The formatters' own home, the hook that wraps them, and tests may call them directly.
  {
    files: ['src/lib/**', 'src/i18n/**', '**/*.test.{ts,tsx}', 'contract/**', 'e2e/**', 'scripts/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: FEATURE_INTERNALS }] },
  },
  // Dev scripts and contract tests run on Node, not in the browser.
  {
    files: [
      'scripts/**/*.ts',
      'contract/**/*.ts',
      'e2e/**/*.ts',
      'playwright.config.ts',
      'playwright.retries.config.ts',
    ],
    languageOptions: { globals: globals.node },
  },
)
