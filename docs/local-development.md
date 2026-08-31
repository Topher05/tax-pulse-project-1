# Local Development

This guide covers manual environment setup, local application startup, tenant-scoped
login, LocalStack, and the standalone Redis cache.

## Runtime Setup

The repository pins Node.js 22.0.0 and Python 3.13.14. Verify the active versions from
the repository root:

```powershell
node --version
py -3.13 --version
npm --version
py -3.13 -m pip --version
```

On macOS or Linux, use `python` in place of the Windows `py -3.13` launcher.

The setup scripts are the preferred installation path:

```powershell
./setup.ps1
```

```bash
./setup.sh
```

For a manual installation:

```powershell
npm install
npm --prefix src/pulseUI install
py -3.13 -m pip install -e ".[dev]"
```

The Python development extra includes Ruff, pytest, and `pyright[nodejs]`.

## Environment Configuration

Copy [`.env.example`](../.env.example) to `.env` and replace only the values needed for
your workflow. `.env` is local-only and must never be committed.

For local PostgreSQL outside Docker, use a `DATABASE_URL` whose host is `localhost`. A
standalone Core container must instead use `host.docker.internal` to reach a database on
the host. The full Compose stack overrides the URL with its internal PostgreSQL hostname.

## Run the Applications

Start the Core Case Service and Pulse UI in separate terminals:

```powershell
npm run dev
```

```powershell
npm run dev:web
```

Run the Tax Engine directly with:

```powershell
python src/tax_liability_engine/scripts/liability_engine_on.py
```

The API listens on `http://localhost:3000`, Pulse UI on `http://localhost:5173`, and the
Tax Engine on `http://localhost:8000` by default.

## Tenant-Scoped Local Login

Keep `TAXPULSE_LOGIN_BASE_DOMAIN=localhost` in `.env`. Password login resolves the tenant
from the hostname, so use a tenant slug when opening Pulse UI:

```text
http://north-star-planning.localhost:5173/sign-in
```

The synthetic seed data includes `north-star-planning`. Plain
`http://localhost:5173/sign-in` has no tenant slug and intentionally returns
`Login Workspace Not Found`.

Leave `CASE_SERVICE_BASE_URL` unset during local Vite development. This keeps API requests
on Vite's same-origin proxy and preserves the tenant hostname. Setting it to a different
origin can bypass the proxy and cause CORS failures.

For direct API testing, send the tenant hostname in the `Host` header:

```text
POST http://127.0.0.1:3000/auth/login
Host: north-star-planning.localhost:3000
Content-Type: application/json
```

The request body contains only `email` and `password`; clients do not submit a raw tenant
identifier.

## LocalStack DynamoDB Projection

The Python queue-projection bootstrap requires these `.env` values:

- `AWS_ACCESS_KEY_ID=test`
- `AWS_SECRET_ACCESS_KEY=test`
- `AWS_REGION=us-east-1`
- `TAXPULSE_DYNAMODB_ENDPOINT_URL=http://localhost:4566`
- `LOCALSTACK_AUTH_TOKEN=<your LocalStack token>`

Install the Python development dependencies, start LocalStack, and bootstrap the table:

```powershell
python -m pip install -e ".[dev]"
docker compose --env-file .env -f src/tax_liability_engine/docker-compose.yml up -d taxpulse-localstack
python -m tax_liability_engine.main
```

If you use `uv`, the equivalent dependency command is:

```powershell
uv sync --locked --extra dev
```

Confirm the projection table exists:

```powershell
aws dynamodb describe-table --table-name taxpulse_plan_cycle_queue_projection --endpoint-url http://localhost:4566 --region us-east-1
```

## Standalone Redis Cache

The TypeScript queue cache is disposable operational state. Set
`TAXPULSE_REDIS_URL=redis://localhost:6379`, then use:

```powershell
npm run redis:up
npm run redis:smoke
npm run redis:down
```

Redis listens on `localhost:6379`; RedisInsight is available at
`http://localhost:5540`. The Redis integration suite uses Testcontainers, so Docker must
be running before `npm run test:integration`.

Run the focused cache tests with:

```powershell
npx vitest run tests/typescript/features/taxPlanCycle/queueCache.test.ts tests/typescript/features/taxPlanCycle/queueDynamoStore.test.ts
npm run test:integration -- tests/typescript/features/taxPlanCycle/queueRead.integration.test.ts
```
