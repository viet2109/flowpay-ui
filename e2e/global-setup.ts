import { seed } from '../scripts/seed.ts'

const API = (process.env.SEED_API_URL ?? 'http://localhost:8080').replace(/\/$/, '')

/**
 * Runs once per `playwright test`: checks the backend is up, then seeds a fresh
 * merchant with every UI state (scripts/seed.ts). Workers read the result from
 * E2E_SEED; it is kept in memory only, never written to disk.
 */
export default async function globalSetup() {
  try {
    const health = await fetch(`${API}/actuator/health`)
    if (!health.ok) throw new Error(`HTTP ${health.status}`)
  } catch (error) {
    throw new Error(
      `Backend not reachable at ${API} (${error instanceof Error ? error.message : String(error)}). ` +
        'Start the local stack first: docs/local-stack.md.',
      { cause: error },
    )
  }
  const seeded = await seed({ quiet: true, receiverPort: 0 })
  process.env.E2E_SEED = JSON.stringify(seeded)
}
