# ADR-0009: Service Ownership Boundaries

## Context
TaxPulse has separate Core Case Service and Tax Engine bounded contexts. A Tax Plan
Cycle is the advisor-facing case record: it carries tenant-scoped identity, lifecycle
stage, access and workflow rules, and immutable case audit history. Tax calculations
are derived work performed from calculation inputs and produce calculation results.

As the services evolve independently, unclear ownership could lead to either service
writing the other's records, duplicating business rules, or treating derived
calculation output as the source of truth for case workflow. That would weaken tenant
and authorization boundaries and make changes harder to reason about.

The Core Case Service currently persists its case records through its Drizzle-backed
PostgreSQL store. The Tax Engine requires its own calculation-result store, separate
from the Core Case Service's case store. 

## Decision
The Core Case Service is the system of record for Tax Plan Cycles (cases). It owns case
creation, tenant association, workflow stage and hold state, access and portal scope,
and per-case audit history. Only the Core Case Service may write case records to its
Drizzle-backed PostgreSQL store.

The Tax Engine is the system of record for tax calculations. It owns calculation
execution and the calculation inputs, outputs, assumptions, and calculation status
needed to reproduce and interpret a result. Only the Tax Engine may write calculation
records to the Tax Engine calculation store: `<named store>`.

Services must integrate through explicit contracts. The Tax Engine may consume a
case-scoped calculation request, but it must not write or mutate Tax Plan Cycle records.
Likewise, the Core Case Service may request or read calculation results through the Tax
Engine's supported contract, but it must not directly write the Tax Engine's
calculation records.

## Consequences
- Case lifecycle authority stays in one place. The Core Case Service remains responsible
  for validating tenant scope, workflow transitions, holds, access rules, portal scope,
  and audit writes before changing a Tax Plan Cycle. Tax Engine work cannot bypass those
  rules by updating case data directly.

- Calculation behavior can evolve independently. The Tax Engine can change calculation
  rules, add result metadata, retry execution, or change its internal persistence model
  without requiring a Core Case Service database migration, provided its supported
  integration contract remains compatible.

- Each context has an explicit write store. Core Case Service writes case data to its
  Drizzle-backed PostgreSQL store; Tax Engine writes calculation data only to
  `<named Tax Engine calculation store>`. Schema migrations and database permissions
  must preserve this separation.

- Cross-context operations require an integration contract. A calculation request must
  carry the identifiers and inputs needed by the Tax Engine, and a calculation result
  must be returned or published through a supported contract. Developers cannot use a
  shared table or direct repository call as a shortcut.

- End-to-end work becomes more operationally complex. A case action that requires a
  calculation may involve network calls or asynchronous processing, so callers must
  handle timeouts, retries, partial failure, and eventual availability of a result.

- Some information is intentionally duplicated at the boundary. The Tax Engine may need
  a snapshot of case-relevant calculation inputs rather than a live database join.
  That duplication requires clear contract versioning and may create temporary
  differences while updates propagate.

- Cross-service reporting is less convenient. Queries that need both case workflow data
  and calculation data cannot rely on one transactional database join. They need a
  supported read model, API composition, or an explicitly maintained projection.

- Ownership changes require deliberate migration. Moving a field or entity from one
  service to the other later will require data migration, contract rollout, and
  compatibility planning; it is not a local schema refactor.

  ## Alternatives considered
- **Use a shared database and allow both services to write the same tables.**
  This reduces short-term integration work, but makes the schema a shared internal
  contract. Either service could bypass the other's validation, tenant isolation,
  workflow, or audit rules, so this option is rejected.

- **Have the Core Case Service own both cases and tax calculations.**
  This would simplify the current deployment and avoid a service boundary. It is
  rejected because calculation rules, execution lifecycle, and result retention have
  different change pressures from advisor-facing case workflow and access management.

- **Have the Tax Engine own Tax Plan Cycles as well as calculations.**
  This centers the domain on the calculation engine, but it incorrectly puts case
  lifecycle, tenant access, portal scope, and immutable audit responsibilities in the
  calculation bounded context. It is rejected.

- **Allow direct cross-service writes while keeping separate stores.**
  For example, let the Tax Engine update a case stage or let Core Case Service insert
  calculation-result records. Separate stores alone do not preserve ownership if
  another service can write them. This option is rejected in favor of explicit
  integration contracts.

- **Duplicate full case records in the Tax Engine and permit independent updates.**
  Local copies could make calculation execution easier, but independently mutable
  copies create conflicting sources of truth for case identity and workflow. The Tax
  Engine may retain only the calculation inputs and case references required for its
  work; it does not own a writable case replica.