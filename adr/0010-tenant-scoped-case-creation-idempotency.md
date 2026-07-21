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
result in PostgreSQL, scoped by tenant ID and idempotency key. The stored result for this
operation is the generated `case_id`.

Repeated create requests with the same tenant ID and idempotency key return the stored
original `case_id` instead of creating another Tax Plan Cycle.

The idempotency record lives in the Core Case Service PostgreSQL store because it protects
the same transactional case creation path that owns Tax Plan Cycles, stage transitions, and
audit entries.

## Consequences

* Retried case creation can safely replay the original successful response.
* Distinct idempotency keys still create distinct Tax Plan Cycles.
* The idempotency key namespace is tenant-scoped, preserving isolation between firms.
* Missing or blank idempotency keys are rejected before case creation runs.
* The stored response is intentionally minimal: only the generated case ID is persisted.
* Full concurrent same-key coordination remains a follow-up concern for SCRUM-77.

## Alternatives considered

* **Keep `Idempotency-Key` optional for compatibility.** Rejected because create retries
  should be safe by default for every client that uses the case creation boundary.
* **Use a global idempotency key namespace.** Rejected because tenant isolation requires the
  same key value to be reusable independently by different tenants.
* **Store idempotency records outside PostgreSQL.** Rejected because Redis or another cache
  would not provide the same durable transaction boundary as the case creation write path.
* **Persist the full HTTP response body.** Rejected for this ticket because the accepted
  create response only contains `case_id`; storing more data would add complexity without
  improving current behavior.
