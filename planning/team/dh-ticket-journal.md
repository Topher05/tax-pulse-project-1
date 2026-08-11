# Dylan Harle Ticket Journal

**Owner:** Dylan Harle  
**Branch prefix:** `dylan-harle-`

Add new ticket entries below using this template.

## dylan-harle-jira154 - SCRUM-154

**Branch:** `dylan-harle-jira154`

**Assignee:** Dylan Harle

**Jira Key:** SCRUM-154

**Summary:** Write the multi-stage Dockerfile for the Tax Engine.

**Description:** As a Platform Engineer, I want a multi-stage Dockerfile for the Tax
Calculation Engine, so that its production image is lean.

**Acceptance Criteria:**

- The Python image builds in multiple stages and ships only runtime dependencies.
- The container runs the FastAPI service and passes a healthcheck.
- The build is reproducible from a clean checkout.

**Code Connection:**

- Added `Dockerfile.tax-engine` as the dedicated Python Tax Engine image while leaving
  the existing root Core Case Service Dockerfile intact.
- The builder stage installs locked runtime dependencies from `uv.lock` without Python
  dev extras, installs `tax_liability_engine`, and copies only the resulting virtualenv
  into the runtime stage.
- The runtime stage starts `tax_liability_engine.api:create_app` through Uvicorn on
  `0.0.0.0:${PORT:-8000}` and uses the existing unauthenticated `/health` route for the
  Docker healthcheck.
- Added a Dockerfile-specific ignore file so clean-checkout builds include the Python
  package and dependency metadata without sending Node, Pulse UI, tests, docs, local
  env files, or planning artifacts into the Tax Engine build context.
- Documented the Tax Engine Docker build/run commands and clarified the JWT environment
  values used by Docker and Docker Compose.

**Project Scope Connection:**

- Containers, Serverless & Deployment.
- Builds on SCRUM-84 and ADR-0016 by packaging the existing feature-sliced FastAPI
  service without changing calculation routes, JWT behavior, persistence boundaries, or
  the ADR's local interpreter startup command.
- Preserves ADR-0009 service ownership by keeping the Tax Engine image focused on
  calculation execution and free of Core Case Service database ownership.

**Changed Files:**

- `Dockerfile.tax-engine`
- `Dockerfile.tax-engine.dockerignore`
- `.env.example`
- `README.md`
- `planning/team/dh-ticket-journal.md`

**Validation Notes:**

- `.\.venv\Scripts\python.exe -m pyright --pythonpath .\.venv\Scripts\python.exe`
  passed.
- `.\.venv\Scripts\python.exe -m pytest` passed with 91 tests passed and 2 skipped.
- `docker build -f Dockerfile.tax-engine -t taxpulse/tax-engine .` passed.
- `docker run -d --rm --name tax-engine-scrum154 -e JWT_ISSUER=... -e
  JWT_SIGNING_SECRET=... taxpulse/tax-engine` started successfully, and
  `docker inspect --format='{{.State.Health.Status}}' tax-engine-scrum154` reported
  `healthy`.
- Runtime dependency inspection inside `taxpulse/tax-engine` reported required runtime
  modules present and dev-only modules `pytest`, `ruff`, and `pyright` absent.
- `git diff --check` passed with line-ending normalization warnings only.
- `.\.venv\Scripts\python.exe -m ruff format --check src tests` was blocked by an
  existing unrelated formatting issue in `tests/tax_liability_engine/smoke_test.py`.

## development-scrum147 - SCRUM-147

**Branch:** `development`

**Assignee:** Dylan Harle

**Jira Key:** SCRUM-147

**Summary:** Add the TanStack Query hook to the firm users endpoint.

**Description:** As a Frontend Developer, I want a TanStack Query hook fetching the
firm's users, so that the screen reads live data through one typed boundary.

**Acceptance Criteria:**

- A TanStack Query hook calls the firm users endpoint and returns typed user rows.
- The hook exposes loading, error, and data states to callers.
- A test asserts the hook returns parsed user rows for a mocked response.

**Code Connection:**

- Added a full `/v1/firm/users` read boundary modeled after SCRUM-123, with a backend
  firm users feature slice, tenant-scoped repository, authenticated route, OpenAPI
  schema/example coverage, and deterministic synthetic user profile seed data.
- Added `display_name` and nullable `last_login_at` to the `users` table so the
  SCRUM-146 Team & Users screen reads real row fields instead of deriving profile
  display data from email addresses.
- Added a Pulse UI `useFirmUsersQuery` hook and wired `TeamUsersPage` through it while
  leaving visible loading/empty/error states for SCRUM-148 and role assignment or invite
  mutations for SCRUM-149.
- Documented the Team & Users screen boundary and follow-on work in ADR-0032.

**Project Scope Connection:**

- React SPA - Operator & Portal Experience.
- Firm administration UI completion.
- Preserves tenant isolation by deriving firm scope from authenticated request context
  and excluding `tenantId` from API responses.

**Changed Files:**

- `src/typescript/features/firmUsers/*`
- `src/typescript/shared/database/schema.ts`
- `src/typescript/shared/database/seed.model.ts`
- `src/typescript/shared/database/drizzle-migrations/0010_firm_user_profile.sql`
- `src/typescript/coreCaseOpenApi.ts`
- `src/typescript/index.ts`
- `src/typescript/authRegistrationRepository.ts`
- `src/pulseUI/entities/firmUsers.ts`
- `src/pulseUI/entities/firmUserQueries.ts`
- `src/pulseUI/pages/firm/TeamUsersPage.tsx`
- `src/pulseUI/tests/firm/FirmUserQueries.test.tsx`
- `src/pulseUI/tests/firm/TeamUsersPage.test.tsx`
- `tests/typescript/firmUsers/firmUsersRoutes.test.ts`
- `tests/typescript/firmUsers/firmUsersRepository.test.ts`
- `tests/typescript/coreCaseOpenApi.test.ts`
- `tests/typescript/user/user.test.model.ts`
- `tests/typescript/user/user.test.ts`
- `tests/typescript/user/user.integration.test.ts`
- `tests/typescript/mfa_enrollement/mfa_enrollement.integration.test.ts`
- `adr/0032-team-users-screen.md`
- `adr/README.md`
- `planning/team/dh-ticket-journal.md`

**Validation Notes:**

- `npm --prefix src/pulseUI run typecheck` passed.
- `npm --prefix src/pulseUI run test -- FirmUserQueries.test.tsx TeamUsersPage.test.tsx`
  passed with 2 files and 3 tests.
- `npm run typecheck` passed.
- `npm run test:vitest -- tests/typescript/firmUsers/firmUsersRoutes.test.ts tests/typescript/coreCaseOpenApi.test.ts`
  passed with 2 files and 14 tests.
- `npm run test:vitest -- tests/typescript/firmUsers/firmUsersRepository.test.ts`
  passed with 1 file and 2 tests.
- `npm run test:vitest -- tests/typescript/user/user.test.ts tests/typescript/user/user.integration.test.ts tests/typescript/mfa_enrollement/mfa_enrollement.integration.test.ts`
  only collected `user.test.ts` because the root Vitest config excludes
  `**/*.integration.test.ts`; the collected file passed with 3 tests, and the integration
  fixtures are covered by `npm run typecheck`.

## dylan-harle-jira149 - SCRUM-149

**Branch:** `dylan-harle-jira149`

**Assignee:** Dylan Harle

**Jira Key:** SCRUM-149

**Summary:** Render the user roster table with a role-assignment control.

**Description:** As a Firm Admin, I want the user roster table with a role-assignment
control, so that I can manage my firm's staff and their roles.

**Acceptance Criteria:**

- The table renders name, email, role, status, and last login for the tenant's users.
- A role-assignment control lets a Firm Admin change a user's tenant-scoped role; it is
  disabled for non-admins.
- Changing a role invokes the update handler with the user and new role.

**Code Connection:**

- Built directly on SCRUM-147's `/v1/firm/users` read boundary and `FirmUserRow` screen
  model, replacing the placeholder row action with a role select in the roster's role
  column.
- Added a tenant-scoped `PATCH /v1/firm/users/{userId}/role` command that validates the
  role payload, rejects `TaxPulse Platform Admin` promotion, requires Firm Admin access,
  updates only the authenticated tenant's user, and returns the updated row.
- Added a Pulse UI role update helper and mutation hook that invalidates the existing
  firm users query after a successful role change.
- Limited the role-assignment control to tenant-assignable roles (`Firm Admin`,
  `Advisor`, and `Client`) and disabled platform-admin rows in the tenant roster.
- Updated ADR-0032 to capture the role-assignment command/control decision while leaving
  loading, empty, retry, error, invite, and impersonation work to adjacent tickets.

**Project Scope Connection:**

- React SPA - Operator & Portal Experience.
- Firm administration UI completion.
- Preserves tenant isolation by deriving update scope from authenticated request context
  and never accepting tenant IDs from the browser.

**Changed Files:**

- `src/typescript/features/firmUsers/*`
- `src/typescript/coreCaseOpenApi.ts`
- `src/typescript/index.ts`
- `src/pulseUI/entities/firmUsers.ts`
- `src/pulseUI/entities/firmUserQueries.ts`
- `src/pulseUI/pages/firm/TeamUsersPage.tsx`
- `src/pulseUI/pages/firm/TeamUsersPage.module.css`
- `src/pulseUI/tests/firm/FirmUserQueries.test.tsx`
- `src/pulseUI/tests/firm/TeamUsersPage.test.tsx`
- `tests/typescript/firmUsers/firmUsersRoutes.test.ts`
- `tests/typescript/firmUsers/firmUsersRepository.test.ts`
- `tests/typescript/coreCaseOpenApi.test.ts`
- `adr/0032-team-users-screen.md`
- `planning/team/dh-ticket-journal.md`

**Validation Notes:**

- `npm --prefix src/pulseUI run typecheck` passed.
- `npm --prefix src/pulseUI run test -- FirmUserQueries.test.tsx TeamUsersPage.test.tsx`
  passed with 2 files and 10 tests.
- `npm run typecheck` passed.
- `npm run test:vitest -- tests/typescript/firmUsers/firmUsersRoutes.test.ts tests/typescript/coreCaseOpenApi.test.ts`
  passed with 2 files and 18 tests.
- `npm run test:vitest -- tests/typescript/firmUsers/firmUsersRepository.test.ts`
  passed with 1 file and 3 tests.

## dylan-harle-jira132 - SCRUM-132

**Branch:** `dylan-harle-jira132`

**Assignee:** Dylan Harle

**Jira Key:** SCRUM-132

**Summary:** Consume stage-changed events from SQS.

**Description:** As a Backend Developer, I want an SQS consumer for stage-changed events, so that a subscriber processes transitions out of band.

**Acceptance Criteria:**

- A consumer subscribed via SQS receives the event and logs it.
- The consumer validates the event against the schema before processing.
- A test asserts a published event is received and parsed by the consumer.

**Code Connection:**

- Added a plain TypeScript SQS stage-changed consumer that receives SQS messages, parses the default SNS notification envelope, validates the nested CloudEvents v1 payload with `stageChangedCloudEventSchemaV1`, logs transition details, and deletes only successfully processed messages.
- Added SQS client and queue URL environment helpers that mirror the SCRUM-131 SNS publisher setup, including LocalStack endpoint support.
- Added a test that publishes through the SCRUM-131 SNS publisher shape, wraps the published message in an SNS-to-SQS envelope, and asserts the SQS consumer receives, validates, logs, and deletes it.
- Documented SCRUM-132 consumption behavior without changing the ADR-0028 CloudEvents contract.

**Project Scope Connection:**

- Event-Driven Workflow & Legacy Integration.
- Builds directly on SCRUM-130, SCRUM-131, `docs/stage-changed-event.md`, and ADR-0028.
- Keeps the consumer as a plain service method in this sprint; does not add Lambda runtime behavior, an outbox table, database writes, durable projection behavior, or a separate case status.

**Changed Files:**

- `package.json`
- `package-lock.json`
- `.env.example`
- `src/typescript/features/taxPlanCycle/infrastructure/stageChangedSqsConsumer.ts`
- `src/typescript/features/taxPlanCycle/index.ts`
- `src/typescript/index.ts`
- `tests/typescript/features/taxPlanCycle/stageChangedSqsConsumer.test.ts`
- `docs/stage-changed-event.md`
- `adr/0028-stage-changed-cloudevents-schema.md`
- `planning/team/dh-ticket-journal.md`

**Validation Notes:**

- `npm run typecheck` passed.
- `npx vitest run --config vitest.config.ts tests/typescript/features/taxPlanCycle/stageChangedEvent.test.ts tests/typescript/features/taxPlanCycle/stageChangedSnsPublisher.test.ts tests/typescript/features/taxPlanCycle/stageChangedSqsConsumer.test.ts` passed.
- `git diff --check` passed with line-ending warnings only.
- `npm test` passed typecheck and the SCRUM-132 tests, then failed in existing unrelated coverage: `tenantsMigration.test.ts` reports no test suite, `scenarioMigration.test.ts` timed out after 30000ms, and `tenantLoginResolver.test.ts`, `features/deductions/repository.test.ts`, and `features/deductions/routes.test.ts` hit PostgreSQL connection refusals on port 54318.

## dylan-harle-jira115 - SCRUM-115

**Branch:** `dylan-harle-jira115`

**Assignee:** Dylan Harle

**Jira Key:** SCRUM-115

**Summary:** Render the deductions table from live data.

**Description:** As a Frontend Developer, I want the deductions table rendered from the hook data, so that recorded deductions and their tax impact are visible.

**Acceptance Criteria:**

- The table renders date, description, category, amount, and tax-impact columns from the hook data.
- KPI cards render total deductions, estimated tax savings, and the deduction method.
- A newly added deduction appears in the table after a successful create.

**Code Connection:**

- Replaced the SCRUM-113 non-empty placeholder with the shared typed data table while preserving loading, empty, error, retry, and case-gated request states.
- Wired the SCRUM-114 typed Add Deduction form callback into a TanStack mutation and invalidates the selected case deductions query after successful create.
- Added the minimal tenant-scoped deductions create endpoint and repository insert path needed for the frontend create flow to persist and refetch live rows.

**Project Scope Connection:**

- React SPA - Operator & Portal Experience.
- Keeps deductions reads and creates scoped to the selected Tax Plan Cycle and authenticated tenant.
- Leaves deduction-method calculation as the existing static KPI copy because no live method field exists in the current deductions hook or backend payload.

**Changed Files:**

- `src/pulseUI/shared/caseApi.ts`
- `src/pulseUI/entities/deductionQueries.ts`
- `src/pulseUI/pages/deductions/DeductionsPage.tsx`
- `src/typescript/features/deductions/repositories/deduction.ts`
- `src/typescript/features/deductions/repositories/repository.ts`
- `src/typescript/features/deductions/routes.ts`
- `src/typescript/features/deductions/index.ts`
- `src/typescript/index.ts`
- `src/typescript/coreCaseOpenApi.ts`
- `src/pulseUI/tests/entities/deductionQueries.test.tsx`
- `src/pulseUI/tests/deductions/DeductionsPage.test.tsx`
- `tests/typescript/features/deductions/repository.test.ts`
- `tests/typescript/features/deductions/routes.test.ts`
- `tests/typescript/coreCaseOpenApi.test.ts`
- `planning/team/dh-ticket-journal.md`

**Validation Notes:**

- `npm.cmd --prefix src/pulseUI test -- tests/entities/deductionQueries.test.tsx tests/deductions/DeductionsPage.test.tsx tests/components/DeductionEntryForm.test.tsx` passed.
- `npm.cmd --prefix src/pulseUI test -- tests/caseApi.test.tsx` passed.
- `npm.cmd --prefix src/pulseUI run typecheck` passed.
- `npm run typecheck` passed.
- `npm run test:vitest -- tests/typescript/coreCaseOpenApi.test.ts` passed.
- `npm run test:vitest -- tests/typescript/features/deductions/repository.test.ts tests/typescript/features/deductions/routes.test.ts` could not complete because the configured local Postgres port refused connections (`ECONNREFUSED 127.0.0.1:54318` / `::1:54318`) before assertions ran.

## dylan-harle-jira114 - SCRUM-114

**Branch:** `dylan-harle-jira114`

**Assignee:** Dylan Harle

**Jira Key:** SCRUM-114

**Summary:** Build the Add Deduction form with zod validation.

**Description:** As a Frontend Developer, I want an Add Deduction form validated with zod, so that malformed deduction entries are caught at the boundary.

**Acceptance Criteria:**

- The form captures description, category, and amount and validates with react-hook-form + zod.
- A negative amount or missing required field surfaces an inline validation message and blocks submit.
- A valid submit invokes the create handler with the typed payload.

**Code Connection:**

- Replaced the SCRUM-112 placeholder `console.table` submit path with a typed `onCreate` callback boundary.
- Kept the existing date field from SCRUM-112 while validating description, category, and amount through the local zod schema.
- Preserved SCRUM-113 request-state rendering and SCRUM-115's table handoff by limiting page wiring to a local typed create handler.

**Project Scope Connection:**

- React SPA - Operator & Portal Experience.
- Adds client-side boundary validation for deduction entry without changing tenant-scoped deductions fetch behavior or backend mutation contracts.
- Leaves live create persistence and newly-created-row table behavior to SCRUM-115.

**Changed Files:**

- `src/pulseUI/components/DeductionEntryForm.tsx`
- `src/pulseUI/pages/deductions/DeductionsPage.tsx`
- `src/pulseUI/tests/components/DeductionEntryForm.test.tsx`
- `planning/team/dh-ticket-journal.md`

**Validation Notes:**

- `npm.cmd --prefix src/pulseUI test -- tests/components/DeductionEntryForm.test.tsx tests/deductions/DeductionsPage.test.tsx` passed.
- `npm.cmd --prefix src/pulseUI run typecheck` passed.
- `npm.cmd --prefix src/pulseUI test` passed.

## dylan-harle-jira113 - SCRUM-113

**Branch:** `dylan-harle-jira113`

**Assignee:** Dylan Harle

**Jira Key:** SCRUM-113

**Summary:** Add loading, empty, and error states to the Deductions screen.

**Description:** As a Frontend Developer, I want the Deductions screen to render loading, empty, and error states, so that the screen behaves predictably while data resolves.

**Acceptance Criteria:**

- A loading skeleton renders while the deductions request is in flight.
- An empty state renders when the client has no deductions.
- An error state renders with a retry affordance on request failure.

**Code Connection:**

- Added visible Deductions request-state rendering on top of the SCRUM-112 TanStack Query hook boundary.
- Kept ADR-0026 route-driven case gating intact so missing or invalid case IDs still block deductions fetches.
- Preserved SCRUM-115's future table handoff by rendering the existing non-empty success placeholder only after data resolves with deduction rows.
- Added retry behavior through `deductionsQuery.refetch()` without changing the shared query client's retry defaults.

**Project Scope Connection:**

- React SPA - Operator & Portal Experience.
- Improves predictable selected-case Deductions behavior while preserving tenant-scoped backend reads through the existing case API.
- Leaves Add Deduction submission behavior for SCRUM-114, live row/table rendering for SCRUM-115, and broader accessibility coverage for SCRUM-116.

**Changed Files:**

- `src/pulseUI/pages/deductions/DeductionsPage.tsx`
- `src/pulseUI/pages/deductions/DeductionsPage.module.css`
- `src/pulseUI/tests/deductions/DeductionsPage.test.tsx`
- `planning/team/dh-ticket-journal.md`

**Validation Notes:**

- `npm.cmd --prefix src/pulseUI test -- tests/entities/deductionQueries.test.tsx tests/deductions/DeductionsPage.test.tsx` passed.
- `npm.cmd --prefix src/pulseUI run typecheck` passed.

## dylan-harle-jira131 - SCRUM-131

**Branch:** `dylan-harle-jira131`

**Assignee:** Dylan Harle

**Jira Key:** SCRUM-131

**Summary:** Publish stage-changed events to SNS.

**Description:** As a Backend Developer, I want each stage transition to publish a stage-changed event, so that downstream consumers react without polling.

**Acceptance Criteria:**

- Advancing a case publishes a stage-changed event to an SNS topic.
- The published event validates against the CloudEvents schema.
- The publisher runs as a plain service method, not a cloud runtime, in this sprint.

**Code Connection:**

- Added an injected plain TypeScript stage-changed event publisher for successful Tax Plan Cycle transitions.
- Built SNS message bodies from the SCRUM-130 CloudEvents v1 contract and validated them with `stageChangedCloudEventSchemaV1` before publishing.
- Passed the route's known `fromStage` into the transition controller so the publisher can emit `from_stage` without an extra read.
- Wired production composition to an SNS client and `TAXPULSE_STAGE_CHANGED_TOPIC_ARN`.
- Wrapped SNS publishing as a best-effort post-transition side effect so a publish failure does not make a committed stage change appear failed to the client.
- Added a structured warning log for best-effort SNS publish failures to preserve tracing context.

**Project Scope Connection:**

- Event-Driven Workflow & Legacy Integration.
- Builds directly on SCRUM-130, `docs/stage-changed-event.md`, and ADR-0028.
- Prepares SCRUM-132 consumers to receive validated stage-changed events without adding SQS consumption, Lambda runtime behavior, an outbox table, or a separate case status.

**Changed Files:**

- `package.json`
- `package-lock.json`
- `.env.example`
- `src/typescript/features/taxPlanCycle/infrastructure/stageChangedSnsPublisher.ts`
- `src/typescript/features/taxPlanCycle/controllers/transitionController.ts`
- `src/typescript/features/taxPlanCycle/routes.ts`
- `src/typescript/features/taxPlanCycle/index.ts`
- `src/typescript/index.ts`
- `tests/typescript/features/taxPlanCycle/stageChangedSnsPublisher.test.ts`
- `tests/typescript/features/taxPlanCycle/transitionController.test.ts`
- `tests/typescript/features/taxPlanCycle/routes.test.ts`
- `tests/typescript/features/taxPlanCycle/mainComposition.test.ts`
- `docs/stage-changed-event.md`
- `adr/0028-stage-changed-cloudevents-schema.md`
- `planning/team/dh-ticket-journal.md`

**Validation Notes:**

- `npx vitest run --config vitest.config.ts tests/typescript/features/taxPlanCycle/stageChangedEvent.test.ts tests/typescript/features/taxPlanCycle/stageChangedSnsPublisher.test.ts tests/typescript/features/taxPlanCycle/transitionController.test.ts tests/typescript/features/taxPlanCycle/transitions.test.ts tests/typescript/features/taxPlanCycle/routes.test.ts tests/typescript/features/taxPlanCycle/mainComposition.test.ts` passed.
- `npm run typecheck` passed.
- `git diff --check` passed with line-ending warnings only.
- Review follow-up: `npx vitest run --config vitest.config.ts tests/typescript/features/taxPlanCycle/transitionController.test.ts tests/typescript/features/taxPlanCycle/mainComposition.test.ts` passed.
- Review follow-up: `npm run typecheck` passed.
- `npm test` passed typecheck and the SCRUM-131 tests, then failed in existing non-SCRUM-131 coverage: `scenario.test.ts` and `scenarioRepository.test.ts` still receive `Date` for `created_at` where the schema expects a string, `scenarioMigration.test.ts` timed out after 30000ms, `jwtProtectedRoutes.test.ts` still expects `scenarios: []` on a read response that omits it, and `tenantsMigration.test.ts` / `tenantLoginResolver.test.ts` hit PostgreSQL connection refusals on port 54318.

## development-scrum130 - SCRUM-130

**Branch:** `development`

**Assignee:** Dylan Harle

**Jira Key:** SCRUM-130

**Summary:** Define the stage-changed CloudEvents schema.

**Description:** As a Backend Developer, I want a CloudEvents schema for the stage-changed event, so that consumers have a stable event contract.

**Acceptance Criteria:**

- A CloudEvents-shaped schema defines case_id, from_stage, to_stage, tenant_id, and actor.
- A zod validator parses and rejects malformed events.
- The schema is versioned and documented.

**Code Connection:**

- Added a versioned CloudEvents 1.0 Zod schema for Tax Plan Cycle stage changes.
- Reused the existing Tax Plan Cycle stage enum so event validation stays aligned with workflow state.
- Exported the v1 event constants, schema, and inferred types through the Tax Plan Cycle feature boundary and package root.

**Project Scope Connection:**

- Event-Driven Workflow & Legacy Integration.
- Establishes the stable event contract required before SCRUM-131 publishes stage-changed events and SCRUM-132 consumes them.
- Does not add SNS publishing, SQS consumption, migrations, or a separate case status field.

**Changed Files:**

- `src/typescript/features/taxPlanCycle/stageChangedEvent.ts`
- `src/typescript/features/taxPlanCycle/index.ts`
- `src/typescript/index.ts`
- `tests/typescript/features/taxPlanCycle/stageChangedEvent.test.ts`
- `docs/stage-changed-event.md`
- `adr/0028-stage-changed-cloudevents-schema.md`
- `adr/README.md`
- `planning/team/dh-ticket-journal.md`

**Validation Notes:**

- `npx vitest run --config vitest.config.ts tests/typescript/features/taxPlanCycle/stageChangedEvent.test.ts` passed.
- `npm run typecheck` passed.
- `git diff --check` passed with line-ending warnings only.
- Local PostgreSQL 18.4 verified `uuidv7()` support with `uuidv7() IS NOT NULL`.
- `npm test` passed typecheck and the new stage-changed event test, then failed in existing non-SCRUM-130 coverage:
  `scenario.test.ts` and `scenarioRepository.test.ts` currently receive `Date` for `created_at` where the schema expects a string,
  `scenarioMigration.test.ts` timed out after 30000ms, and
  `jwtProtectedRoutes.test.ts` currently expects `scenarios: []` on a read response that omits it.

## dylan-harle-jira122 - SCRUM-122

**Branch:** `dylan-harle-jira122`

**Assignee:** Dylan Harle

**Jira Key:** SCRUM-122

**Summary:** Scaffold the Client Roster screen component from the wireframe.

**Description:** As a Frontend Developer, I want a typed Client Roster screen scaffolded from the wireframe, so that the screen has a stable structure before data is wired.

**Acceptance Criteria:**

- A typed React component renders the Client Roster layout (header, table region) matching the wireframe.
- The component declares typed props for the roster data it will receive.
- The component renders an inert table region with no data fetching yet.

**Code Connection:**

- Added a typed Pulse UI Client Roster route at `/clients` using the prototype's header copy, table columns, sample roster rows, and inert `Open Books` affordance.
- Exported `ClientRosterRow` and `ClientRosterScreenProps` so later roster data/query tickets can wire into the same screen boundary.
- Documented the roster scaffold decision in ADR-0025 so the ADR can be updated as the feature is expanded.

**Project Scope Connection:**

- React SPA - Operator & Portal Experience.
- Establishes the internal advisor/firm-admin Client Roster screen structure before SCRUM-123 live data wiring, SCRUM-124 request states, and SCRUM-125 TanStack Table behavior.

**Changed Files:**

- `src/pulseUI/pages/clients/ClientRosterPage.tsx`
- `src/pulseUI/pages/clients/ClientRosterPage.module.css`
- `src/pulseUI/app/routeTree.tsx`
- `src/pulseUI/tests/clients/ClientRosterPage.test.tsx`
- `adr/0025-client-roster-screen-scaffold.md`
- `adr/README.md`
- `planning/team/dh-ticket-journal.md`

**Validation Notes:**

- `npm.cmd --prefix src/pulseUI test -- tests/clients/ClientRosterPage.test.tsx` passed.
- `npm.cmd --prefix src/pulseUI run typecheck` passed.

## dylan-harle-jira94 - SCRUM-94

**Branch:** `dylan-harle-jira94`

**Assignee:** Dylan Harle

**Jira Key:** SCRUM-94

**Summary:** Add loading, empty, and error states to the queue.

**Description:** As an Advisor, I want the queue to show loading, empty, and error states, so that the screen behaves predictably while data resolves.

**Acceptance Criteria:**

- A loading skeleton renders while the queue request is in flight.
- An empty state renders when the tenant has no open cycles.
- An error state renders with a retry affordance on request failure.

**Code Connection:**

- Added a Plan Cycle Queue request-state boundary for the `/plan-cycles` route.
- Added loading skeleton, empty state, and error state with retry behavior.
- Documented the SCRUM-93 connection point at the non-empty success branch while keeping that branch visually empty for this ticket.

**Project Scope Connection:**

- Improves predictable queue screen behavior inside the Pulse UI operator workspace.
- Does not implement SCRUM-93 table rows, queue KPI cards, overdue badges, or final queue item field rendering.
- Leaves live data wiring for SCRUM-100.

**Changed Files:**

- `src/pulseUI/planCycles/PlanCycleQueueRoute.tsx`
- `src/pulseUI/planCycles/README.md`
- `src/pulseUI/routing/routeTree.tsx`
- `src/pulseUI/styles.css`
- `src/pulseUI/tests/planCycleQueueState.test.tsx`
- `planning/team/dh-ticket-journal.md`

**Validation Notes:**

- `npm --prefix src/pulseUI run typecheck` passed.
- `npm --prefix src/pulseUI test` passed.

## dylan-harle-jira92 - SCRUM-92

**Branch:** `dylan-harle-jira92`

**Assignee:** Dylan Harle

**Jira Key:** SCRUM-92

**Summary:** Scaffold the React/Vite app shell and sidebar.

**Description:** As a Frontend Developer, I want a React/Vite shell with the wireframe sidebar, so that the operator workspace has a consistent frame.

**Acceptance Criteria:**

- A Vite-built React app renders the sidebar groups (Workspace, Plan Tools, Firm) matching the wireframe.
- The topbar shows the view title and the design-only View-as switcher.
- The shell renders an empty content region for routed views.

**Code Connection:**

- Added the Pulse UI React/Vite entrypoint under `src/pulseUI`.
- Added a TanStack Router shell with route-driven sidebar labels, active view title handling, and empty routed view components.
- Added component coverage for sidebar groups, topbar title, View-as switcher state, and the empty routed content region.

**Project Scope Connection:**

- Establishes the operator workspace frame for future React SPA tickets, including the queue, plan cycle detail, plan tools, client roster, and firm administration screens.
- Does not depend on SCRUM-75 implementation details because this ticket performs no queue reads, BFF calls, Redis cache lookup, or DynamoDB fallback.

**Changed Files:**

- `package.json`
- `package-lock.json`
- `src/pulseUI/package.json`
- `src/pulseUI/package-lock.json`
- `adr/0011-pulse-ui-react-vite-shell.md`
- `adr/README.md`
- `README.md`
- `src/pulseUI/*`
- `src/pulseUI/index.html`
- `src/pulseUI/tsconfig.pulseUI.json`
- `src/pulseUI/vite.config.ts`
- `src/pulseUI/vitest.config.ts`
- `src/typescript/vitest.config.ts`
- `src/pulseUI/tests/appShell.test.tsx`

**Validation Notes:**

- `npm run typecheck` passed.
- `npm run test:pulseUI -- tests/appShell.test.tsx` passed.
- `npm run build:web` passed.
- `npm test` ran the full suite but failed in existing backend database/migration tests after PostgreSQL reported `function uuidv7() does not exist`; the new Pulse UI tests pass when run directly.

## dylan-harle-jira95 - SCRUM-95

**Branch:** `dylan-harle-jira95`

**Assignee:** Dylan Harle

**Jira Key:** SCRUM-95

**Summary:** Build the Plan Cycle Detail tab and stepper hook.

**Description:** As an Advisor, I want a hook managing the detail tabs and stage stepper, so that switching tabs is predictable.

**Acceptance Criteria:**

- A custom hook tracks the active tab (Overview, Scenarios, Comments, Audit Trail) and the stepper position.
- Switching tabs preserves unsaved local input in the comments box.
- The hook is unit-tested for tab and stepper transitions.

**Code Connection:**

- Added a Pulse UI Plan Cycle Detail hook for local tab, stepper, and comments draft state.
- Added a minimal Plan Cycle Detail route on `/plan-cycles/$caseId` with skeleton Overview, Scenarios, Comments, and Audit Trail tabs.
- Replaced only the Plan Cycle Detail route's empty placeholder from the SCRUM-92 shell while leaving other placeholder routes intact.
- Added hook and route coverage for tab transitions, stage transitions, and preserving unsaved comments draft input across tab switches.

**Project Scope Connection:**

- Builds on the SCRUM-92 React/Vite shell and TanStack Router workspace route framework.
- Establishes Plan Cycle Detail navigation state for SCRUM-96 and SCRUM-97 without adding live data reads, backend API changes, or separate case status state.

**Changed Files:**

- `planning/team/dh-ticket-journal.md`
- `adr/0018-plan-cycle-detail-navigation-state.md`
- `adr/README.md`
- `src/pulseUI/planCycles/PlanCycleDetailRoute.tsx`
- `src/pulseUI/planCycles/usePlanCycleDetailNavigation.ts`
- `src/pulseUI/routing/routeTree.tsx`
- `src/pulseUI/styles.css`
- `src/pulseUI/tests/planCycleDetailNavigation.test.tsx`
- `src/pulseUI/tests/planCycleDetailRoute.test.tsx`

**Validation Notes:**

- `npm run typecheck` passed.
- `npm --prefix src/pulseUI run test` passed.
- `npm --prefix src/pulseUI run typecheck` passed.
- `npm run build:web` passed.

## dylan-harle-jira96 - SCRUM-96

**Branch:** `dylan-harle-jira96`

**Assignee:** Dylan Harle

**Jira Key:** SCRUM-96

**Summary:** Build the Plan Cycle Detail Overview tab.

**Description:** As an Advisor, I want the Overview tab of Plan Cycle Detail, so that I see the plan brief, recommendation, and case properties.

**Acceptance Criteria:**

- The Overview tab renders the plan brief (period, recommendation, projected savings, risk flags).
- The case properties side panel renders advisor, reviewer, stage entered, due date, on-hold, and priority.
- The stage stepper highlights the current stage.

**Code Connection:**

- Filled in only the existing Plan Cycle Detail Overview tab from SCRUM-95 with a typed synthetic overview view model.
- Rendered the plan brief, recommendation, projected savings, risk flags, and case properties side panel inside the Overview tab.
- Initialized the existing SCRUM-95 stage stepper from the overview model's current stage while preserving tab switching and comments draft behavior.
- Added focused route coverage for the Overview content and current-stage highlight.

**Project Scope Connection:**

- Builds directly on the SCRUM-95 Plan Cycle Detail tab and stepper skeleton.
- Leaves Scenarios, Comments, and Audit Trail as their existing skeletons for later tickets.
- Does not add backend reads, BFF contracts, persistence changes, or a separate case status field.

**Changed Files:**

- `planning/team/dh-ticket-journal.md`
- `adr/0018-plan-cycle-detail-navigation-state.md`
- `src/pulseUI/planCycles/PlanCycleDetailRoute.tsx`
- `src/pulseUI/styles.css`
- `src/pulseUI/tests/planCycleDetailRoute.test.tsx`

**Validation Notes:**

- `npm --prefix src/pulseUI run test` passed.
- `npm --prefix src/pulseUI run typecheck` passed.

## dylan-harle-jira123 - SCRUM-123

**Branch:** `dylan-harle-jira123`

**Assignee:** Dylan Harle

**Jira Key:** SCRUM-123

**Summary:** Add the TanStack Query hook to the client roster endpoint.

**Description:** As a Frontend Developer, I want a TanStack Query hook fetching the firm's client roster, so that the screen reads live data through one typed boundary.

**Acceptance Criteria:**

- A TanStack Query hook calls the roster endpoint and returns typed client rows.
- The hook exposes loading, error, and data states to callers.
- A test asserts the hook returns parsed client rows for a mocked response.

**Code Connection:**

- Added a tenant-scoped Client Roster query hook that calls `/v1/clients` without accepting a tenant ID, leaving firm/advisor scoping to the authenticated API context.
- Moved the roster row type into the Pulse UI entity layer and kept the Client Roster screen wired through the same typed row boundary established by SCRUM-122.
- Updated the Client Roster route to read rows through TanStack Query instead of prototype data.
- Added the persistent `client_roster` table, seeded fake roster rows, and a tenant-scoped Core Case `GET /v1/clients` endpoint for the hook to fetch.
- Documented the endpoint in the Core Case OpenAPI document and kept TanStack Table rendering/sorting out of scope for SCRUM-125.

**Project Scope Connection:**

- React SPA - Operator & Portal Experience.
- Builds directly on SCRUM-122's typed inert Client Roster screen and prepares SCRUM-124 request states plus SCRUM-125 TanStack Table rendering.
- Establishes the persistent roster source that SCRUM-125 can render without defining backend storage.

**Changed Files:**

- `src/pulseUI/entities/clientRoster.ts`
- `src/pulseUI/entities/clientRosterQueries.ts`
- `src/pulseUI/pages/clients/ClientRosterPage.tsx`
- `src/pulseUI/tests/clients/ClientRosterPage.test.tsx`
- `src/pulseUI/tests/clients/ClientRosterQueries.test.tsx`
- `src/typescript/features/clientRoster/clientRoster.ts`
- `src/typescript/features/clientRoster/repository.ts`
- `src/typescript/features/clientRoster/routes.ts`
- `src/typescript/features/clientRoster/index.ts`
- `src/typescript/shared/database/schema.ts`
- `src/typescript/shared/database/seed.model.ts`
- `src/typescript/shared/database/seed.ts`
- `src/typescript/shared/database/drizzle-migrations/0009_client_roster.sql`
- `src/typescript/coreCaseOpenApi.ts`
- `src/typescript/index.ts`
- `tests/typescript/clientRoster/clientRosterRepository.test.ts`
- `tests/typescript/clientRoster/clientRosterRoutes.test.ts`
- `tests/typescript/coreCaseOpenApi.test.ts`
- `adr/0025-client-roster-screen-scaffold.md`
- `adr/README.md`
- `planning/team/dh-ticket-journal.md`

**Validation Notes:**

- `npm.cmd --prefix src/pulseUI test -- tests/clients/ClientRosterQueries.test.tsx tests/clients/ClientRosterPage.test.tsx` passed.
- `npm.cmd --prefix src/pulseUI run typecheck` passed.
- `npm run typecheck` passed.
- `npx vitest run --config vitest.config.ts tests/typescript/clientRoster/clientRosterRoutes.test.ts tests/typescript/clientRoster/clientRosterRepository.test.ts tests/typescript/coreCaseOpenApi.test.ts` passed.

## dylan-harle-jira125 - SCRUM-125

**Branch:** `dylan-harle-jira125`

**Assignee:** Dylan Harle

**Jira Key:** SCRUM-125

**Summary:** Render the roster as a TanStack Table

**Description:** As a Frontend Developer, I want the client roster rendered with TanStack Table, so that advisors can scan and sort their clients.

**Acceptance Criteria:**

- A TanStack Table renders client, filing status, YTD income, estimated tax, and quarterly status columns.
- Columns are sortable through TanStack Table's column model.
- The rendered rows reflect the hook data.

**Code Connection:**

- Replaced the Client Roster success table rendering with a TanStack Table v9 instance over the SCRUM-123 `ClientRosterRow` hook data boundary.
- Added sortable accessor columns for client, filing status, YTD income, estimated tax, and quarterly status while keeping `Open Books` as an inactive non-sortable action column.
- Added focused roster page coverage for required columns, hook-backed rows, numeric sorting, nullable quarterly-status sorting, and the non-sortable inactive action column.
- Aligned the SCRUM-124 synthetic roster fixture with the SCRUM-123 `filingStatus` row contract so Pulse UI typecheck remains green.
- Updated ADR-0025 to document the SCRUM-125 TanStack Table sorting decision.

**Project Scope Connection:**

- React SPA - Operator & Portal Experience.
- Builds directly on SCRUM-123's tenant-scoped roster query and endpoint contract without changing backend storage, endpoint scope, or TanStack Query behavior.
- Keeps SCRUM-124 loading, empty, error, and retry states intact and only changes the non-empty success branch.

**Changed Files:**

- `src/pulseUI/pages/clients/ClientRosterPage.tsx`
- `src/pulseUI/pages/clients/ClientRosterPage.module.css`
- `src/pulseUI/shared/mockedClientListings.model.ts`
- `src/pulseUI/tests/clients/ClientRosterPage.test.tsx`
- `adr/0025-client-roster-screen-scaffold.md`
- `planning/team/dh-ticket-journal.md`

**Validation Notes:**

- `npm.cmd --prefix src/pulseUI run typecheck` passed.
- `npm.cmd --prefix src/pulseUI test -- tests/clients/ClientRosterPage.test.tsx tests/clients/ClientRosterQueries.test.tsx` passed after rerunning outside the sandbox because Windows denied access while Vitest loaded its config in the sandbox.

<!--
## dylan-harle-jiraXX - SCRUM-XX

**Branch:** `dylan-harle-jiraXX`

**Assignee:** Dylan Harle

**Jira Key:** SCRUM-XX

**Summary:**

**Description:**

**Acceptance Criteria:**

-

**Code Connection:**

**Project Scope Connection:**

**Changed Files:**

-

**Validation Notes:**

-
-->
