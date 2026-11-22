# Deploying the dashboard

The dashboard ships as one container image. NGINX serves the built app and proxies the
API, so the browser talks to a single origin:

```
browser ── https://dashboard.example ──> dashboard image (NGINX)
                                           ├─ /api/v1/*  ──> FlowPay backend (app:8080)
                                           └─ everything else: the built app (dist/)
```

The single origin is required, not a convenience. The backend issues a host-only
refresh cookie (HttpOnly, SameSite=Lax, Secure in production), keeps CORS closed and
denies auth preflights (backend `docs/api-security-review.md`). The dashboard cannot be
served from another origin unless that review is reopened.

## Build and run

```sh
docker build -t flowpay-dashboard .
docker run -p 8080:8080 -e FLOWPAY_API_UPSTREAM=app:8080 flowpay-dashboard
```

| Setting                | Default    | Meaning                                                            |
| ---------------------- | ---------- | ------------------------------------------------------------------ |
| `FLOWPAY_API_UPSTREAM` | `app:8080` | Backend `host:port`, filled into the NGINX upstream at start       |
| Port                   | `8080`     | Plain HTTP; see TLS below                                          |
| User                   | `101`      | Unprivileged (`nginxinc/nginx-unprivileged`), config owned by root |

The build stage runs `npm ci` and `npm run build`, so typecheck failures stop the
image. Base images are pinned by version and digest in the `Dockerfile`. Update both
together, and rerun the checks below.

**Vulnerabilities.** The runtime image is NGINX mainline, because the stable image
lagged behind NGINX's security releases. The build applies Alpine package updates
(`apk upgrade`) and removes `curl`, which nothing in the image uses. Packages can
therefore differ between two builds of the same commit. The scan below, rerun on
every CI build, is the check for that. `npm run scan:image` runs Grype, pinned, with a
fresh database, against `flowpay-dashboard:check`. It fails on any HIGH or CRITICAL
finding that has a fix. When it fails, update the base image digest. When the fix is
only in Alpine packages, rebuilding is enough.

**Upstream address.** Every address the upstream name resolves to must serve the API.
A failed request is not retried on another address (`proxy_next_upstream off`, as on
the backend's edge, so a payment is never sent twice). A name with an address nothing
listens on, such as an IPv6 entry for an IPv4-only service, fails every other request
with 502. The name is resolved once, at start: restart the container after the backend
address changes.

**Read-only root filesystem** works with two writable mounts:
`--read-only --tmpfs /tmp --tmpfs /etc/nginx/conf.d:uid=101,gid=101`. The second
receives the rendered upstream config.

**Health probe:** `GET /` returns the app (200) without touching the backend. Probe the
backend separately.

## The edge policy

`deploy/nginx/` holds the configuration:

- `nginx.conf`: limits, timeouts, gzip and rate-limit zones.
- `templates/flowpay.conf.template`: the routes.
- `flowpay/proxy.conf`: proxy headers.
- `flowpay/static-headers.conf`: headers on the app's own files.
- `flowpay/listen.conf`: the listener.

The API part copies the backend's reviewed edge (backend `ops/ingress`) exactly. If one
changes, change the other.

- **Routes.** `/api/v1/auth/*` and `/api/v1/*` go to the backend. Any other `/api/*` is
  a 404 that neither reaches the backend nor returns the app.
- **Rate limits** are per client IP:
  - auth POSTs: 10 per minute, burst 5;
  - mutations: 10 per second, burst 20.
    A limited request gets the backend's `RATE_LIMIT_EXCEEDED` problem body and a
    `Retry-After` header. Limits key on the TCP peer, so this container must be the edge
    that clients connect to. Behind a load balancer every client would share one bucket.
    Never key them on forwarded headers.
- **Forwarded headers.** `Forwarded`, `X-Forwarded-*`, `X-Real-IP` and the rewrite
  headers sent by callers are removed. `Host` is fixed. `X-Request-Id` is generated
  here and returned to the client; a value sent by the client is replaced.

## Caching

| Path                       | `Cache-Control`                       | Why                                                             |
| -------------------------- | ------------------------------------- | --------------------------------------------------------------- |
| `/assets/*` (hashed names) | `public, max-age=31536000, immutable` | Content never changes under a name                              |
| everything else            | `no-cache`                            | `index.html` is revalidated, so a deploy shows on the next load |

A missing `/assets/*` file is a 404, never `index.html`. A tab opened before a deploy
may ask for a chunk the new build removed. It must fail visibly (the router shows its
error page with a reload), not try to run HTML as JavaScript. Text responses are
gzipped. The initial JavaScript is about 195 kB compressed (`npm run budget`).

## Security headers

These headers go on everything the dashboard serves itself. API responses keep the
backend's own headers.

- `Content-Security-Policy`:
  - `default-src 'self'`.
  - `script-src 'self'` plus the hash of the one inline script, the theme bootstrap in
    `index.html`. `src/app/index-html.test.ts` fails if the script changes without its
    hash.
  - `style-src 'self' 'unsafe-inline'`: components set style attributes, and the toast
    library injects its stylesheet.
  - No `'unsafe-eval'`: schemas use zod in jitless mode (`src/lib/zod.ts`; ESLint
    forbids importing `zod` directly).
  - `connect-src 'self'` and `frame-ancestors 'none'`.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Cross-Origin-Opener-Policy: same-origin`, and a `Permissions-Policy` that turns off
  camera, microphone, geolocation and payment.
- `Referrer-Policy: no-referrer`: dashboard URLs carry record IDs (`?delivery=`,
  `?refund=`).
- `Strict-Transport-Security` only when this container terminates TLS.

Code that adds an inline script, `eval`, a third-party origin (fonts, analytics, a CDN)
or an iframe needs a matching CSP change, and the image checks will flag it.

## TLS

Production refresh cookies are `Secure`, so browsers keep them only over HTTPS (or on
`http://localhost`). There are two ways to set this up:

- **Terminate TLS in this container.** Mount a replacement `/etc/flowpay/listen.conf`
  (the default file shows the lines) and the certificate files. HSTS is then sent
  automatically.
- **Terminate at a platform edge in front.** Keep the rate-limit caveat above in mind,
  and send HSTS from that edge.

## Checks

```sh
npm run test:image
```

This builds `flowpay-dashboard:check` and runs `scripts/image-check.ts`, which needs
Docker.

- **Edge behaviour, against a recording upstream:** headers, caching, SPA fallback,
  asset 404s, GET-only static files, forwarded-header stripping, request IDs, the
  `/api` boundary and the auth rate limit.
- **The app in a real browser, through the image, against the local backend**
  (`docs/local-stack.md`), when one is running: sign in, reload (refresh cookie through
  the edge), every page, a form validation, then no CSP violation and no console error.

```sh
npm run scan:image
```

Run it after `test:image`. It scans the built image for vulnerabilities (see
"Vulnerabilities" above). CI runs both checks on every push.
