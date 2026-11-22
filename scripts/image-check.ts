/**
 * Checks the dashboard image the way it runs in production (docs/deployment.md).
 *
 *   npm run test:image        builds flowpay-dashboard:check, then runs this
 *
 * 1. Against a recording upstream: security and cache headers, SPA fallback, a 404
 *    (never index.html) for a missing asset, GET-only static files, forwarded
 *    headers stripped, edge request IDs, /api outside /api/v1 refused, auth rate limit.
 * 2. Against the local backend (docs/local-stack.md), when it is up: a real browser
 *    signs in through the image (refresh cookie included), opens every page and runs
 *    a form validation, with no CSP violation and no console error.
 *
 * Needs Docker. IMAGE overrides the image; SEED_API_URL the backend origin.
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createServer, type IncomingHttpHeaders } from 'node:http'
import type { AddressInfo } from 'node:net'
import { chromium } from '@playwright/test'
import { BROWSER_CHANNEL } from '../e2e/browser.ts'

const IMAGE = process.env.IMAGE ?? 'flowpay-dashboard:check'
const BACKEND = (process.env.SEED_API_URL ?? 'http://localhost:8080').replace(/\/$/, '')
const REQUEST_ID = /^[0-9a-f]{32}$/

let failures = 0
async function check(name: string, run: () => Promise<void>) {
  try {
    await run()
    console.log(`  ok    ${name}`)
  } catch (error) {
    failures++
    console.log(
      `  FAIL  ${name}\n        ${String(error instanceof Error ? error.message : error).replace(/\n/g, '\n        ')}`,
    )
  }
}

const docker = (...args: string[]) => execFileSync('docker', args, { encoding: 'utf8' }).trim()

// The host as seen from a container, as one IPv4 address. host.docker.internal also has
// an IPv6 address, and NGINX would use both in turn (a 502 for each request sent to the
// address nothing listens on, since a failed request is never retried).
const HOST = docker(
  'run',
  '--rm',
  '--add-host=host.docker.internal:host-gateway',
  '--entrypoint',
  'getent',
  IMAGE,
  'ahostsv4',
  'host.docker.internal',
).split(/\s+/)[0]

async function startImage(upstream: string) {
  const id = docker(
    'run',
    '-d',
    '--rm',
    '--add-host=host.docker.internal:host-gateway',
    '-p',
    '127.0.0.1::8080',
    '-e',
    `FLOWPAY_API_UPSTREAM=${upstream}`,
    IMAGE,
  )
  const port = docker('port', id, '8080/tcp').split('\n')[0]!.split(':').pop()
  const origin = `http://localhost:${port}`
  const stop = () => void docker('rm', '-f', id)
  for (let i = 0; i < 50; i++) {
    if (
      await fetch(`${origin}/`).then(
        (r) => r.ok,
        () => false,
      )
    )
      return { origin, stop }
    await new Promise((r) => setTimeout(r, 200))
  }
  const logs = execFileSync('docker', ['logs', id], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  stop()
  throw new Error(`the image did not serve / within 10 s:\n${logs}`)
}

// --- 1. Edge behaviour -------------------------------------------------------------
async function edgeChecks() {
  const seen: { url: string; headers: IncomingHttpHeaders }[] = []
  const upstream = createServer((req, res) => {
    seen.push({ url: req.url!, headers: req.headers })
    // Read the body first: answering before it is consumed resets the connection.
    req.resume().on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json', 'X-Request-Id': 'set-by-upstream' })
      res.end('{"data":{}}')
    })
  })
  await new Promise<void>((r) => upstream.listen(0, '0.0.0.0', r))
  const { port } = upstream.address() as AddressInfo
  const { origin, stop } = await startImage(`${HOST}:${port}`)
  console.log(`Edge checks (${IMAGE} on ${origin}, recording upstream on :${port})`)

  try {
    const index = await fetch(`${origin}/`)
    const html = await index.text()

    await check('index.html: no-cache, CSP with the inline script hash, security headers', async () => {
      assert.equal(index.status, 200)
      assert.match(index.headers.get('content-type') ?? '', /text\/html/)
      assert.equal(index.headers.get('cache-control'), 'no-cache')
      const csp = index.headers.get('content-security-policy') ?? ''
      assert.match(csp, /script-src 'self' 'sha256-[A-Za-z0-9+/]+=*'/)
      assert.match(csp, /frame-ancestors 'none'/)
      assert.doesNotMatch(csp, /unsafe-eval/)
      assert.equal(index.headers.get('x-content-type-options'), 'nosniff')
      assert.equal(index.headers.get('referrer-policy'), 'no-referrer')
      assert.equal(index.headers.get('x-frame-options'), 'DENY')
      assert.equal(index.headers.get('strict-transport-security'), null, 'no HSTS over plain HTTP')
      assert.equal(index.headers.get('server'), 'nginx', 'no version in Server')
      assert.match(index.headers.get('x-request-id') ?? '', REQUEST_ID)
    })

    await check('a client-side route (deep link with a query) returns the app', async () => {
      const res = await fetch(`${origin}/payments/pi_01TEST?status=FAILED`)
      assert.equal(res.status, 200)
      assert.equal(await res.text(), html)
      assert.equal(res.headers.get('cache-control'), 'no-cache')
    })

    await check('hashed assets: gzip, cached for a year as immutable, with security headers', async () => {
      const entry = html.match(/src="(\/assets\/index-[^"]+\.js)"/)?.[1]
      assert.ok(entry, 'entry script in index.html')
      const res = await fetch(`${origin}${entry}`, { headers: { 'Accept-Encoding': 'gzip' } })
      assert.equal(res.status, 200)
      assert.match(res.headers.get('content-type') ?? '', /javascript/)
      assert.equal(res.headers.get('content-encoding'), 'gzip')
      assert.equal(res.headers.get('cache-control'), 'public, max-age=31536000, immutable')
      assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
    })

    await check('a missing asset is a 404, never index.html', async () => {
      const res = await fetch(`${origin}/assets/index-removed0.js`)
      assert.equal(res.status, 404)
      assert.notEqual(await res.text(), html)
    })

    await check('static files are GET only', async () => {
      assert.equal((await fetch(`${origin}/`, { method: 'POST' })).status, 403)
      assert.equal((await fetch(`${origin}/assets/x.js`, { method: 'PUT' })).status, 403)
    })

    await check(
      'API: forwarded headers stripped, fixed Host, edge request ID, backend headers kept',
      async () => {
        const before = seen.length
        const res = await fetch(`${origin}/api/v1/merchant/payments?size=1&status=FAILED`, {
          headers: {
            'X-Forwarded-For': '203.0.113.9',
            Forwarded: 'for=203.0.113.9;proto=https',
            'X-Real-IP': '203.0.113.9',
            'X-Forwarded-Host': 'evil.example',
            'X-Forwarded-Proto': 'https',
            'X-Original-URL': '/api/v1/admin',
            'X-Request-Id': 'chosen-by-client',
          },
        })
        assert.equal(res.status, 200)
        assert.equal(seen.length, before + 1)
        const got = seen.at(-1)!
        assert.equal(got.url, '/api/v1/merchant/payments?size=1&status=FAILED')
        assert.equal(got.headers.host, 'flowpay.internal')
        for (const name of [
          'x-forwarded-for',
          'forwarded',
          'x-real-ip',
          'x-forwarded-host',
          'x-forwarded-proto',
          'x-original-url',
        ]) {
          assert.equal(got.headers[name], undefined, `${name} reached the backend`)
        }
        const id = got.headers['x-request-id']
        assert.match(String(id), REQUEST_ID)
        assert.equal(res.headers.get('x-request-id'), id, 'client sees the edge request ID')
        assert.equal(
          res.headers.get('content-security-policy'),
          null,
          'API responses keep the backend headers',
        )
      },
    )

    await check('/api outside /api/v1 never reaches the backend or the app', async () => {
      const before = seen.length
      for (const path of ['/api/v2/payments', '/api/internal', '/api/']) {
        const res = await fetch(`${origin}${path}`)
        assert.equal(res.status, 404, path)
        assert.notEqual(await res.text(), html, `${path} returned the app`)
      }
      assert.equal(seen.length, before)
    })

    await check('auth is rate limited per client (burst 5) with the backend problem body', async () => {
      const statuses: number[] = []
      let limited: Response | undefined
      for (let i = 0; i < 8; i++) {
        const res = await fetch(`${origin}/api/v1/auth/login`, { method: 'POST', body: '{}' })
        statuses.push(res.status)
        if (res.status === 429 && !limited) limited = res
        else await res.arrayBuffer()
      }
      assert.deepEqual(statuses.slice(0, 6), [200, 200, 200, 200, 200, 200], statuses.join(' '))
      assert.ok(limited, `no 429 in ${statuses.join(' ')}`)
      assert.equal(limited.headers.get('content-type'), 'application/problem+json')
      assert.equal(limited.headers.get('retry-after'), '60')
      const body = (await limited.json()) as { code: string; requestId: string }
      assert.equal(body.code, 'RATE_LIMIT_EXCEEDED')
      assert.equal(body.requestId, limited.headers.get('x-request-id'))
    })
  } finally {
    stop()
    upstream.close()
  }
}

// --- 2. The app in a browser, through the image, against the real backend ----------
async function browserChecks() {
  // /livez in production profiles, /actuator/health in dev (where /livez needs auth).
  const probe = (path: string) =>
    fetch(`${BACKEND}${path}`).then(
      (r) => r.ok,
      () => false,
    )
  const up = (await probe('/livez')) || (await probe('/actuator/health'))
  if (!up) {
    console.log(`Browser checks skipped: no backend at ${BACKEND} (docs/local-stack.md).`)
    return
  }
  // Registered straight on the backend, so the image's auth rate limit is left for the app.
  const email = `image-check+${Date.now().toString(36)}@example.com`
  const password = 'FlowPay-image-2026'
  const registered = await fetch(`${BACKEND}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-FlowPay-CSRF': '1' },
    body: JSON.stringify({
      email,
      password,
      firstName: 'Image',
      lastName: 'Check',
      merchantName: 'Image check',
    }),
  })
  assert.equal(registered.status, 201, 'register')

  const backendPort = new URL(BACKEND).port || '80'
  const { origin, stop } = await startImage(`${HOST}:${backendPort}`)
  console.log(`Browser checks (${origin} -> backend ${BACKEND})`)
  const browser = await chromium.launch({ channel: BROWSER_CHANNEL })
  try {
    const context = await browser.newContext({ locale: 'en-US', colorScheme: 'dark' })
    const page = await context.newPage()
    const violations: string[] = []
    const errors: string[] = []
    let signedIn = false
    await page.exposeFunction('__cspViolation', (v: string) => violations.push(v))
    // Page-side code as strings: this script is type-checked for Node, without the DOM.
    await page.addInitScript({
      content: `document.addEventListener('securitypolicyviolation', (e) =>
        window.__cspViolation(e.violatedDirective + ' blocked ' + (e.blockedURI || 'inline') + ' (' + e.sourceFile + ':' + e.lineNumber + ')'))`,
    })
    // Before sign-in the start-up session refresh is expected to answer 401.
    page.on('console', (m) => m.type() === 'error' && signedIn && errors.push(m.text()))
    page.on('pageerror', (e) => errors.push(e.message))

    await check('the inline theme script runs (dark scheme applied before the app)', async () => {
      await page.goto(`${origin}/login`)
      assert.equal(await page.evaluate('document.documentElement.classList.contains("dark")'), true)
    })

    await check('signs in through the image and stays signed in across a reload', async () => {
      await page.getByLabel('Email').fill(email)
      await page.getByLabel('Password', { exact: true }).fill(password)
      await page.getByRole('button', { name: 'Sign in' }).click()
      await page.getByRole('heading', { level: 1, name: 'Overview' }).waitFor()
      signedIn = true
      await page.reload()
      await page.getByRole('heading', { level: 1, name: 'Overview' }).waitFor()
    })

    await check('every page opens (client-side navigation)', async () => {
      const link = (name: string) =>
        page.getByRole('link', { name, exact: true }).filter({ visible: true }).first()
      for (const [name, heading] of [
        ['Payments', 'Payments'],
        ['API keys', 'API keys'],
        ['Webhooks', 'Webhooks'],
        ['Settings', 'Settings'],
        ['Overview', 'Overview'],
      ] as const) {
        await link(name).click()
        await page.getByRole('heading', { level: 1, name: heading }).waitFor()
      }
    })

    await check('a form validates under the CSP (zod without eval)', async () => {
      await page
        .getByRole('link', { name: 'API keys', exact: true })
        .filter({ visible: true })
        .first()
        .click()
      await page.getByRole('button', { name: 'Create key' }).first().click()
      const dialog = page.getByRole('dialog')
      await dialog.getByRole('button', { name: 'Create key' }).click()
      await dialog.getByText('Required.').waitFor()
      await page.keyboard.press('Escape')
    })

    await check('no CSP violation and no console error', async () => {
      assert.deepEqual(violations, [])
      assert.deepEqual(errors, [])
    })
  } finally {
    await browser.close()
    stop()
  }
}

await edgeChecks()
await browserChecks()
if (failures) {
  console.log(`\n${failures} check(s) failed.`)
  process.exit(1)
}
console.log('\nImage checks passed.')
