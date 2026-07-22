# Storage Decision Matrix

This matrix is the placement rule for data introduced in TaxPulse. It records the
target architecture; a row does not imply that its backing service has already been
provisioned or implemented.

| Data category | Store | Owning bounded context | Rationale |
| --- | --- | --- | --- |
| Transactional case data: tenants, Tax Plan Cycles, workflow stages, holds, persisted scenarios, and immutable audit history | PostgreSQL | Core Case Service | These records are the tenant-scoped system of record and require transactional writes, relational integrity, durable history, and consistent enforcement of workflow and access rules. |
| Plan Cycle Queue read model: denormalized, tenant-scoped queue items | DynamoDB | Core Case Service | The queue is a projection of case data optimized for independent, scalable reads by tenant rather than a source of record. It can be rebuilt from the transactional case store. |
| Queue cache entries | Redis | Core Case Service | Redis serves short-lived queue responses with low latency and reduces reads against the DynamoDB projection. Entries are disposable and must be invalidated when the corresponding queue projection changes. |
| Idempotency keys and their first-create result | Redis, with a 24-hour TTL | Core Case Service | Redis provides fast, atomic coordination for retry handling. The key is temporary request-deduplication state, so the 24-hour expiration bounds storage while covering normal client retries. |

## Ownership and access rules

- PostgreSQL is written only by the Core Case Service. It remains the authoritative
  source for transactional case data.
- DynamoDB contains only Core Case Service queue projections. It must not be used to
  update a Tax Plan Cycle or replace PostgreSQL as the source of record.
- Redis contains disposable Core Case Service operational state: queue-cache entries
  and idempotency records. It must not be the authoritative source for a case or an
  audit record.
- The Tax Engine owns calculation rules and execution, but it does not own any of the
  stores in this matrix. A future persistent Tax Engine store needs a separate
  architecture decision, consistent with [ADR-0009](../adr/0009-service-ownership-boundaries.md).

## Implementation implications

The queue cache and DynamoDB projection are dependent implementation work. Until they
exist, PostgreSQL remains the source of truth and no component may rely on a cache or
projection entry being present. When introduced, the Core Case Service must update its
queue projection from case changes and invalidate the affected Redis queue entry.

This document complements [ADR-0009](../adr/0009-service-ownership-boundaries.md),
which defines service-level authority over case and calculation data.
