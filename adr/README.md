# Architecture Decision Records

This directory captures durable architecture and domain decisions for TaxPulse.

## Index
- [ADR-0001: Tax Plan Cycle condition lives in stage](./0001-condition-lives-in-stage.md)
- [ADR-0002: Pyright Testing with Ruff](./0002-pyright-testing.md)
- [ADR-0003: AsyncIO Testing Utility](./0003-asyncio-testing.md)
- [ADR-0004: Testcontainers](./0004-Testcontainers.md)
- [ADR-0005: Use drizzle-seed for deterministic synthetic seed data](./0005-drizzle-seed-installation.md)
- [ADR-0006: Use Vitest coverage-v8 for TypeScript coverage reporting](./0006-vitest-coverage-v8.md)
- [ADR-0007: Use Argon2id for password login verification](./0007-argon2id-password-login.md)
- [ADR-0008: Add append-only audit entries per case](./0008-append-only-audit-entry.md)
- [ADR-0009: Service Ownership Boundaries](./0009-service-ownership-boundaries.md)
- [ADR-0010: Tenant-scoped case creation idempotency](./0010-tenant-scoped-case-creation-idempotency.md)
- [ADR-0011: Version Tax Plan Cycle API under /v1](./0011-versioned-tax-plan-cycle-api.md)
- [ADR-0012: Python DynamoDB Queue Projection with LocalStack](./0012-python-dynamodb-queue-projection-localstack.md)
- [ADR-0013: Tax liability engine namespace and layout refactor](./0013-tax-liability-engine-namespace-refactor.md)
- [ADR-0014: Redis cache-aside for Tax Plan Cycle Queue reads](./0014-redis-cache-aside-queue-reads.md)
- [ADR-0015: Tax Plan Cycle feature slice Architecture](./0015-tax-plan-cycle-feature-slice.md)
- [ADR-0016: FastAPI Startup Convention for the Liability Engine](./0016-fastapi-startup-convention.md)
- [ADR-0017: Nest the Pulse UI React/Vite shell under src/pulseUI](./0011-pulse-ui-react-vite-shell.md)