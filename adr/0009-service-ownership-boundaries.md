# ADR-0009: Service Ownership Boundaries

## Context

TaxPulse separates case management and tax calculation into the Core Case Service and Tax Engine bounded contexts.

The Core Case Service manages tenant-scoped Tax Plan Cycles, including workflow stage, hold state, access rules, persisted scenarios, and case audit history. The Tax Engine receives calculation inputs and returns computed figures through its API.

Without clear ownership, either service could bypass the other’s rules, duplicate calculation logic, or write directly to records it does not own.

The Core Case Service currently persists case and scenario data in its Drizzle-backed PostgreSQL store. The Tax Engine does not currently persist calculation requests or results in a separate store.

## Decision

The Core Case Service is the system of record for Tax Plan Cycles and persisted scenario data. Only the Core Case Service may write those records to its Drizzle-backed PostgreSQL store.

The Tax Engine owns tax-calculation rules and execution. It receives calculation inputs through its API and returns computed figures, but it must not write directly to Core Case Service records.

The Core Case Service calls the Tax Engine through its supported API and persists the returned scenario figures on the case.

The Tax Engine does not currently write calculation results to a persistent store. Any future Tax Engine store, including storage for calculation results or tax-bracket reference data, requires a separate architectural decision or an update to this ADR.

## Consequences

* Case, scenario, workflow, tenant, and audit authority remain in the Core Case Service.
* Calculation rules and execution remain in the Tax Engine.
* The Core Case Service is the only service that writes case and scenario data to the Drizzle-backed PostgreSQL store.
* The Tax Engine cannot directly update case stages, scenarios, holds, access rules, or audit records.
* The Core Case Service must use the Tax Engine API rather than duplicate its calculation logic.
* Calculation requests and responses require an explicit service contract.
* The Core Case Service must handle Tax Engine failures, timeouts, and invalid responses.
* Historical calculation reproducibility is limited unless input snapshots and engine-version information are persisted in future work.

## Alternatives considered

* **Allow the Tax Engine to write directly to the Core Case Service database.** Rejected because it would bypass case ownership, tenant checks, workflow rules, and audit controls.
* **Use a shared database while each service writes only its own tables.** Rejected because a shared schema and deployment lifecycle would still make the database an implicit cross-service contract. It would increase coupling and make enforcing independent store ownership harder as the services evolve.
* **Persist calculation results in a new Tax Engine store now.** Rejected because the current architecture does not require or define a separate calculation-results store.
* **Move calculation logic into the Core Case Service.** Rejected because calculation behavior belongs to the Tax Engine bounded context.
* **Duplicate calculation logic in both services.** Rejected because the implementations could diverge and produce inconsistent results.
