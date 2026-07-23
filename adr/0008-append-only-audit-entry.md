# ADR-0008: Add append-only audit entries per case

## Context
TaxPulse Advisory needs immutable per-case evidence for who did what, when, and with
what outcome. SCRUM-43 established durable stage transition history, and later tickets
will write successful and denied workflow attempts into the audit trail. SCRUM-65 adds
the storage foundation for those future writes without depending on the JWT/auth tickets
or the role-gated transition endpoint.

The current Core Case Service persistence path is Drizzle-backed PostgreSQL migrations.
The stable case identifier is `tax_plan_cycle.id`, not `client_id`, so audit history
must reference that generated case ID.

## Decision
Create an `audit_entry` table in the active Drizzle schema and forward migration path.
The table stores:

- `id` as a generated UUID primary key,
- `case_id` as a foreign key to `tax_plan_cycle.id`,
- `actor`,
- `action`,
- `outcome`,
- `occurred_at`.

Protect `audit_entry` with a PostgreSQL trigger that raises an exception before any
`UPDATE` or `DELETE`. This makes the table append-only at the database layer, not only
by application convention.

Keep `actor` as text for now. Future authentication or workflow tickets can decide
whether the actor value is a user ID, service principal, JWT subject, or display label
without making SCRUM-65 depend on SCRUM-61 through SCRUM-64.

## Consequences
Audit immutability is enforced even if a future repository or SQL caller attempts to
mutate rows directly. Tests can assert PostgreSQL failures for both update and delete
attempts.

The audit table is ready for SCRUM-66 stage-transition audit writes and SCRUM-67 denied
attempt auditing, but this decision does not implement those behaviors. The table also
does not introduce role gates, JWT parsing, refresh-token persistence, or FastAPI JWT
validation.

Per-case audit reads can use the `(case_id, occurred_at)` index. Because audit entries
are append-only, corrections must be represented as new audit entries rather than edits
to existing rows.

## Alternatives considered
- Rely on application code to avoid updates and deletes.
- Use PostgreSQL privileges only to deny mutation.
- Store audit details only in `stage_transition`.
- Link `audit_entry.case_id` to `client_id` instead of the generated case ID.
