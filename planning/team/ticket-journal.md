# Shared Team Ticket Journal

This journal records Jira-ticket implementation work from `planning/stackpulse_tax.csv`
and ties each ticket back to the code, tests, and validation evidence produced for it.

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

- `taxPlanCycleSchema` now validates `case_id` as the Tax Plan Cycle unit-of-work
  identifier while keeping `client_id` separate as the client identifier.
- `tax_plan_cycle` now includes `case_id TEXT NOT NULL`, with transition history
  pointing at `tax_plan_cycle.case_id` instead of treating `client_id` as the case ID.
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
