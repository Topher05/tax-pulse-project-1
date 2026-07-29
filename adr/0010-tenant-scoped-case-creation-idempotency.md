# ADR-0010: Tenant-scoped case creation idempotency

## Context

TaxPulse creates Tax Plan Cycles through the Core Case Service. A successful create
persists the cycle in Intake, writes the initial stage transition, writes the audit entry,
and returns the generated case ID.

Client retries can happen after timeouts, connection drops, or ambiguous responses. Without
an idempotency record, a retried create request can insert duplicate cycles and duplicate
the initial transition and audit side effects.

Idempotency must preserve tenant isolation. Different tenants may use the same retry key
without sharing or exposing results.

## Decision

Case creation requires a non-empty `Idempotency-Key` request header.

For every valid create request, the Core Case Service stores the first successful create
result in Redis for 24 hours, scoped by tenant ID and idempotency key. The Redis key uses
the `idem:<tenantId>:<Idempotency-Key>` shape, and the stored result for this operation is
the generated `case_id`.

Repeated create requests with the same tenant ID and idempotency key return the stored
original `case_id` instead of creating another Tax Plan Cycle.

Concurrent create requests with the same tenant ID and idempotency key are coordinated
through Redis. The request that claims the Redis key first creates the Tax Plan Cycle and
stores the completed result; later same-key requests wait briefly for the completed
`case_id` and return it without inserting duplicate cycle, transition, or audit rows.

The idempotency record lives in Redis because it is temporary operational retry state, not
transactional case history. PostgreSQL remains the system of record for Tax Plan Cycles,
stage transitions, and audit entries.

## Consequences

* Retried case creation can safely replay the original successful response.
* Distinct idempotency keys still create distinct Tax Plan Cycles.
* The idempotency key namespace is tenant-scoped, preserving isolation between firms.
* Missing or blank idempotency keys are rejected before case creation runs.
* The stored response is intentionally minimal: only the generated case ID is persisted.
* Same-key concurrent creates are coordinated by Redis and replay the first completed
  result.
* Redis must be available for case creation; the service fails closed rather than creating
  without idempotency protection.

## Alternatives considered

* **Keep `Idempotency-Key` optional for compatibility.** Rejected because create retries
  should be safe by default for every client that uses the case creation boundary.
* **Use a global idempotency key namespace.** Rejected because tenant isolation requires the
  same key value to be reusable independently by different tenants.
* **Store idempotency records in PostgreSQL.** Rejected because idempotency keys are
  temporary retry state and the storage decision matrix assigns them to Redis with a
  24-hour TTL.
* **Rely only on the unique tenant/key index for concurrency.** Rejected because the losing
  concurrent request would fail after attempting duplicate side effects instead of waiting
  for and returning the first successful result.
* **Persist the full HTTP response body.** Rejected for this ticket because the accepted
  create response only contains `case_id`; storing more data would add complexity without
  improving current behavior.
