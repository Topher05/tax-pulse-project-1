# ADR-0004: Testcontainers-Managed PostgreSQL Fixture for Integration Tests

## Context
The TypeScript repository integration tests need a real PostgreSQL instance so we can verify tenant-scoped reads, migrations, and seed behavior against the same database engine used in production-like flows.

The current placeholder approach shells out to Docker directly and depends on local container availability and manual setup. That path is brittle, hard to keep consistent across machines, and does not provide a clean suite-scoped lifecycle for starting, seeding, and tearing down a disposable database.

The earlier shell-based Docker placeholder depended on manual container management and was harder to keep consistent across developer machines. We also want to keep `DATABASE_URL` reserved for the application runtime path instead of reusing it for ephemeral test infrastructure.

We already have a shared `seed.sql` and migration flow for local development. We want to keep that seed source single-purpose and reusable while moving the repository integration suite to a real disposable database fixture.

## Decision
Use Testcontainers to manage a PostgreSQL container for the TypeScript integration suite.

The integration fixture will:
- start a disposable PostgreSQL container at suite setup,
- apply the repository migrations against that container,
- load sample seed data from the shared `seed.sql` at root,
- expose a connection string only to the integration harness,
- tear the container down after the suite finishes.

The application runtime connection string remains separate. The Testcontainers fixture is only for repository integration coverage and must not repurpose the app’s `DATABASE_URL`.

The shared `seed.sql` will serve as the canonical seed source unless a separate fixture seed is absolutely required.


## Consequences
Integration tests now exercise a real PostgreSQL instance without relying on a hand-written shell wrapper or a manually managed container lifecycle.

This improves confidence in:
- tenant isolation,
- SQL schema compatibility,
- migration behavior,
- seed/load behavior.

The tradeoffs are:
- Docker **must** be available for the integration suite,
- test startup time will be higher than pure unit tests, which adds time to both development & code reviews
- the fixture introduces one additional test dependency in development environments.

The current workspace is pinned to Node `22.0.0`, so the Testcontainers dependency tree must avoid `undici@8`, which requires Node `>=22.19.0`. As such a workaround with `override: {...}` is required in base `package.json`. An incorrect version breaks the test suite