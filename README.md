# FlowPay Dashboard

Merchant dashboard for the [FlowPay backend](../backend): payments and refunds,
API keys, webhook endpoints and delivery history, against the payment simulator.

## Run locally

Requirements: Node 22.22+ (tested on 24), the backend running on `http://localhost:8080`
(see `../backend/README.md`).

```sh
npm install
npm run dev        # http://localhost:5173, proxies /api to the backend
```

Point the proxy elsewhere with `FLOWPAY_API_TARGET` (see `.env.example`).

First run:

1. Register a merchant, then sign in.
2. **Developers → API keys → Create key**, keep "Use in dashboard" checked.
   Payments are served by the Merchant API, which requires an API key
   ([why](docs/architecture.md#why-a-test-key-for-payments)).
3. **Payments → New test payment**. The outcome is set by the backend's
   `PAYMENT_SIMULATOR_DEFAULT_OUTCOME` (`SUCCESS`, `DECLINED`, `UNKNOWN`, `TECHNICAL_FAILURE`).
4. **Developers → Webhooks → Add endpoint** to see signed deliveries and retries.
   Local receivers need the backend's `WEBHOOK_ALLOW_INSECURE_LOCALHOST=true`.

## Scripts

| Command                                 | What it does                            |
| --------------------------------------- | --------------------------------------- |
| `npm run dev`                           | Dev server with HMR and API proxy       |
| `npm run build`                         | Typecheck + production build to `dist/` |
| `npm run preview`                       | Serve the production build locally      |
| `npm run typecheck` / `lint` / `format` | Static checks                           |
| `npm test` / `npm run test:run`         | Vitest (watch / once)                   |

## Stack

| Concern      | Choice                                            | Why                                                      |
| ------------ | ------------------------------------------------- | -------------------------------------------------------- |
| Build        | Vite 8, TypeScript 6 (strict)                     | Fast HMR, simple config                                  |
| UI           | React 19                                          | —                                                        |
| Routing      | React Router 8 (data router, lazy routes)         | Widely known; per-feature code splitting                 |
| Server state | TanStack Query 5                                  | Caching, polling of moving states, invalidation          |
| Client state | Zustand (session, test key, theme)                | Tiny, works outside React (HTTP client)                  |
| Forms        | React Hook Form + Zod 4                           | Typed validation that mirrors backend rules              |
| Styling      | Tailwind CSS 4 + CSS-variable tokens              | Semantic tokens, light/dark from one source              |
| Primitives   | Radix UI (`radix-ui`)                             | Accessible dialogs, menus, tooltips; we own the styling  |
| Icons        | Phosphor                                          | Less ubiquitous than the default set; consistent weights |
| Motion       | `motion` (LazyMotion) + CSS keyframes             | Meaningful fills; small bundle                           |
| Feedback     | Sonner (toasts), cmdk (⌘K)                        | —                                                        |
| Fonts        | IBM Plex Sans / Mono (self-hosted via Fontsource) | Ledger character, Vietnamese glyphs, no CDN              |
| Tests        | Vitest, Testing Library, jsdom                    | Same config as Vite                                      |

## Docs

- [Architecture & conventions](docs/architecture.md): structure, auth, data flow, idempotency, adding a feature.
- [Design system](docs/design-system.md): principles, tokens, components, states, copy.
- [AGENTS.md](AGENTS.md): rules for coding agents; skills in `.claude/skills/`.

## Deploying

The backend requires the dashboard to share its origin (refresh cookie, CSRF
marker, denied cross-origin preflight). Serve `dist/` and reverse-proxy `/api`
from the same host; route unknown paths to `index.html` for client routing.
