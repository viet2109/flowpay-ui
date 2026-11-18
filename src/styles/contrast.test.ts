import { describe, expect, test } from 'vitest'
import designSystem from '../../docs/design-system.md?raw'
import css from './globals.css?raw'

/**
 * WCAG 2.2 contrast audit of the colour tokens, read from globals.css.
 *
 * Every text/background pair the components actually use is listed here with
 * its minimum: 4.5:1 for text (1.4.3, the dashboard has no large display text
 * to exempt), 3:1 for non-text indicators (1.4.11). The table in
 * docs/design-system.md §4.1 must match these numbers, so a token change
 * updates the docs in the same commit.
 */

type Theme = 'light' | 'dark'
/** A token name as Tailwind spells it (`ink-3`, `success-soft`), or a translucent fill over another. */
type Background = string | { token: string; alpha: number; over: string }

interface Pair {
  fg: string
  bg: Background
  use: string
  min: 4.5 | 3
}

const TONES = ['success', 'danger', 'warning', 'refund', 'progress', 'neutral'] as const

const PAIRS: Pair[] = [
  ...(
    [
      ['ink', 'Primary text'],
      ['ink-2', 'Secondary text'],
      ['ink-3', 'Labels, metadata, placeholders'],
    ] as const
  ).flatMap(([fg, use]) =>
    ['canvas', 'surface', 'surface-sunken', 'surface-hover'].map(
      (bg) => ({ fg, bg, use, min: 4.5 }) as const,
    ),
  ),
  { fg: 'accent', bg: 'canvas', use: 'Links', min: 4.5 },
  { fg: 'accent', bg: 'surface', use: 'Links', min: 4.5 },
  { fg: 'ink', bg: 'accent-soft', use: 'Selected text', min: 4.5 },
  { fg: 'ink-inverse', bg: 'ink', use: 'Primary button', min: 4.5 },
  { fg: 'ink-inverse', bg: 'danger', use: 'Danger button', min: 4.5 },
  { fg: 'sim-ink', bg: { token: 'sim', alpha: 0.1, over: 'canvas' }, use: 'Test mode badge', min: 4.5 },
  ...TONES.flatMap((tone) => [
    { fg: tone, bg: `${tone}-soft`, use: 'Status badge', min: 4.5 } as const,
    { fg: tone, bg: 'surface', use: 'Status text, field errors', min: 4.5 } as const,
  ]),
  { fg: 'accent', bg: 'canvas', use: 'Focus ring, active nav marker', min: 3 },
  { fg: 'accent', bg: 'surface', use: 'Focus ring, active nav marker', min: 3 },
]

function readTheme(selector: string): Record<string, string> {
  const body = new RegExp(`^${selector} \\{([^}]*)\\}`, 'm').exec(css)?.[1]
  if (!body) throw new Error(`No ${selector} block in globals.css`)
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/g)].map((m) => [m[1], m[2]]))
}

const THEMES: Record<Theme, Record<string, string>> = {
  light: readTheme(':root'),
  dark: readTheme('\\.dark'),
}

/** Tailwind token name → CSS variable (tones are `--tone-<name>-fg|bg`). */
function cssVar(token: string): string {
  const tone = /^(\w+?)(-soft)?$/.exec(token)
  const name = tone?.[1]
  if (name && (TONES as readonly string[]).includes(name)) return `tone-${name}-${tone[2] ? 'bg' : 'fg'}`
  return token
}

type Rgb = [r: number, g: number, b: number]

function rgb(theme: Theme, token: string): Rgb {
  const hex = THEMES[theme][cssVar(token)]
  if (!hex) throw new Error(`Token ${token} is not defined for ${theme}`)
  const channel = (at: number) => parseInt(hex.slice(at, at + 2), 16)
  return [channel(1), channel(3), channel(5)]
}

function background(theme: Theme, bg: Background): Rgb {
  if (typeof bg === 'string') return rgb(theme, bg)
  const [tr, tg, tb] = rgb(theme, bg.token)
  const [ur, ug, ub] = rgb(theme, bg.over)
  const blend = (top: number, under: number) => under + (top - under) * bg.alpha
  return [blend(tr, ur), blend(tg, ug), blend(tb, ub)]
}

function luminance([r, g, b]: Rgb): number {
  const channel = (c: number) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrast(theme: Theme, { fg, bg }: Pair): number {
  const a = luminance(rgb(theme, fg))
  const b = luminance(background(theme, bg))
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

function label({ fg, bg }: Pair): string {
  const backdrop =
    typeof bg === 'string' ? `\`${bg}\`` : `\`${bg.token}\` ${bg.alpha * 100}% over \`${bg.over}\``
  return `\`${fg}\` on ${backdrop}`
}

/** Rows as cell arrays, the shape of the §4.1 table once Prettier's padding is trimmed. */
const expectedRows = PAIRS.map((pair) => [
  label(pair),
  pair.use,
  contrast('light', pair).toFixed(2),
  contrast('dark', pair).toFixed(2),
  `${pair.min}:1`,
])

function documentedRows(): string[][] {
  const table = /<!-- contrast:start -->([\s\S]*?)<!-- contrast:end -->/.exec(designSystem)?.[1] ?? ''
  return table
    .split('\n')
    .filter((line) => line.startsWith('|'))
    .slice(2) // header and separator
    .map((line) =>
      line
        .slice(1, -1)
        .split('|')
        .map((cell) => cell.trim()),
    )
}

describe('colour token contrast', () => {
  test.each(['light', 'dark'] as const)('every pair meets its WCAG minimum in %s', (theme) => {
    const failures = PAIRS.filter((pair) => contrast(theme, pair) < pair.min).map(
      (pair) => `${label(pair)} (${pair.use}): ${contrast(theme, pair).toFixed(2)} < ${pair.min}`,
    )
    expect(failures).toEqual([])
  })

  test('docs/design-system.md §4.1 lists the current ratios', () => {
    const table = [
      '| Pair | Used for | Light | Dark | Min |',
      '| --- | --- | --: | --: | --: |',
      ...expectedRows.map((row) => `| ${row.join(' | ')} |`),
    ].join('\n')
    expect(documentedRows(), `Replace the table between the contrast markers with:\n\n${table}\n`).toEqual(
      expectedRows,
    )
  })
})
