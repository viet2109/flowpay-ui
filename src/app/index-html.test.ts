import { describe, expect, it } from 'vitest'
import staticHeaders from '../../deploy/nginx/flowpay/static-headers.conf?raw'
import indexHtml from '../../index.html?raw'

// The production CSP allows index.html's inline theme script by its hash
// (deploy/nginx/flowpay/static-headers.conf). Editing the script without updating the
// hash would block it in production only: the theme would flash on every load.
async function sha256(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
}

describe('index.html under the production CSP', () => {
  it('lists the hash of every inline script', async () => {
    const scripts = [...indexHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]!)
    expect(scripts).toHaveLength(1)
    for (const script of scripts) {
      const hash = `'sha256-${await sha256(script)}'`
      expect(staticHeaders, `add ${hash} to script-src`).toContain(hash)
    }
  })
})
