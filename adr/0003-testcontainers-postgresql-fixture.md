# ADR-0003: Testcontainers PostgreSQL Fixture for Repository Integration

## Context
The TypeScript repository integration tests need a real PostgreSQL instance so we can verify migration behavior, synthetic seed loading, and tenant-scoped reads against the same database engine used by the application.

The earlier shell-based Docker placeholder depended on manual container management and was harder to keep consistent across developer machines. We also want to keep `DATABASE_URL` reserved for the application runtime path instead of reusing it for ephemeral test infrastructure.

## Decision
Use Testcontainers to start a disposable PostgreSQL container for the repository integration suite.

The fixture will:
- start one container at suite setup,
- apply the repository migrations inside that container,
- load the shared root `seed.sql`,
- expose a container-specific connection string to the test harness,
- stop and clean up the container after the suite completes.

The shared `seed.sql` remains the single seed source for local seeding and the integration fixture unless a separate seed becomes necessary later.

## Consequences
Repository integration tests now exercise a real PostgreSQL instance without relying on the shell-based Docker placeholder.

This improves confidence in:
- tenant isolation,
- schema compatibility,
- migration behavior,
- seed loading.

The tradeoffs are:
- Docker must be available for integration runs,
- startup time is higher than unit-only tests,
- the fixture adds one more local development dependency.

The integration seed must continue to use synthetic data only and avoid secrets, tokens, or real taxpayer records.
