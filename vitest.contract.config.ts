import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * Contract tests run against a real backend (docs/local-stack.md), so they are
 * kept out of the unit run: `npm run test:contract`.
 */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['contract/**/*.contract.ts'],
    environment: 'node',
    globals: false,
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 90_000,
  },
})
