/**
 * Checks the production build against the bundle budget (docs/architecture.md).
 * Run after `npm run build`: `npm run budget`. Exits 1 when a limit is exceeded.
 *
 * "Initial JS" is what every visit downloads before the first page renders: the
 * entry script plus every chunk index.html preloads. Route chunks load on demand.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const BUDGET = {
  /** Entry + preloaded chunks, gzip. */
  initialGzipKb: 230,
  /** Any single chunk loaded on demand (a route, a dialog), gzip. */
  lazyChunkGzipKb: 45,
}

const DIST = 'dist'
const kb = (bytes: number) => bytes / 1024
const gzip = (file: string) => gzipSync(readFileSync(join(DIST, file))).length

const html = readFileSync(join(DIST, 'index.html'), 'utf8')
const initial = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.js)"/g)].map((m) => m[1] as string)
const all = readdirSync(join(DIST, 'assets'))
  .filter((f) => f.endsWith('.js'))
  .map((f) => `assets/${f}`)
const lazy = all.filter((f) => !initial.includes(f))

const rows = (files: string[]) =>
  files.map((f) => ({ f, raw: readFileSync(join(DIST, f)).length, gz: gzip(f) })).sort((a, b) => b.gz - a.gz)

const initialRows = rows(initial)
const initialGz = initialRows.reduce((sum, r) => sum + r.gz, 0)
const initialRaw = initialRows.reduce((sum, r) => sum + r.raw, 0)

console.log('Initial JS (every visit):')
for (const r of initialRows)
  console.log(`  ${kb(r.raw).toFixed(1).padStart(7)} kB  ${kb(r.gz).toFixed(1).padStart(6)} kB gz  ${r.f}`)
console.log(
  `  ${kb(initialRaw).toFixed(1).padStart(7)} kB  ${kb(initialGz).toFixed(1).padStart(6)} kB gz  total`,
)

const lazyRows = rows(lazy)
console.log('\nLargest on-demand chunks:')
for (const r of lazyRows.slice(0, 6))
  console.log(`  ${kb(r.raw).toFixed(1).padStart(7)} kB  ${kb(r.gz).toFixed(1).padStart(6)} kB gz  ${r.f}`)

const failures = [
  ...(kb(initialGz) > BUDGET.initialGzipKb
    ? [`initial JS ${kb(initialGz).toFixed(1)} kB gz > ${BUDGET.initialGzipKb} kB`]
    : []),
  ...lazyRows
    .filter((r) => kb(r.gz) > BUDGET.lazyChunkGzipKb)
    .map((r) => `${r.f} ${kb(r.gz).toFixed(1)} kB gz > ${BUDGET.lazyChunkGzipKb} kB`),
]
if (failures.length) {
  console.error(`\nOver budget:\n  ${failures.join('\n  ')}`)
  process.exit(1)
}
console.log(
  `\nWithin budget (initial ≤ ${BUDGET.initialGzipKb} kB gz, on-demand chunks ≤ ${BUDGET.lazyChunkGzipKb} kB gz).`,
)
