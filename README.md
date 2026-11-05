# TaxPulse Advisory

TaxPulse Advisory is a multi-tenant SaaS workspace for tax-liability planning. Its core
case entity is the Tax Plan Cycle, with stage-based workflow state, role-gated transitions,
tenant-scoped access, and immutable audit history.

## Architecture

The workspace contains three primary applications:

- The TypeScript Core Case Service owns Tax Plan Cycles, authentication, workflow,
  persistence, integrations, and audit behavior.
- The Python Tax Engine performs tenant-scoped tax calculations and scenario comparisons.
- Pulse UI is the React/Vite operator workspace.

PostgreSQL stores transactional data, DynamoDB supports queue projections, and Redis is a
disposable queue-read cache. See the
[storage decision matrix](./docs/storage-decision-matrix.md) for ownership boundaries.

Important domain constraints:

- Workflow condition lives in the Tax Plan Cycle `stage`; do not add a separate case
  `status`.
- Preserve tenant isolation, least privilege, scoped portal access, and immutable audit
  behavior.
- Use clearly fake synthetic data only.

## Repository Layout

- [`src/typescript`](./src/typescript) — Core Case Service and shared TypeScript code
- [`tests/typescript`](./tests/typescript) — TypeScript tests
- [`src/tax_liability_engine`](./src/tax_liability_engine) — Python Tax Engine
- [`tests/tax_liability_engine`](./tests/tax_liability_engine) — Python tests
- [`src/pulseUI`](./src/pulseUI) — React/Vite application and component tests
- [`adr`](./adr) — architecture decision records
- [`docs`](./docs) — development, operations, and architecture documentation
- [`deployment`](./deployment) and [`terraform`](./terraform) — deployment assets
- [`planning`](./planning) — project planning and team workflow material

## Prerequisites

- Node.js 22.0.0, pinned in [`.nvmrc`](./.nvmrc) and
  [`.tool-versions`](./.tool-versions)
- Python 3.13.14, pinned in [`.tool-versions`](./.tool-versions) and
  [`pyproject.toml`](./pyproject.toml)
- `nvm` and `pyenv` on macOS/Linux, or nvm for Windows and the Python launcher on Windows
- Docker Desktop or a compatible Docker Engine for local services and integration tests

## Quick Start

Run the platform-specific setup script from the repository root:

```powershell
./setup.ps1
```

```bash
./setup.sh
```

The scripts install the pinned runtimes and dependencies, then run the TypeScript and
Python checks. On Windows, reopen PowerShell if newly installed commands are not visible.

Create a local environment file before starting services:

```powershell
Copy-Item .env.example .env
```

```bash
cp .env.example .env
```

Replace the relevant placeholders in `.env`; never commit that file. Detailed environment
and startup guidance is in [Local Development](./docs/local-development.md).

Start the API and UI in separate terminals:

```bash
npm run stack:up
npm run dev:web
```

For tenant-scoped local login, open a slugged hostname such as
`http://north-star-planning.localhost:5173/sign-in`, not plain `localhost`.

## Common Commands

| Task | Command |
| --- | --- |
| Start the Core Case Service | `npm run dev` |
| Start Pulse UI | `npm run dev:web` |
| Build the Core Case Service | `npm run build` |
| Build Pulse UI | `npm run build:web` |
| Run TypeScript checks and tests | `npm test` |
| Verify Pulse UI | `npm run verify:pulse-ui` |
| Run Python tests | `python -m pytest` |
| Start the local Compose stack | `npm run stack:up` |
| Smoke-test the local stack | `npm run stack:smoke` |
| Stop the local Compose stack | `npm run stack:down` |
| Apply database migrations | `npm run db:migrate` |
| Load synthetic seed data | `npm run seed` |

## Validation

Run the relevant checks from the repository root:

```bash
npm run typecheck
npm test
npm run verify:pulse-ui
python -m ruff format --check src tests
python -m ruff check src tests
python -m pyright --pythonpath "$(python -c 'import sys; print(sys.executable)')"
python -m pytest
```

Docker must be running for integration tests:

```bash
npm run test:integration
```

Generate TypeScript and Pulse UI coverage separately:

```bash
npm run test:cov
npm --prefix src/pulseUI run test:cov
```

## Local Services

The full Compose stack provides:

- Core Case Service at `http://localhost:3000`
- Tax Engine at `http://localhost:8000`
- PostgreSQL at `localhost:25432`
- Redis at `localhost:6379`
- RedisInsight at `http://localhost:5540`

The stack seeds a disposable local database before starting Core. Review
[Docker and Compose](./docs/docker.md) before running it, especially the required `.env`
values and destructive seed behavior.

## Documentation

| Topic | Document |
| --- | --- |
| Environment setup, local login, LocalStack, and Redis | [Local Development](./docs/local-development.md) |
| Standalone containers and the full Compose stack | [Docker and Compose](./docs/docker.md) |
| PostgreSQL, Drizzle migrations, and seed data | [Database Development](./docs/database.md) |
| Password login, tenant resolution, JWTs, and JWKS | [Authentication](./docs/authentication.md) |
| Core Case Service and Tax Engine HTTP surfaces | [API Guide](./docs/api.md) |
| Corpus collection and RAGAS evaluation | [AI-Assist Evaluation](./docs/assist-evaluation.md) |
| Data-store ownership | [Storage Decision Matrix](./docs/storage-decision-matrix.md) |
| Service health targets | [Service-Level Objectives](./docs/service-level-objectives.md) |
| Incident handling | [Incident Runbook](./docs/incident-runbook.md) |
| Security requirements and checklist | [Security Policy](./SECURITY.md) |
| Architecture decisions | [ADR Index](./adr/README.md) |

## Contributing

Follow [`AGENTS.md`](./AGENTS.md) and [`CONTRIBUTING.md`](./CONTRIBUTING.md). Before
requesting review:

1. Use the repository branch-naming convention.
2. Complete [the pull request template](./.github/pull_request_template.md).
3. Run the [AI review checklist](./planning/ai-review-checklist.md).
4. Use the [sample pull request](./planning/sample-pr.md) as a guide.
5. Keep secrets, `.env` files, and real or realistic taxpayer data out of commits and AI
   prompts.
