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
   `Succeeded`.

The same flow from a shell, through the proxy (useful when the UI misbehaves):

```sh
curl -i -H 'Content-Type: application/json' -H 'X-FlowPay-CSRF: 1' \
  -d '{"email":"you@example.com","password":"<password>"}' \
  http://localhost:5173/api/v1/auth/login
# 200, body has accessToken, Set-Cookie: flowpay_refresh=…; Path=/api/v1/auth; HttpOnly
```

## 5. Simulator outcomes

The provider outcome is **one global setting per backend process, read at
startup**. To get a different outcome, stop the backend, set the variable and
start it again.

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

## 6. Stop and reset

```sh
# Ctrl+C in the backend and dashboard terminals, then:
cd backend
docker compose -f docker-compose.yaml down        # keep data
docker compose -f docker-compose.yaml down -v     # wipe Postgres and RabbitMQ data
```

## 7. Things that surprise people

| Symptom                                                 | Cause                                                                                                                                           |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Signed out after restarting the backend                 | The `dev` profile generates new JWT signing keys on every start; old access tokens are rejected. Sign in again.                                 |
| Backend fails at startup mentioning the encryption key  | `WEBHOOK_SECRET_ENCRYPTION_KEY` is missing, not Base64, or not 32 bytes. A new terminal/VS Code window is needed after setting a user variable. |
| `403 ACCESS_DENIED` on `/auth/*` from curl              | Every auth POST needs exactly one `X-FlowPay-CSRF: 1` header. The dashboard adds it.                                                            |
| `401` on payments with a dashboard token                | Expected today: payment and refund APIs accept merchant API keys only.                                                                          |
| Webhook endpoint rejected for an `http://localhost` URL | The backend was started without `WEBHOOK_ALLOW_INSECURE_LOCALHOST=true`.                                                                        |
| New endpoint shows no deliveries for older payments     | Subscriptions are snapshotted when an event is first materialized; only events after the endpoint was created are delivered to it.              |
| Payment confirm outcome is not the one you wanted       | The simulator outcome is fixed at backend startup (section 5).                                                                                  |
| No `429` locally                                        | Rate limits live in the production NGINX edge, not in the backend, so the dev stack never returns `RATE_LIMIT_EXCEEDED`.                        |
