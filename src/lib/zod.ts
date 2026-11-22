import { z } from 'zod'

// The production Content-Security-Policy has no 'unsafe-eval' (docs/deployment.md).
// Zod's fast path compiles validators with `new Function`. It falls back when eval is
// blocked, but the browser still reports the probe as a CSP violation. Jitless mode
// skips the probe. Every schema imports z from here, so the switch is on before the
// first parse.
z.config({ jitless: true })

export { z }
