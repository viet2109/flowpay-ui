# Local stack

Run the dashboard against the real FlowPay backend on one machine: PostgreSQL and
RabbitMQ in Docker, the backend from source, the dashboard on the Vite dev server.
Verified on Windows 11 (Git Bash and PowerShell) on 2026-11-18.

```text
browser ──► http://localhost:5173  (Vite: SPA + proxy /api)
                    │ /api/*
                    ▼
            http://localhost:8080  (backend, Spring profile "dev")
               │            │
               ▼            ▼
        Postgres :5432   RabbitMQ :5672 (UI :15672)
```

The browser only ever talks to `:5173`. The proxy keeps the dashboard and `/api`
on one origin, which the backend requires (HttpOnly refresh cookie scoped to
`/api/v1/auth`, cross-origin auth preflights denied).

## 1. Prerequisites

| Tool           | Version               | Check                    |
| -------------- | --------------------- | ------------------------ |
| Node.js        | 22.22+ (tested on 24) | `node -v`                |
| JDK            | 21, `JAVA_HOME` set   | `java -version`          |
| Docker Desktop | Linux containers      | `docker version`         |
| Docker Compose | v2+                   | `docker compose version` |

The two repositories must be siblings:

```text
flowpay/
├── backend/
└── frontend/
```

Ports used: `5173`, `8080`, `5432`, `5672`, `15672`. Stop anything else on them first.

## 2. One-time setup

### Webhook encryption key

The backend will not start without `WEBHOOK_SECRET_ENCRYPTION_KEY`: the standard
Base64 of exactly 32 random bytes. It encrypts webhook endpoint secrets at rest,
so it must **stay the same** for as long as the database keeps those endpoints.
Never commit it or put it in a file inside either repository.

PowerShell (stored as a user environment variable; open a new terminal and
restart VS Code afterwards so they see it):

```powershell
$key = node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64'))"
[Environment]::SetEnvironmentVariable('WEBHOOK_SECRET_ENCRYPTION_KEY', $key, 'User')
```

Git Bash / macOS / Linux:

```sh
echo "export WEBHOOK_SECRET_ENCRYPTION_KEY='$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64'))")'" >> ~/.bashrc
source ~/.bashrc
```

If you lose or change the key, existing endpoint secrets can no longer be
decrypted: reset the data (section 6).

### Dashboard dependencies

```sh
cd frontend
npm install
```

Optional: copy `.env.example` to `.env.local` only if the backend is not on
`http://localhost:8080` (`FLOWPAY_API_TARGET`).

## 3. Start

Three terminals, in this order.

**Terminal 1: infrastructure** (first run pulls images, about 2 minutes):

```sh
cd backend
docker compose -f docker-compose.yaml up -d --wait
```

**Terminal 2: backend.** `WEBHOOK_ALLOW_INSECURE_LOCALHOST=true` lets webhook
endpoints point at `http://localhost:<port>` receivers on your machine; it is a
development switch only.

```sh
cd backend
WEBHOOK_ALLOW_INSECURE_LOCALHOST=true ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

```powershell
cd backend
$env:WEBHOOK_ALLOW_INSECURE_LOCALHOST = 'true'
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"
```

Ready when `http://localhost:8080/actuator/health` returns `{"status":"UP",…}`.

**Terminal 3: dashboard**

```sh
cd frontend
npm run dev
```

## 4. Check it works

1. Open <http://localhost:5173>. You are sent to the sign-in page.
2. **Create account**, then sign in with it. You land on Overview.
3. **Developers → API keys → Create key** with "Use in dashboard" checked.
   Payments are read with an API key until the backend dashboard API exists
   (roadmap P3); a dashboard token on `/payment-intents` returns `401`.
4. **Payments → New test payment.** With the default simulator outcome it ends
   `Succeeded`; an amount ending in `901` ends `Failed` (section 6).

Or skip the manual steps and load a full dataset with `npm run seed` (section 5).

The same flow from a shell, through the proxy (useful when the UI misbehaves):

```sh
curl -i -H 'Content-Type: application/json' -H 'X-FlowPay-CSRF: 1' \
  -d '{"email":"you@example.com","password":"<password>"}' \
  http://localhost:5173/api/v1/auth/login
# 200, body has accessToken, Set-Cookie: flowpay_refresh=…; Path=/api/v1/auth; HttpOnly
```

## 5. Seed data

With the stack running:

```sh
npm run seed
```

In about 10 seconds it registers a new merchant (`demo+<id>@example.com`) and
fills it, through the public API only, with every state the dashboard renders:
payments in all six statuses across two list pages (VND and USD, Vietnamese
descriptions, one without an order ID), refunds succeeded/failed/processing,
one active and one revoked API key, three webhook endpoints (healthy, failing,
disabled) and deliveries DELIVERED/RETRYING/DEAD. It checks each state as it
goes and stops with the request ID on the first surprise. At the end it prints
the sign-in details and the test API key to connect in the dashboard.

Each run creates a separate merchant, so it is safe to run again. The local
receiver uses port `4242` (`SEED_RECEIVER_PORT`); other options are listed at
the top of `scripts/seed.ts`.

`npm run test:contract` uses the same stack: it registers its own merchant and
checks every endpoint the dashboard calls against the frontend types in about
5 seconds. Point it elsewhere with `CONTRACT_API_URL`.

### E2E and review screenshots

```sh
npm run e2e                  # behaviour tests in a real browser (e2e/*.e2e.ts)
npm run shots                # every page in shots/ in {light,dark} × {375,1280} × {en,vi}
npm run shots -- -g login    # only the pages whose name matches
```

Both start Vite if it is not running, seed a fresh merchant once per run, and
sign each test in through the API. Screenshots land in
`shots/<page>/<width>-<theme>-<locale>.png` (git-ignored); add the pages a UI
task touches to `e2e/pages.shots.ts`. The `vi` variants only differ once i18n
lands (roadmap P1-T04).

The browser is Playwright's Chromium if `npx playwright install chromium`
succeeded, otherwise the system Microsoft Edge; force one with
`E2E_BROWSER_CHANNEL=chromium|msedge|chrome`.

## 6. Simulator outcomes

In the `dev` profile, **the amount picks the outcome**: amounts ending in these
digits (minor units) force a non-success outcome, for payment confirm and refunds
alike. Any other amount uses the default outcome below.

| Amount ends in | Example      | Payment confirm                        | Refund                      |
| -------------- | ------------ | -------------------------------------- | --------------------------- |
| `901`          | 250,901 VND  | `200`, `FAILED` (declined)             | `201`, `FAILED` (declined)  |
| `902`          | 1,009.02 USD | `202`, `PROCESSING`, attempt `UNKNOWN` | `202`, `PROCESSING`         |
| `903`          | 120,903 VND  | `200`, `FAILED` (technical failure)    | `201`, `FAILED` (technical) |

The default outcome is **one global setting per backend process, read at
startup**. To change it, stop the backend, set the variable and start it again.
Set `PAYMENT_SIMULATOR_AMOUNT_TRIGGERS_ENABLED=false` (or the `REFUND_` one) to
turn the amount triggers off.

| Variable                            | Value               | Result                                                 |
| ----------------------------------- | ------------------- | ------------------------------------------------------ |
| `PAYMENT_SIMULATOR_DEFAULT_OUTCOME` | `SUCCESS` (default) | confirm `200`, payment `SUCCEEDED`                     |
|                                     | `DECLINED`          | confirm `200`, payment `FAILED` with a failure code    |
|                                     | `TECHNICAL_FAILURE` | confirm `200`, payment `FAILED` with a failure code    |
|                                     | `UNKNOWN`           | confirm `202`, payment `PROCESSING`, attempt `UNKNOWN` |
| `REFUND_SIMULATOR_DEFAULT_OUTCOME`  | `SUCCESS` (default) | `201`, refund `SUCCEEDED`                              |
|                                     | `DECLINED`          | `201`, refund `FAILED`                                 |
|                                     | `TECHNICAL_FAILURE` | `201`, refund `FAILED`                                 |
|                                     | `UNKNOWN`           | `202`, refund `PROCESSING`                             |

There is no reconciliation in this backend version: a `PROCESSING` payment or
refund stays `PROCESSING`.

Webhook retries default to `10s,30s,2m,10m,1h`. To reach `DEAD` quickly while
testing, start the backend with e.g. `WEBHOOK_DELIVERY_RETRY_DELAYS=2s,2s,2s,2s,2s`.

## 7. Stop and reset

```sh
# Ctrl+C in the backend and dashboard terminals, then:
cd backend
docker compose -f docker-compose.yaml down        # keep data
docker compose -f docker-compose.yaml down -v     # wipe Postgres and RabbitMQ data
```

## 8. Things that surprise people

| Symptom                                                 | Cause                                                                                                                                           |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Signed out after restarting the backend                 | The `dev` profile generates new JWT signing keys on every start; old access tokens are rejected. Sign in again.                                 |
| Backend fails at startup mentioning the encryption key  | `WEBHOOK_SECRET_ENCRYPTION_KEY` is missing, not Base64, or not 32 bytes. A new terminal/VS Code window is needed after setting a user variable. |
| `403 ACCESS_DENIED` on `/auth/*` from curl              | Every auth POST needs exactly one `X-FlowPay-CSRF: 1` header. The dashboard adds it.                                                            |
| `401` on payments with a dashboard token                | Expected today: payment and refund APIs accept merchant API keys only.                                                                          |
| Webhook endpoint rejected for an `http://localhost` URL | The backend was started without `WEBHOOK_ALLOW_INSECURE_LOCALHOST=true`.                                                                        |
| New endpoint shows no deliveries for older payments     | Subscriptions are snapshotted when an event is first materialized; only events after the endpoint was created are delivered to it.              |
| Payment confirm outcome is not the one you wanted       | The amount ends in 901/902/903 (section 6), or the default outcome was set at backend startup.                                                  |
| `npm run seed` says the simulator ignored the trigger   | The backend is not on the `dev` profile, or it predates the amount triggers (backend commit `a15bdda`).                                         |
| No `429` locally                                        | Rate limits live in the production NGINX edge, not in the backend, so the dev stack never returns `RATE_LIMIT_EXCEEDED`.                        |
