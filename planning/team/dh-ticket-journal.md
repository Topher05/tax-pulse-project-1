# Dylan Harle Ticket Journal

**Owner:** Dylan Harle  
**Branch prefix:** `dylan-harle-`

Add new ticket entries below using this template.

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

**Project Scope Connection:**

- React SPA - Operator & Portal Experience.
- Builds directly on SCRUM-122's typed inert Client Roster screen and prepares SCRUM-124 request states plus SCRUM-125 TanStack Table rendering.

**Changed Files:**

- `src/pulseUI/entities/clientRoster.ts`
- `src/pulseUI/entities/clientRosterQueries.ts`
- `src/pulseUI/pages/clients/ClientRosterPage.tsx`
- `src/pulseUI/tests/clients/ClientRosterPage.test.tsx`
- `src/pulseUI/tests/clients/ClientRosterQueries.test.tsx`
- `planning/team/dh-ticket-journal.md`

**Validation Notes:**

- `npm.cmd --prefix src/pulseUI test -- tests/clients/ClientRosterQueries.test.tsx tests/clients/ClientRosterPage.test.tsx` passed.
- `npm.cmd --prefix src/pulseUI run typecheck` passed.

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
