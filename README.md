# FlowPay Dashboard

Merchant dashboard for the [FlowPay backend](https://github.com/viet2109/flowpay):
payments and refunds, API keys, webhook endpoints and delivery history, against the
payment simulator. Available in Vietnamese and English, in light and dark themes, on
desktop and phone.

## Run locally

Requirements: Node 22.22+ (CI and the image use 24.18.1), and the backend running
on `http://localhost:8080` (Postgres and RabbitMQ in Docker, `dev` profile).

```sh
npm install
npm run dev        # http://localhost:5173, proxies /api to the backend
```

Point the proxy elsewhere with `FLOWPAY_API_TARGET` (see `.env.example`). Full setup
(the backend's environment, seed data, webhook receiver, simulator outcomes) is in
[docs/local-stack.md](docs/local-stack.md).

First run:

1. Register a merchant. You are its owner.
2. **Payments → New test payment**. In the `dev` profile the amount picks the
   simulator's outcome: amounts ending in `901`, `902` or `903` (minor units) are
   declined, unknown or a technical failure. Other amounts get the default outcome:
   success, unless the backend's `PAYMENT_SIMULATOR_DEFAULT_OUTCOME` says otherwise.
3. **Developers → Webhooks → Add endpoint** to see signed deliveries and retries.
   Local receivers need the backend's `WEBHOOK_ALLOW_INSECURE_LOCALHOST=true`.
   `npm run receiver` starts one.

Or run `npm run seed` for a merchant that already has every state: payments in each
status, refunds, keys, endpoints and deliveries.

## Scripts

| Command                                 | What it does                                                                                   |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `npm run dev`                           | Dev server with HMR and API proxy                                                              |
| `npm run build`                         | Typecheck + production build to `dist/`                                                        |
| `npm run preview`                       | Serve the production build locally                                                             |
| `npm run verify`                        | Everything a change must pass: format check, typecheck, lint, unit tests, build, bundle budget |
| `npm run budget`                        | Initial JS and lazy chunk sizes against the budget (after a build)                             |
| `npm run typecheck` / `lint` / `format` | Static checks                                                                                  |
| `npm test` / `npm run test:run`         | Vitest (watch / once)                                                                          |
| `npm run seed`                          | Fill a new demo merchant with every UI state ([how](docs/local-stack.md#5-seed-data))          |
| `npm run receiver`                      | Local webhook receiver that verifies `FlowPay-Signature`                                       |
| `npm run test:contract`                 | Check every endpoint and type against the running backend                                      |
| `npm run e2e` / `npm run shots`         | Playwright behaviour and accessibility tests / review screenshots in `shots/`                  |
| `npm run e2e:retries`                   | Webhook retry path (backend with short retry delays, see local-stack)                          |
| `npm run test:image`                    | Build the production image and check it, in a browser too when the backend runs                |
| `npm run scan:image`                    | Vulnerability scan of the built image (fails on fixable HIGH/CRITICAL)                         |

`test:contract`, `e2e`, `shots` and `e2e:retries` need the local stack; the image
scripts need Docker.

## Continuous integration

`.github/workflows/ci.yml` runs on every push to main and on every pull request:

- `verify`.
- The image checks and the vulnerability scan.
- Against a real backend built from its repository: the contract tests, E2E and
  accessibility suites, the image checks in a browser, and the webhook retry path.

## Deploying

The dashboard must share an origin with the API. The backend's refresh cookie is
host-only, CORS is closed, and auth preflights are refused. The Docker image serves
the app and proxies `/api/v1/` to the backend from one origin:

```sh
docker build -t flowpay-dashboard .
docker run -p 8080:8080 -e FLOWPAY_API_UPSTREAM=app:8080 flowpay-dashboard
```

TLS, caching, the CSP, rate limits and their caveats are covered in
[docs/deployment.md](docs/deployment.md).

## Stack

| Concern      | Choice                                            | Why                                                      |
| ------------ | ------------------------------------------------- | -------------------------------------------------------- |
| Build        | Vite 8, TypeScript 6 (strict)                     | Fast HMR, simple config                                  |
| UI           | React 19                                          | —                                                        |
| Routing      | React Router 8 (data router, lazy routes)         | Widely known; per-feature code splitting                 |
| Server state | TanStack Query 5                                  | Caching, polling of moving states, invalidation          |
| Client state | Zustand (session, theme)                          | Tiny, works outside React (HTTP client)                  |
| Forms        | React Hook Form + Zod 4                           | Typed validation that mirrors backend rules              |
| Styling      | Tailwind CSS 4 + CSS-variable tokens              | Semantic tokens, light/dark from one source              |
| Primitives   | Radix UI (`radix-ui`)                             | Accessible dialogs, menus, tooltips; we own the styling  |
| Icons        | Phosphor                                          | Less ubiquitous than the default set; consistent weights |
| Motion       | `motion` (LazyMotion) + CSS keyframes             | Meaningful fills; small bundle                           |
| Feedback     | Sonner (toasts), cmdk (⌘K)                        | —                                                        |
| Languages    | i18next + react-i18next (vi, en)                  | Typed keys, plurals, switch without reload               |
| Fonts        | IBM Plex Sans / Mono (self-hosted via Fontsource) | Ledger character, Vietnamese glyphs, no CDN              |
| Tests        | Vitest, Testing Library, Playwright               | Unit tests share Vite's config; E2E against the real API |
| Serving      | NGINX (unprivileged image)                        | One origin with the API, the backend's edge policy       |

## Docs

- [Architecture & conventions](docs/architecture.md): structure, auth, data flow,
  idempotency, i18n, bundle budget, testing, adding a feature.
- [Design system](docs/design-system.md): principles, tokens, components, states, copy.
- [Local stack](docs/local-stack.md): backend setup, seed data, receivers, simulator
  outcomes, troubleshooting.
- [Deployment](docs/deployment.md): the image, edge policy, caching, security headers,
  TLS, checks.
- API contract: `docs/api-contract.md` in the backend repository, the only source for
  endpoints and shapes.
