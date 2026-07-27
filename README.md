# tax-liability-engine

## Project Layout

This workspace is scaffolded as a small dual-runtime project:

- TypeScript source lives in [`src/typescript`](./src/typescript)
- Pulse UI React/Vite source lives in [`src/pulseUI`](./src/pulseUI)
- Python source lives in [`src/tax_liability_engine`](./src/tax_liability_engine)
- TypeScript tests live in [`tests/typescript`](./tests/typescript)
- Pulse UI component tests live in [`src/pulseUI/tests`](./src/pulseUI/tests)
- Python tests live in [`tests/tax_liability_engine`](./tests/tax_liability_engine)

## Toolchain

- `nvm` is the required Node.js installer for both setup scripts.
- `pyenv` is the required Python installer for `setup.sh`.
- `nvm for Windows`, `winget`, and the `py` launcher are required for `setup.ps1`.
- Docker Desktop or a compatible Docker Engine is required for the Testcontainers-backed integration suite.
- Node.js is pinned in both [`.nvmrc`](./.nvmrc) and [`.tool-versions`](./.tool-versions).
- Python is pinned in [`.tool-versions`](./.tool-versions) and must exactly match `requires-python` in [`pyproject.toml`](./pyproject.toml).
- Python dev dependencies come from [`pyproject.toml`](./pyproject.toml) and include Ruff, pytest, and `pyright[nodejs]`.
- Root Node dependencies in [`package.json`](./package.json) are for the Express/API layer.
- Pulse UI dependencies live in [`src/pulseUI/package.json`](./src/pulseUI/package.json) and include React, React DOM, Vite, TanStack Router, and lucide-react.
- Pulse UI component tests use the UI package's Vitest, Testing Library, jest-dom matchers, and jsdom.
- The setup scripts treat the manifests as strict pins and exit non-zero on any mismatch.

## Verify Active Versions

Run this from the repository root:

```powershell
node -v
py -3.13 --version
```

The reported versions should match the pinned values above.

## Setup

From the repository root:

```powershell
./setup.ps1
```

```bash
./setup.sh
```

Each script:

- validates that `.nvmrc`, `.tool-versions`, and `pyproject.toml` agree on the pinned versions
- installs Node from the pinned manifest version
- installs Python from the pinned manifest version
- verifies the Node and Python runtimes plus `npm` and `pip`
- fails if the active Node or Python version differs from the manifest pin
- installs Express/API TypeScript dependencies from [`package.json`](./package.json)
- installs Pulse UI dependencies from [`src/pulseUI/package.json`](./src/pulseUI/package.json)
- installs the Python package in editable mode with dev dependencies from [`pyproject.toml`](./pyproject.toml)
- verifies the Python dev tools, including Ruff and Pyright
- runs a `hello` check for both the Node and Python stacks
- runs TypeScript type checks and smoke tests
- runs Python Ruff checks, Pyright, and smoke tests

On Windows, if `setup.ps1` installs `nvm for Windows` or Python for the first time, close and reopen PowerShell before rerunning version checks or `nvm`/`py` commands. 

If you plan to run the PostgreSQL integration suite or any other Testcontainers-backed command, start Docker before invoking it.

New installs may not be visible to the current shell session immediately. A system restart may be required if refreshing the terminal does not make the new commands available.

## Development Commands

After setup, run these from the repository root:

```bash
npm run dev
npm run dev:web
npm run typecheck
npm test
npm run build
npm run build:web
npm start
```

```bash
python -m tax_liability_engine.main
python -m ruff format --check src tests
python -m ruff check src tests
python -m pyright --pythonpath "$(python -c 'import sys; print(sys.executable)')"
python -m pytest
```

## Python LocalStack Bootstrap

The Python queue-projection bootstrap uses LocalStack and DynamoDB through a small
docker-compose setup. For that flow, `.env` only needs these values:

- `AWS_ACCESS_KEY_ID=test`
- `AWS_SECRET_ACCESS_KEY=test`
- `AWS_REGION=us-east-1`
- `TAXPULSE_DYNAMODB_ENDPOINT_URL=http://localhost:4566`
- `LOCALSTACK_AUTH_TOKEN=<your LocalStack token>`

Before running the bootstrap, make sure the Python dev dependencies are installed
from `pyproject.toml`. From the repository root, use whichever installer your
machine has available:

```powershell
python -m pip install -e ".[dev]"
```

If you have `uv` installed, you can use that instead:

```powershell
uv sync --extra dev
```

Start Docker Desktop first, then run the Python bootstrap from the repository root:

```powershell
docker compose --env-file .env -f src/tax_liability_engine/docker-compose.yml up -d taxpulse-localstack
```

If a previous `taxpulse-localstack` container is already running or stuck in a
conflicted state, remove it before rerunning:

```powershell
docker rm -f taxpulse-localstack
```

Then bootstrap the empty queue table:

```powershell
python -m tax_liability_engine.main
```

The Python entrypoint will start the container if it is missing, or reuse the
configured Compose service if it is already available.

If you want to confirm the table exists afterward, use the AWS CLI against the local
endpoint:

```powershell
aws dynamodb describe-table --table-name taxpulse_plan_cycle_queue_projection --endpoint-url http://localhost:4566 --region us-east-1
```

## Redis Queue Cache

The TypeScript queue-read cache uses Redis as disposable operational state. Add this
value to your local `.env` file alongside the existing PostgreSQL and LocalStack
settings:

- `TAXPULSE_REDIS_URL=redis://localhost:6379`

Start the Redis stack with the repo script:

```powershell
npm run redis:up
```

That compose stack brings up:

- Redis on `localhost:6379`
- RedisInsight on `http://localhost:5540`

RedisInsight is preconfigured against the local Redis container, so once the stack is
running you can open the browser UI and inspect the cache immediately.

If you want to stop the stack cleanly:

```powershell
npm run redis:down
```

If a previous Redis container is still around, remove it before rerunning:

```powershell
docker rm -f taxpulse-redis taxpulse-redisinsight
```

Use the smoke command to prove the cache is reachable and writable:

```powershell
npm run redis:smoke
```

The Redis-backed queue-cache integration test runs through Testcontainers, so Docker
must be running before `npm run test:integration`.

After you install the updated Node dependencies locally, you can run the Redis
queue-cache tests directly with Vitest:

```powershell
npx vitest run tests/typescript/features/taxPlanCycle/queueCache.test.ts tests/typescript/features/taxPlanCycle/queueDynamoStore.test.ts
npm run test:integration -- tests/typescript/features/taxPlanCycle/queueRead.integration.test.ts

## Python LocalStack Bootstrap

The Python queue-projection bootstrap uses LocalStack and DynamoDB through a small
docker-compose setup. For that flow, `.env` only needs these values:

- `AWS_ACCESS_KEY_ID=test`
- `AWS_SECRET_ACCESS_KEY=test`
- `AWS_REGION=us-east-1`
- `TAXPULSE_DYNAMODB_ENDPOINT_URL=http://localhost:4566`
- `LOCALSTACK_AUTH_TOKEN=<your LocalStack token>`

Before running the bootstrap, make sure the Python dev dependencies are installed
from `pyproject.toml`. From the repository root, use whichever installer your
machine has available:

```powershell
python -m pip install -e ".[dev]"
```

If you have `uv` installed, you can use that instead:

```powershell
uv sync --extra dev
```

Start Docker Desktop first, then run the Python bootstrap from the repository root:

```powershell
docker compose --env-file .env -f src/tax_liability_engine/docker-compose.yml up -d taxpulse-localstack
```

If a previous `taxpulse-localstack` container is already running or stuck in a
conflicted state, remove it before rerunning:

```powershell
docker rm -f taxpulse-localstack
```

Then bootstrap the empty queue table:

```powershell
python -m tax_liability_engine.main
```

The Python entrypoint will start the container if it is missing, or reuse the
configured Compose service if it is already available.

If you want to confirm the table exists afterward, use the AWS CLI against the local
endpoint:

```powershell
aws dynamodb describe-table --table-name taxpulse_plan_cycle_queue_projection --endpoint-url http://localhost:4566 --region us-east-1
```

## Redis Queue Cache

The TypeScript queue-read cache uses Redis as disposable operational state. Add this
value to your local `.env` file alongside the existing PostgreSQL and LocalStack
settings:

- `TAXPULSE_REDIS_URL=redis://localhost:6379`

Start the Redis stack with the repo script:

```powershell
npm run redis:up
```

That compose stack brings up:

- Redis on `localhost:6379`
- RedisInsight on `http://localhost:5540`

RedisInsight is preconfigured against the local Redis container, so once the stack is
running you can open the browser UI and inspect the cache immediately.

If you want to stop the stack cleanly:

```powershell
npm run redis:down
```

If a previous Redis container is still around, remove it before rerunning:

```powershell
docker rm -f taxpulse-redis taxpulse-redisinsight
```

Use the smoke command to prove the cache is reachable and writable:

```powershell
npm run redis:smoke
```

The Redis-backed queue-cache integration test runs through Testcontainers, so Docker
must be running before `npm run test:integration`.

After you install the updated Node dependencies locally, you can run the Redis
queue-cache tests directly with Vitest:

```powershell
npx vitest run tests/typescript/features/taxPlanCycle/queueCache.test.ts tests/typescript/features/taxPlanCycle/queueDynamoStore.test.ts
npm run test:integration -- tests/typescript/features/taxPlanCycle/queueRead.integration.test.ts
```

### TypeScript Coverage

Vitest with `@vitest/coverage-v8` is the standard coverage path for the TypeScript
and Pulse UI suite. Use this command to generate local coverage output and reporting:

```bash
npm run test:cov
```

Coverage reporting follows the Vitest workflow, so the generated report reflects the
same test harness used by `npm run test:vitest`.

## Contributor Workflow

Use these docs as the source of truth for branch naming, PR shape, and review checks:

- [`CONTRIBUTING.md`](./CONTRIBUTING.md) for Git flow, branch naming, and review expectations
- [`.github/pull_request_template.md`](./.github/pull_request_template.md) for the PR structure
- [`planning/ai-review-checklist.md`](./planning/ai-review-checklist.md) for review verification items
- [`planning/sample-pr.md`](./planning/sample-pr.md) for a completed example PR
- [`docs/storage-decision-matrix.md`](./docs/storage-decision-matrix.md) for the authoritative placement of transactional, projection, cache, and idempotency data

When preparing a change:

1. Name the branch to match the Git flow rule for its type.
2. Fill in the PR template with the ticket, brief, ADR link, validation, and risk notes.
3. Run the AI review checklist before requesting review.
4. Use the sample PR as the reference for the expected level of detail.

## Core Case Service API

The Core Case Service publishes its OpenAPI 3.0 JSON document at:

```text
GET /openapi.json
```

The document currently describes the versioned Tax Plan Cycle create and read
operations:

- `POST /tax-plan-cycles`
- `GET /tax-plan-cycles/{caseId}`
- `PATCH /tax-plan-cycles/{caseId}/transition`

Successful reads return the persisted Tax Plan Cycle for the request tenant:

```json
{
  "id": "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
  "client_id": "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e11",
  "stage": "Intake",
  "owner": "advisor-123",
  "priority": "medium",
  "due_date": "2026-12-31",
  "on_hold": false
}
```

The Tax Plan Cycle schemas are generated from the same Zod definitions used by the
routes. Workflow condition is represented by `stage`; there is no separate case
`status` field.

## Password Hashing Configuration

The auth helpers use Argon2id password hashes. See
[`ADR-0007`](./adr/0007-argon2id-password-login.md) for the dependency and architecture
rationale.

`POST /auth/login` accepts `tenant_id`, `email`, and `password`. Valid passwords return
`202` with an MFA challenge payload, and invalid credentials return a shared `401`
Problem Details response.

The defaults work out of the box. Override these values only when a deployment needs
different capacity or latency tradeoffs:

- `TAXPULSE_ARGON2_MEMORY_COST_KIB`
- `TAXPULSE_ARGON2_TIME_COST`
- `TAXPULSE_ARGON2_PARALLELISM`
- `TAXPULSE_ARGON2_HASH_LENGTH`
- `TAXPULSE_ARGON2_SALT_LENGTH`

## Migration Commands

The PostgreSQL migration workflow keeps typed Drizzle schema definitions in
[`src/typescript/shared/database/schema.ts`](./src/typescript/shared/database/schema.ts), generated Drizzle
migration evidence in [`drizzle/`](./drizzle), and the executable SQL migration files
in the top-level [`migrations/`](./migrations) directory.

Docker is required for the repository integration tests because they use a
Testcontainers-managed PostgreSQL instance.

Local setup:

1. Install PostgreSQL 18 using the official installer or your platform package manager. [link here](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads)
2. Start the local PostgreSQL service.
3. Create a database for this project `taxpulse`.
4. Set up a database user.
    - Create a new superuser and use its credentials in the config file.
    - Use pgAdmin or `psql`, whichever you prefer.
5. Copy [`.env.example`](./.env.example) to `.env`.
6. Edit `.env` and set `DATABASE_URL` to your local PostgreSQL connection string.

Apply all migrations:

```powershell
npm run migrate
```

Generate Drizzle migration evidence from the TypeScript schema:

```powershell
npm run db:generate
```

Check Drizzle migration metadata:

```powershell
npm run db:check
```

Run the migration integration test:

```powershell
npm run test:migration
```

Run the Python liability engine API locally:

```powershell
python src/tax_liability_engine/scripts/liability_engine_on.py
```

Notes:

- The Node scripts read `.env` automatically through `dotenv`.
- Drizzle definitions are the typed schema contract; the SQL migration runner applies
  the top-level `migrations/` files and records applied files in `schema_migrations`.
- Keep any local seed data synthetic and clearly fake.
- A shared seed data lives in `src/typescript/shared/database/seed.ts` and is executed with `npm run seed`; keep any generated sample data synthetic and clearly fake.
- Start Docker before running `npm run test:integration` or any command that depends on Testcontainers.

The FastAPI liability engine reads `JWT_ISSUER` and `JWT_SIGNING_SECRET` from the local
environment. The Python startup script loads `.env` from the repository root before
launching `uvicorn`, so the service is usually one command away after setup.

### Liability Engine HTTP Surface

The current FastAPI surface is feature-sliced and tenant-scoped. Available routes:

- `GET /health`
- `POST /tax-calculations`
- `POST /scenarios/comparisons`

Each calculation route expects a shared JWT bearer token and uses the token-derived
tenant context at the route boundary. The request bodies stay focused on calculation
inputs, and the math remains inside the domain services.

## Contributing and Codex Context

Codex should follow the repository conventions in [`AGENTS.md`](./AGENTS.md), including
the TaxPulse domain constraints, Python and TypeScript layout, formatter expectations,
and validation commands.

Repo-local Codex settings live in [`.codex/config.toml`](./.codex/config.toml). Keep
the sandbox at `workspace-write` with `approval_policy = "on-request"` for least-privilege
AI pairing.

## Manual Verification

Run this from the repository root:

```powershell
nvm use 22.0.0
node --version
py -3.13 --version
npm --version
py -3.13 -m pip --version
```

Install dependencies manually if needed:

```powershell
npm install
npm --prefix src/pulseUI install
py -3.13 -m pip install -e ".[dev]"
```

That editable install pulls in the Python developer tooling declared in
[`pyproject.toml`](./pyproject.toml), including Ruff, pytest, and `pyright[nodejs]`.

Success means:

- `node --version` matches [`.nvmrc`](./.nvmrc) and the `nodejs` entry in [`.tool-versions`](./.tool-versions)
- `python --version` matches the `python` entry in [`.tool-versions`](./.tool-versions) and `requires-python` in [`pyproject.toml`](./pyproject.toml)
- `python -m ruff format --check src tests`, `python -m ruff check src tests`, and `python -m pyright --pythonpath "$(python -c 'import sys; print(sys.executable)')"` all pass
- Running the setup script completes with both hello checks green

## Security Information

Due to the nature of the project holding sensitive information, it is essential that all engineers working on the project have a common understanding of what privileges and secrets management is necessary.
1. When working on the project, all engineers must create code operating under the lowest level privileges possible to avoid harmful manipulation of unrelated systems.
2. All additions must be thoroughly reviewed to ensure that no secrets (API keys, tokens, forms filled in with authentic looking information) are used in AI prompts or committed to repositories. Any information that is not listed as *public* information (CUI and SBU information) should *never* be entered into prompts or committed.
3. Types of sensitive artifacts: API keys, service tokens, and environment variables. All of these should be checked to make sure that they are excluded in `.gitignore` (for example, `.env`).

### Security Checklist
- [ ] Code additions are being made at lowest level privileges affecting the least amount of code necessary
- [ ] Clearly fake synthetic information has been generated for any development of systems that process real sensitive information
- [ ] Ensure all `.env` files are ignored in the .gitignore
- [ ] `config.toml` file includes `sandbox_mode = "workspace-write"` (*never* `sandbox_mode = "danger-full-access"`) and `approval_policy = "on-request"`.
- Running the setup script completes with both hello checks and project checks green
