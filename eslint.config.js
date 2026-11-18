import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
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
      'no-restricted-imports': [
        'error',
        {
          patterns: [{ group: ['@/features/*/*'], message: 'Import a feature through its top-level files.' }],
        },
      ],
    },
  },
  // Dev scripts and contract tests run on Node, not in the browser.
  { files: ['scripts/**/*.ts', 'contract/**/*.ts'], languageOptions: { globals: globals.node } },
)
