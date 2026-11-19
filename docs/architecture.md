# FlowPay Dashboard — Architecture

## 1. Shape

A single-page React app, organised **by feature**, with a thin shared layer.
Three rules keep it understandable:

1. Dependencies point **down**: `app → features → components → lib`.
2. A feature exposes a small public API in its `index.ts`. Other code imports
   `@/features/payments`, never `@/features/payments/components/...`
   (enforced by ESLint `no-restricted-imports`).
3. Server state lives in TanStack Query; client state is local `useState`,
   URL search params, or (rarely) a small Zustand store.

```text
src/
├── app/                  composition: providers, router, layouts, guards, command menu
├── features/             one folder per business capability
│   ├── auth/             login/register, session store, refresh
│   ├── test-mode/        connected test API key for Merchant API reads
│   ├── overview/         "needs attention" home
│   ├── payments/         payments + refunds (refund is a payment sub-resource)
│   ├── api-keys/
│   ├── webhooks/         endpoints + deliveries
│   └── merchant/         business profile, settings page
├── components/
│   ├── ui/               design-system primitives (Radix + tokens), no domain knowledge
│   └── *.tsx             FlowPay composites: Money, CopyableId, StatusBadge, PageHeader…
├── i18n/                 vi/en messages per namespace, language detection and switching
├── lib/                  framework-light utilities: http client, errors, money, format…
├── styles/globals.css    design tokens (see docs/design-system.md)
└── test/setup.ts
```

### Inside a feature

Only create what the feature needs.

```text
features/payments/
├── index.ts              public API (pages, a few hooks/components others need)
├── types.ts              API shapes, mirrored from backend DTOs
├── api.ts                plain async functions, one per endpoint
├── queries.ts            query keys + useQuery/useMutation hooks
├── status.ts             status → tone/label map, allowed actions
├── use-payment-filters.ts
├── components/           feature-private components
└── pages/                route components
```

Flow of a read: `page → queries.ts hook → api.ts function → lib/api/http.ts → fetch`.

## 2. Talking to the backend

### Same origin

The backend intentionally denies cross-origin auth preflights and sets the
refresh token as an `HttpOnly; SameSite=Lax; Path=/api/v1/auth` cookie. The
dashboard therefore must be served **from the same origin** as `/api`:

- **Dev:** Vite proxies `/api` to `FLOWPAY_API_TARGET` (default `http://localhost:8080`).
- **Prod:** serve `dist/` and proxy `/api` from the same host (e.g. the existing
  NGINX edge). Do not enable wildcard CORS.

### HTTP client (`lib/api/http.ts`)

- Unwraps `{ data, meta }` envelopes; exposes `status` (201/202 matter) and
  `replayed` (`Idempotency-Replayed: true`).
- Converts RFC 9457 Problem Details into `ApiError { status, code, requestId, fieldErrors }`.
  **Branch on `error.code`, never on `detail`.** Copy for codes is in `lib/api/errors.ts`.
- Adds `X-FlowPay-CSRF: 1` to every auth POST (BR-AUTH-012).
- Three auth modes per request: `dashboard` (JWT), `merchant` (API key), `none`.
- On a dashboard 401 it refreshes **once** for all concurrent requests (refresh
  tokens rotate; parallel refreshes would revoke each other), then retries.
- No React imports; the app injects token getters via `configureHttp` (`app/http-setup.ts`).

### Authentication

| Piece                            | Where it lives                                      |
| -------------------------------- | --------------------------------------------------- |
| Access token (15 min JWT)        | Memory only (`features/auth/session-store.ts`)      |
| Refresh token (7 days, rotating) | `HttpOnly` cookie managed by the browser            |
| Display email                    | `localStorage` (only the login response carries it) |

Startup: `main.tsx` calls `restoreSession()` once (outside React, so StrictMode
can't double-refresh). Guards show a splash while `status === 'checking'`.
A timer refreshes one minute before expiry; the 401 retry is the fallback.

### Why a "test key" for payments

The backend exposes Payment/Refund APIs only to merchant **API keys**, not to
dashboard JWTs (`SecurityConfig.merchantApiSecurityFilterChain`). To show payments
in the dashboard without changing the backend contract, a person connects one of
their `fp_test_` keys for the current tab (`features/test-mode`):

- verified with a `GET /payment-intents?size=1` before it is stored;
- kept in `sessionStorage` (cleared with the tab), never bundled;
- part of every payments query key, so switching keys can't show stale data;
- cleared on sign-out and when the key is revoked from the dashboard.

**Recommended backend follow-up:** add JWT-scoped read endpoints (e.g.
`GET /api/v1/merchant/payments`). Then delete `features/test-mode` and change
`auth` in `features/payments/api.ts`; nothing else needs to change.

## 3. Server state (TanStack Query)

- Each feature owns a key factory (`paymentKeys`, `webhookKeys`, …). Mutations
  invalidate by prefix.
- Defaults (`app/query-client.ts`): `staleTime` 15s; no retry for 4xx; mutations
  never auto-retry (financial commands are retried by the person, with the same key).
- Lists use `placeholderData: keepPreviousData` so paging doesn't flash.
- Records in moving states poll: PROCESSING payment (5s), deliveries that are
  PENDING/DELIVERING/RETRYING (3–5s).
- Counts come from `meta.totalElements` of `size=1` pages (no aggregate API).
- Optimistic updates only where reversal is harmless (revoking a key's row).

## 4. Idempotency in the UI

`useIdempotencyKey(scope)` (`lib/idempotency.ts`) returns `keyFor(values)`:

- same values → same key (double click, retry after timeout → server replays);
- changed values → new key (a new intent; avoids `409 IDEMPOTENCY_KEY_REUSED`);
- `reset()` when the dialog closes.

Create payment, confirm payment and create refund all use it. A replay is shown
to the person ("Replayed: no second payment was created").

## 5. Money

Amounts are integer **minor units** end to end (BR-MONEY-001). `lib/money.ts`:

- `formatMinor(500000, 'VND')` → `500,000`; `formatMinor(12345, 'USD')` → `123.45`;
- `parseToMinor('0.29', 'USD')` → `29` using string math (never `parseFloat * 100`);
- currency decimals come from `Intl` (VND 0, USD 2, KWD 3).

## 6. URL state

Filters, pagination and an open delivery sheet live in search params
(`?status=DEAD&delivery=wdl_…`) so views are shareable and survive reload.
One hook per list owns the URL format (`use-payment-filters.ts`, `DeliveriesView`).

## 7. Code conventions

- **Files:** components `PascalCase.tsx`; hooks/utilities `kebab-case.ts`;
  primitives in `components/ui` are `kebab-case.tsx` (shadcn-style).
- **Exports:** named exports only. One component per file unless tiny and private.
- **Types:** `interface` for object shapes, `type` for unions. Mirror backend
  enums as string unions with a `const` array when iteration is needed.
- **Styling:** Tailwind utilities with semantic tokens; `cn()` to merge; `cva`
  for variants. No inline hex colours, no Tailwind stock palette.
- **Forms:** React Hook Form + Zod for multi-field forms; plain `useState` for
  one or two fields. Map `VALIDATION_ERROR` to fields with `applyServerErrors`.
- **Comments:** explain _why_ (business rule, trade-off), cite the backend rule
  (`BR-REF-003`) when relevant. Don't narrate what the code does.
- **Effects:** avoid syncing state in `useEffect`; derive, or adjust during render.

### Copy and languages (`src/i18n`)

The dashboard ships in Vietnamese and English (`i18next` + `react-i18next`).

- Messages live in `src/i18n/en/<namespace>.ts` and `src/i18n/vi/<namespace>.ts`,
  one namespace per area (`shell` for the app frame, then one per feature).
  English is the source of keys: each Vietnamese file is typed `Messages<typeof en>`,
  so a missing or extra key fails typecheck, and `t('…')` only accepts existing keys.
- Read strings with `const { t } = useTranslation('<namespace>')`. Don't build
  sentences from fragments; use interpolation (`{{name}}`) and plural keys
  (`_one` / `_other`; Vietnamese only needs `_other`).
- Language: stored choice (`localStorage` `flowpay.language`), else the browser
  language, else English. `setLanguage()` switches without a reload and updates
  `<html lang>`. Language names are always shown in their own language.
- Tests run in English (`src/test/setup.ts`).

## 8. Testing

- `vitest` + Testing Library + jsdom.
- Unit-test pure logic that protects money or security (`money.test.ts`, `http.test.ts`).
- `app/app.smoke.test.tsx` renders every route against a fake backend that
  follows the API contract; extend its route table when adding pages.
- `contract/` (`npm run test:contract`) calls every endpoint the dashboard uses
  on a **real** backend (docs/local-stack.md). `contract/schemas.ts` holds strict
  zod mirrors of the API types; `api.contract.ts` asserts at compile time that
  each one infers exactly the frontend type, so a backend change fails the run
  and a drifting `types.ts` fails typecheck. When you add or change an endpoint
  or a type, update both. It also pins status codes, idempotency headers and
  every Problem Details `code` (must be listed in `SERVER_ERROR_CODES`).
- `e2e/` (Playwright, real backend): `*.e2e.ts` for behaviour (`npm run e2e`),
  `pages.shots.ts` for the review screenshot matrix (`npm run shots`). The global
  setup seeds a merchant (`scripts/seed.ts`); tests use the `authedPage` fixture,
  which logs each browser context in through the API. Never share one storage
  state between tests: refresh tokens rotate and would revoke each other. jsdom
  hides real-browser behaviour (a Promise from `scrollTo()` crashed every
  authenticated page while the smoke test stayed green), so UI tasks run both.

## 9. Adding a feature (checklist)

1. `features/<name>/types.ts` from the backend DTOs (`docs/api-contract.md`).
2. `api.ts` with one function per endpoint, correct `auth` mode.
3. `queries.ts` with a key factory and hooks.
4. Components and pages using `components/ui` primitives (see design system).
5. `index.ts` exporting the pages (and anything another feature needs).
6. Route in `app/router.tsx` (lazy), nav entry in `app/layouts/Sidebar.tsx`,
   command entry in `app/CommandMenu.tsx`.
7. Handle every state in design-system §8.
8. Add the routes to the smoke test; unit-test any non-trivial logic.
9. Status maps and feature components go in the `/dev/ui` gallery: a
   `components/<Name>Gallery.tsx` with fixed fixtures, exported from `index.ts`
   as a loader guarded by `import.meta.env.DEV` (so production builds drop it),
   and listed in `app/dev/UiGalleryPage.tsx`. Status maps live in the feature's
   `status.ts` or `catalog.ts`, never in a page.
