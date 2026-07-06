# Shared Team Ticket Journal

This journal records Jira-ticket implementation work from `planning/stackpulse_tax.csv`
and ties each ticket back to the code, tests, and validation evidence produced for it.

## martins-okorie-jira33 - SCRUM-33

**Branch:** `martins-okorie-jira33`

**Owner:** Chimaobi Martins Okorie

**Epic:** SCRUM-12 - Engineering Foundations & Federal Posture

**Summary:** Surface aggregation timeouts as rejected promises

**CSV Description:** As a Backend Developer, I want a simulated source timeout surfaced
as a rejected promise, so that the Data Aggregation stage never hangs on a slow source.

**Acceptance Criteria:**

- The client races the source call against a configurable timeout.
- A simulated timeout rejects with a typed timeout error rather than hanging.
- A Vitest case asserts the rejection and that a fast call still resolves.

**How This Ties Into the Code:**

- `TaxPulseAggregationClient` now accepts optional timeout configuration while keeping
  the existing constructor call shape valid.
- Aggregation fetches race the source promise against a timeout promise and reject with
  `AggregationTimeoutError` when the timeout wins.
- The timeout error carries the affected `clientId` and configured `timeoutMs` for
  typed handling by callers and tests.
- `tests/typescript/aggregationClient.test.ts` verifies both the timeout rejection and
  the fast-source success path with deterministic fake timers.

**Tradeoffs:**

- Timeout handling rejects the client call but does not cancel the underlying
  data-source promise because the current source interface has no abort signal.
- Constructor-level timeout configuration preserves existing callers while making the
  timeout configurable for slow-source simulations.
- A `1000ms` default prevents hangs without making local mock behavior brittle.

**Project Scope Connection:**

TaxPulse Advisory depends on the Data Aggregation stage to gather client income and
deduction information without blocking the Tax Plan Cycle workflow. This ticket keeps a
slow simulated source from hanging aggregation work, which protects stage progression and
maintains predictable backend behavior for tenant-scoped planning workflows.

**Changed Files:**

- `src/typescript/aggregationClient.ts`
- `src/typescript/index.ts`
- `tests/typescript/aggregationClient.test.ts`
- `planning/team/ticket-journal.md`

**Validation Notes:**

- `npm run typecheck` passed.
- `npx vitest run tests/typescript/aggregationClient.test.ts` passed.
- `npm test` was rerun with local socket permissions; all non-migration suites passed
  with 41 tests, but the migration suites require `DATABASE_URL` in this local
  environment.

## martins-okorie-jira43 - SCRUM-43

**Branch:** `martins-okorie-jira43`

**Owner:** Chimaobi Martins Okorie

**Epic:** SCRUM-13 - Domain Model & Walking Skeleton

**Summary:** Create the `stage_transition` table

**CSV Description:** As a Backend Developer, I want a `stage_transition` table, so that
every stage change on a Tax Plan Cycle is recorded.

**Acceptance Criteria:**

- A migration creates `stage_transition` with `case_id` FK, `from_stage`, `to_stage`,
  `actor`, and `occurred_at`.
- A foreign key ties each transition to its `tax_plan_cycle`.
- An index on `case_id` supports reading a case's transition history.

**How This Ties Into the Code:**

- `migrations/20260626120000_create_tax_plan_cycle.sql` now creates the
  `stage_transition` table after `tax_plan_cycle`.
- `stage_transition.case_id` references `tax_plan_cycle.client_id`, matching the current
  Tax Plan Cycle primary key.
- `from_stage` and `to_stage` use check constraints with the same seven canonical
  workflow stages as `tax_plan_cycle.stage`.
- `stage_transition_case_id_idx` supports reading transition history by case.
- `tests/typescript/taxPlanCycleMigration.test.ts` verifies the table shape, FK, stage
  checks, index, valid transition insert/read, missing-case rejection, and invalid-stage
  rejection.
- `vitest.config.ts` no longer excludes the migration test, so `npm run test:migration`
  reaches the intended test file.

**Project Scope Connection:**

TaxPulse Advisory is built around a Tax Plan Cycle that moves through defined workflow
stages with role-gated transitions and immutable audit history. This ticket supports
that scope by creating the database table that records every stage change for a cycle.
That transition history is a foundation for reviewer visibility, compliance evidence,
and the archived audit trail described in the project scope.

**Changed Files:**

- `migrations/20260626120000_create_tax_plan_cycle.sql`
- `tests/typescript/taxPlanCycleMigration.test.ts`
- `vitest.config.ts`

**Validation Notes:**

- `npm run typecheck` passed.
- `npm run test:migration` now starts and reaches
  `tests/typescript/taxPlanCycleMigration.test.ts`, but this local environment needs
  `DATABASE_URL` set before the PostgreSQL migration test can execute.

## dylan-harle-jira48 - SCRUM-48

**Branch:** `dylan-harle-jira48`

**Owner:** Dylan Harle

**Epic:** SCRUM-13 - Domain Model & Walking Skeleton

**Summary:** Add the create-cycle route with zod validation

**CSV Description:** As a Backend Developer, I want a create-cycle route validated with
zod, so that malformed Tax Plan Cycle creates are rejected at the boundary.

**Acceptance Criteria:**

- A POST route validates the create body against the Tax Plan Cycle create schema.
- A malformed request returns 400 with a structured validation error.
- A valid request reaches the controller layer with no persistence yet.

**How This Ties Into the Code:**

- `createApp` now owns JSON body parsing before registered feature routes, so the
  create-cycle endpoint runs through the SCRUM-47 Express skeleton instead of a
  route-only test harness.
- `main` registers `createTaxPlanCycleRouter` through `createApp`, connecting the
  no-persistence create endpoint to the Core Case Service HTTP surface.
- Malformed create bodies are raised as `ProblemHttpError` instances and returned by
  the shared RFC 7807 Problem Details middleware with validation issues attached as
  safe extension data.
- Controller failures also flow through the same Problem Details middleware, while
  valid creates still reach the controller stub and return the accepted response.
- `tests/typescript/taxPlanCycleRoutes.test.ts` boots the route through `createApp`
  to verify JSON parsing, shared error handling, and controller delegation together.

**Project Scope Connection:**

TaxPulse Advisory centers work around the Tax Plan Cycle. This ticket adds the first
write-side HTTP boundary for creating a cycle while preserving the project constraints
that workflow state remains in the case stage and malformed boundary input is rejected
before it can affect downstream case, tenant, audit, or persistence behavior.

**Changed Files:**

- `package-lock.json`
- `src/typescript/app.ts`
- `src/typescript/errors.ts`
- `src/typescript/index.ts`
- `src/typescript/taxPlanCycleRoutes.ts`
- `tests/typescript/taxPlanCycleRoutes.test.ts`
- `planning/team/ticket-journal.md`

**Validation Notes:**

- `npm install` completed and installed the SCRUM-47 logging dependencies declared in
  `package.json`.
- `npm run typecheck` passed.
- `npm test` passed, including smoke tests and Vitest coverage for the health
  endpoint, pino request logging, Problem Details middleware, and the create-cycle
  route through `createApp`.

## dylan-harle-jira49 - SCRUM-49

**Branch:** `dylan-harle-jira49`

**Owner:** Dylan Harle

**Epic:** SCRUM-13 - Domain Model & Walking Skeleton

**Summary:** Add the read-cycle route

**CSV Description:** As a Backend Developer, I want a read-cycle route by case ID, so
that a created Tax Plan Cycle can be fetched back.

**Acceptance Criteria:**

- A GET route accepts a case ID path parameter and validates it.
- An unknown case ID returns 404 as Problem Details.
- The route is tenant-scoped via the request's tenant context.

**How This Ties Into the Code:**

- `taxPlanCycleSchema` uses `client_id` as the Tax Plan Cycle unit-of-work identifier
  exposed through the current `caseId` route parameter.
- `tax_plan_cycle` follows the SCRUM-42 table shape without a separate `case_id`
  column, while transition history still uses the SCRUM-43 `stage_transition.case_id`
  column to reference `tax_plan_cycle.client_id`.
- `createTaxPlanCycleRouter` now serves `GET /tax-plan-cycles/:caseId`, validates
  the path parameter with zod, reads tenant scope from `req.tenant.id`, and delegates
  to `findByCaseId({ tenantId, caseId })`.
- Missing or cross-tenant cycles return the shared RFC 7807 Problem Details response
  with a 404 status, preserving tenant isolation by not revealing cross-tenant
  existence.

**Project Scope Connection:**

TaxPulse Advisory centers work around tenant-scoped Tax Plan Cycles. This ticket adds
the read-side HTTP boundary needed to fetch a cycle by its case identifier while
preserving stage-based workflow state, tenant isolation, and the shared Problem
Details error contract.

**Changed Files:**

- `migrations/20260626120000_create_tax_plan_cycle.sql`
- `src/typescript/index.ts`
- `src/typescript/taxPlanCycle.ts`
- `src/typescript/taxPlanCycleCreateController.ts`
- `src/typescript/taxPlanCycleRoutes.ts`
- `tests/typescript/smoke.test.ts`
- `tests/typescript/taxPlanCycle.test.ts`
- `tests/typescript/taxPlanCycleMigration.test.ts`
- `tests/typescript/taxPlanCycleRoutes.test.ts`
- `planning/team/ticket-journal.md`

**Validation Notes:**

- `npm run typecheck` passed.
- `npm test` passed.
- `npm run test:migration` did not execute the migration test because the current
  `vitest.config.ts` explicitly excludes `tests/typescript/taxPlanCycleMigration.test.ts`;
  Vitest exited with "No test files found."

## development - SCRUM-50

**Branch:** `development`

**Owner:** Reyhan Daniels

**Epic:** SCRUM-13 - Domain Model & Walking Skeleton

**Summary:** Publish the OpenAPI document for create and read

**CSV Description:** As a Backend Developer, I want an OpenAPI description of the
create and read operations, so that the contract is published before clients consume it.

**Acceptance Criteria:**

- An OpenAPI document describes the create and read operations with their
  request/response schemas.
- The document is served at a documented path and validates against the OpenAPI spec.

**How This Ties Into the Code:**

- `createCoreCaseOpenApiDocument` publishes an OpenAPI 3.0.3 document for
  `POST /tax-plan-cycles` and `GET /tax-plan-cycles/{caseId}`.
- The document derives Tax Plan Cycle request, read parameter, and read response schemas
  from the same Zod definitions used by the route boundary.
- The create acknowledgment response now has a small Zod schema source so the OpenAPI
  response schema is not maintained as an unrelated hand-written contract.
- `createCoreCaseOpenApiRouter` serves the document at `GET /openapi.json`, and service
  startup registers it with the existing Core Case Service routes.
- `README.md` documents the OpenAPI path and the covered create/read operations.
- `tests/typescript/coreCaseOpenApi.test.ts` verifies the served document, operation
  coverage, schema contents, source schema registrations, and local OpenAPI structure.

**Project Scope Connection:**

TaxPulse Advisory exposes tenant-scoped Tax Plan Cycle operations to client teams.
Publishing the create/read OpenAPI contract gives client teams a stable, documented
boundary while preserving tenant isolation language, the stage-based workflow model,
and fake-only synthetic examples.

**Changed Files:**

- `README.md`
- `planning/team/ticket-journal.md`
- `src/typescript/coreCaseOpenApi.ts`
- `src/typescript/coreCaseOpenApiRoutes.ts`
- `src/typescript/index.ts`
- `src/typescript/taxPlanCycleCreateController.ts`
- `tests/typescript/coreCaseOpenApi.test.ts`

**Validation Notes:**

- `npm run typecheck` passed.
- `npm test` passed, including the OpenAPI document tests.
- `python -m ruff format --check src/python tests/python` passed.
- `python -m pytest` passed with 4 tests; pytest emitted a local cache warning because
  it could not write under `.pytest_cache`.

## martins-okorie-jira51 - SCRUM-51

**Branch:** `martins-okorie-jira51`

**Owner:** Chimaobi Martins Okorie

**Epic:** SCRUM-13 - Domain Model & Walking Skeleton

**Summary:** Define the Drizzle schema for the Tax Plan Cycle tables

**CSV Description:** As a Backend Developer, I want Drizzle schema definitions matching
the PostgreSQL tables, so that persistence is type-safe and migration-driven.

**Acceptance Criteria:**

- Drizzle definitions match the tenant, tax_plan_cycle, and stage_transition tables.
- A generated migration creates the tables from empty and matches the hand-written
  migrations.
- Running migrations is idempotent and recorded in a migrations table.

**How This Ties Into the Code:**

- `src/typescript/db/schema.ts` defines exported Drizzle tables for `tenants`,
  `tax_plan_cycle`, and `stage_transition` with the intended columns, constraints,
  indexes, and foreign keys.
- `drizzle.config.ts` points Drizzle Kit at the TypeScript schema and writes generated
  migration evidence into `drizzle/`.
- `migrations/20260626120000_create_tax_plan_cycle.sql` now matches SCRUM-42 by
  omitting `case_id` from `tax_plan_cycle`, while SCRUM-43 transition history keeps
  `stage_transition.case_id` as a foreign key to `tax_plan_cycle.client_id`.
- `applyMigrations` now creates `schema_migrations`, records applied SQL files, and
  skips already-applied migrations so reruns are idempotent.
- Migration tests verify the table contract, Drizzle-generated SQL evidence, migration
  tracking, idempotent reruns, and the foreign key/check-constraint behavior.

**Project Scope Connection:**

TaxPulse Advisory centers work on tenant-scoped Tax Plan Cycles with stage-based
workflow state and durable transition history. This ticket gives the Core Case Service
a typed Drizzle schema for those persistence tables while preserving tenant isolation,
the no-separate-status rule, and migration evidence needed for a defensible walking
skeleton.

**Changed Files:**

- `README.md`
- `drizzle.config.ts`
- `drizzle/`
- `migrations/20260625120000_create_tenants.sql`
- `migrations/20260626120000_create_tax_plan_cycle.sql`
- `package-lock.json`
- `package.json`
- `src/typescript/db/schema.ts`
- `src/typescript/index.ts`
- `src/typescript/postgresMigrations.ts`
- `tests/typescript/taxPlanCycleMigration.test.ts`
- `tests/typescript/tenantsMigration.test.ts`
- `planning/team/ticket-journal.md`

**Validation Notes:**

- `npm run typecheck` passed.
- `npm run db:check` passed.
- `npm run db:generate` created the Drizzle migration evidence; a second run reported
  no schema changes.
- `npm test` passed with local socket permissions; 8 files and 49 tests passed.
- `npm run test:migration` passed with local PostgreSQL socket permissions; 7 tests
  passed.
- Python validation commands could not run in this shell because `python`/`python3`
  are Python 3.13.2 and do not have Ruff, Pyright, or pytest installed, while
  `pyproject.toml` requires Python 3.13.14 exactly.

## dylan-harle-jira52 - SCRUM-52

**Branch:** `dylan-harle-jira52`

**Owner:** Dylan Harle

**Epic:** SCRUM-13 - Domain Model & Walking Skeleton

**Summary:** Implement the Tax Plan Cycle repository through Drizzle

**CSV Description:** As a Backend Developer, I want a repository that inserts and reads
a Tax Plan Cycle through Drizzle, so that the service persists cases via one typed
boundary.

**Acceptance Criteria:**

- A repository method inserts a cycle and returns its generated case ID.
- A repository method reads a cycle back by case ID within the tenant scope.
- A Testcontainers test covers insert-then-read through Drizzle.

**How This Ties Into the Code:**

- `tax_plan_cycle.id` is now the generated primary key and the service-facing case ID.
- `tax_plan_cycle.client_id` remains a required client reference, but it is no longer
  the cycle primary key or the target of transition history.
- `stage_transition.case_id` now references `tax_plan_cycle.id`.
- `TaxPlanCycle` read models include generated `id`, while create payloads omit it.
- `createTaxPlanCycleRepository` inserts through Drizzle, returns the generated `id`,
  and reads by `{ tenantId, caseId }` using the new primary key.
- `createTaxPlanCycleReadHelper` remains as a compatibility wrapper for existing route
  code.

**Project Scope Connection:**

TaxPulse Advisory centers work around tenant-scoped Tax Plan Cycles with durable stage
history. This ticket removes the temporary `client_id`-as-case-ID assumption and gives
future case, transition, audit, and read-model work a stable generated cycle key while
preserving tenant-scoped reads.

**Changed Files:**

- `drizzle/`
- `migrations/20260626120000_create_tax_plan_cycle.sql`
- `seed.sql`
- `src/typescript/coreCaseOpenApi.ts`
- `src/typescript/db/schema.ts`
- `src/typescript/index.ts`
- `src/typescript/taxPlanCycle.ts`
- `src/typescript/taxPlanCycleRepository.ts`
- `tests/typescript/smoke.test.ts`
- `tests/typescript/taxPlanCycle.test.ts`
- `tests/typescript/taxPlanCycleMigration.test.ts`
- `tests/typescript/taxPlanCycleRead.typecheck.ts`
- `tests/typescript/taxPlanCycleRepository.integration.ts`
- `tests/typescript/taxPlanCycleRoutes.test.ts`

**Validation Notes:**

- `npm install` restored declared dependencies, including `drizzle-orm`, into
  `node_modules`.
- `npm run typecheck` passed.
- `npx vitest run tests/typescript/aggregationClient.test.ts tests/typescript/coreCaseOpenApi.test.ts tests/typescript/httpApp.test.ts tests/typescript/taxPlanCycle.test.ts tests/typescript/taxPlanCycleRoutes.test.ts tests/typescript/taxPlanCycleTransitions.test.ts`
  passed with 41 tests.
- `npm run test:integration` passed with 2 Testcontainers repository tests.
- `npm run test:smoke` passed with 9 tests.
- `npm run db:check` passed.
- `npm test` still fails in this local environment when migration tests use the
  configured `DATABASE_URL` because that PostgreSQL instance does not provide
  `uuidv7()`.
