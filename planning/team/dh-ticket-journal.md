# Dylan Harle Ticket Journal

**Owner:** Dylan Harle  
**Branch prefix:** `dylan-harle-`

Add new ticket entries below using this template.

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
