# Martins Okorie Ticket Journal

**Owner:** Martins Okorie  
**Branch prefix:** `martins-okorie-`

Add new ticket entries below using this template.

## martins-okorie-jira82 - SCRUM-82

**Branch:** `martins-okorie-jira82`

**Assignee:** Martins Okorie

**Jira Key:** SCRUM-82

**Summary:** Derive the quarterly estimated payment

**Description:** As an Advisor, I want the quarterly estimated payment derived from
total liability, so that the cycle shows what the client owes each quarter.

**Acceptance Criteria:**

- The engine splits total liability into four quarterly estimates.
- The estimate accounts for withholdings already applied.
- A pytest case asserts the four estimates sum to the net liability.

**Code Connection:** The Python tax calculation request now accepts non-negative
withholding, the response carries a four-payment quarterly estimate schedule, and the
calculation module derives deterministic cent-accurate quarterly payments from net
liability.

**Project Scope Connection:** This supports the Tax Plan Cycle modeling workflow by
turning calculated liability into quarterly payment guidance advisors can show clients
during tax planning.

**Changed Files:**

- `src/python/tax_pulse_project_team_1/tax_calculation.py`
- `tests/python/test_tax_calculation.py`
- `planning/team/mm-ticket-journal.md`

**Validation Notes:**

- `python -m pytest tests/python/test_tax_calculation.py` passed.
- `python -m ruff format --check src/python tests/python` passed.
- `python -m pyright --pythonpath "$(python -c 'import sys; print(sys.executable)')"` passed.
- `python -m pytest` passed after starting Colima and downloading
  `localstack/localstack:3.8.1` for the LocalStack/Testcontainers projection tests.

## martins-okorie-jira83new - SCRUM-83

**Branch:** `martins-okorie-jira83new`

**Assignee:** Martins Okorie

**Jira Key:** SCRUM-83

**Summary:** Cover calculation edge cases with pytest

**Description:** As a Backend Developer, I want pytest edge cases over the
calculation, so that boundary conditions are correct.

**Acceptance Criteria:**

- Tests cover zero income.
- Tests cover income at a bracket boundary.
- Tests cover deductions exceeding income.

**Code Connection:** The tax calculation test suite now verifies the current
Decimal-based calculation contract for zero-income requests, exact federal bracket
boundary income values, and deductions that meet or exceed income without changing
the production calculation API.

**Project Scope Connection:** This protects the Tax Calculation Engine behavior
used by Tax Plan Cycle modeling so advisors receive deterministic liability values
at common boundary conditions.

**Changed Files:**

- `tests/python/test_tax_calculation.py`
- `src/python/tax_pulse_project_team_1/tax_calculation.py`
- `planning/team/mm-ticket-journal.md`

**Validation Notes:**

- `python -m pytest tests/python/test_tax_calculation.py` passed.
- `python -m ruff format --check src/python tests/python` passed.
- `python -m pyright --pythonpath "$(python -c 'import sys; print(sys.executable)')"` passed.
- `python -m pytest` ran 67 passing tests and stopped on the two LocalStack projection
  tests because Docker was not available at the local Unix socket.

## martins-okorie-jira88 - SCRUM-88

**Branch:** `martins-okorie-jira88`

**Assignee:** Martins Okorie

**Jira Key:** SCRUM-88

**Summary:** Author the consumer-side Pact for calculation

**Description:** As a Backend Developer, I want a consumer-side Pact for the
calculation request, so that the Core service's expectations are pinned.

**Acceptance Criteria:**

- A consumer Pact test defines the calculation request and expected response shape.
- The pact also covers the scenario endpoint shape.
- The generated pact file is published to the broker or shared directory.

**Code Connection:** The Core service's real Tax Engine client now exposes both the
single calculation call and the scenario comparison call. The Pact V4 consumer test
runs that client against Pact's mock provider and records the `/tax-calculations` and
`/scenarios/comparisons` interactions into a local shared pact file.

**Project Scope Connection:** This pins the polyglot contract between the Express/Core
service and Python Tax Calculation Engine without adding provider verification or new
workflow behavior. SCRUM-89 can use the generated pact to catch breaking provider
changes before deploy.

**Changed Files:**

- `package.json`
- `package-lock.json`
- `adr/0018-consumer-driven-tax-engine-pact.md`
- `adr/README.md`
- `src/typescript/features/taxPlanCycle/infrastructure/engineClient.ts`
- `src/typescript/features/taxPlanCycle/index.ts`
- `src/typescript/index.ts`
- `tests/typescript/features/taxPlanCycle/engineClient.pact.test.ts`
- `pacts/CoreCaseService-TaxCalculationEngine.json`
- `planning/team/mm-ticket-journal.md`

**Validation Notes:**

- `npm run test:pact` passed and generated the local shared Pact file.
- `npx tsc -p tsconfig.json --noEmit && npx tsc -p tsconfig.test.json --noEmit` passed.
- `npm run typecheck` reached the existing Pulse UI typecheck and failed because React,
  TanStack Router, Testing Library, and Vite React dependencies are not installed in
  `src/pulseUI`.

## martins-okorie-jira89 - SCRUM-89

**Branch:** `martins-okorie-jira89`

**Assignee:** Martins Okorie

**Jira Key:** SCRUM-89

**Summary:** Verify the provider against the consumer Pact

**Description:** As a Backend Developer, I want provider-side Pact verification for the
Python Tax Calculation Engine, so that the provider fails fast if it drifts from the
Core service contract.

**Acceptance Criteria:**

- Provider verification replays the Core service pact against the real FastAPI provider.
- Verification covers `/tax-calculations` and `/scenarios/comparisons`.
- The SCRUM-88 pact uses a deterministic valid JWT so auth does not block contract checks.

**Code Connection:** The provider verification pytest starts the real FastAPI app with
the same deterministic JWT settings used by endpoint tests, then asks Pact Python to
verify the local `CoreCaseService-TaxCalculationEngine.json` pact over HTTP.

**Project Scope Connection:** This closes the consumer-driven contract loop between the
Express/Core service and Python Tax Calculation Engine, protecting advisory tax plan
workflows from response-shape drift across the polyglot service boundary.

**Changed Files:**

- `pyproject.toml`
- `tests/tax_liability_engine/pact_provider_verification_test.py`
- `tests/typescript/features/taxPlanCycle/engineClient.pact.test.ts`
- `pacts/CoreCaseService-TaxCalculationEngine.json`
- `planning/team/mm-ticket-journal.md`

**Validation Notes:**

- `npm run test:pact` passed and regenerated the local shared Pact file with a
  deterministic valid HS256 JWT.
- `uv run --extra dev python -m pytest tests/tax_liability_engine/pact_provider_verification_test.py`
  passed.
- `uv run --extra dev python -m pytest tests/tax_liability_engine/tax_calculation_api_test.py tests/tax_liability_engine/scenario_comparison_api_test.py`
  passed with 11 tests.
- `uv run --extra dev python -m pyright --pythonpath .venv/bin/python` passed.
- `uv run --extra dev python -m ruff format --check src tests` still reports unrelated
  pre-existing formatting changes needed in `src/tax_liability_engine/scenario_comparison.py`
  and `tests/tax_liability_engine/smoke_test.py`.

## martins-okorie-jira97 - SCRUM-97

**Branch:** `martins-okorie-jira97`

**Assignee:** Martins Okorie

**Jira Key:** SCRUM-97

**Summary:** Build the Comments and Audit Trail tabs.

**Description:** As an Advisor, I want the Comments and Audit Trail tabs, so that I can
discuss the case and review its history.

**Acceptance Criteria:**

- The Comments tab lists comments and offers an add-comment input.
- The Audit Trail tab renders the case's audit entries read-only with redacted figures.
- Both tabs render loading and empty states.

**Code Connection:** Filled in the existing Plan Cycle Detail Comments tab with a
no-comments empty state and preserved draft input. The Audit Trail tab lazy-loads
redacted case audit entries from the existing
`/v1/tax-plan-cycles/:caseId/audit-entries` endpoint and renders them read-only.

**Project Scope Connection:** Keeps SCRUM-97 scoped to the Pulse UI detail surface and
reflects the current backend boundary: Comments have no persistence API yet, while
Audit Trail already has an append-only table and redacted read endpoint, so the UI
loads audit history by case ID when the Audit Trail tab is opened without adding new
backend persistence.

**Changed Files:**

- `src/pulseUI/pages/taxPlanCycle/PlanCycleDetailRoute.tsx`
- `src/pulseUI/shared/styles.css`
- `src/pulseUI/tests/planCycleDetailNavigation.test.tsx`
- `src/pulseUI/tests/planCycleDetailRoute.test.tsx`
- `planning/team/mm-ticket-journal.md`

**Validation Notes:**

- `npm run typecheck` passed.
- `npm --prefix src/pulseUI run test` passed with 28 tests.
- `npm --prefix src/pulseUI run build` passed.

## martins-okorie-jira98 - SCRUM-98

**Branch:** `martins-okorie-jira98`

**Assignee:** Martins Okorie

**Jira Key:** SCRUM-98

**Summary:** Guard internal routes with TanStack Router

**Description:** As an Advisor, I want TanStack Router guarding internal routes, so
that only authenticated users reach the workspace.

**Acceptance Criteria:**

- TanStack Router guards the internal workspace routes.
- An unauthenticated user is redirected to login.
- A test asserts the guard redirects without a token.

**Code Connection:** The Pulse route tree now uses a shared TanStack Router
`beforeLoad` guard for internal workspace routes. The guard checks the existing
Pulse UI shared JWT key in local storage and redirects unauthenticated users to an
unguarded `/login` route. The app shell renders the login route without the protected
workspace sidebar and topbar.

**Project Scope Connection:** This supports the TaxPulse multi-tenant advisory
workspace by keeping internal advisor and firm screens behind a frontend
authentication boundary. Token attachment, refresh-on-401, retry, and logout stay in
the follow-on SCRUM-99/SCRUM-192 auth scope.

**Changed Files:**

- `src/pulseUI/app/authSession.ts`
- `src/pulseUI/app/routeTree.tsx`
- `src/pulseUI/components/AppShell.tsx`
- `src/pulseUI/components/AppShell.module.css`
- `src/pulseUI/pages/LoginPage.tsx`
- `src/pulseUI/tests/appShell.test.tsx`
- `src/pulseUI/tests/taxPlanCycle/Details.test.tsx`
- `src/pulseUI/tests/taxPlanCycle/Queue.test.tsx`
- `src/pulseUI/tests/taxPlanCycle/QueueState.test.tsx`

**Validation Notes:**

- `npm run typecheck` passed.
- `npm --prefix src/pulseUI run test` passed with 7 files and 28 tests.
- `npm --prefix src/pulseUI run build` passed.
<!--
## martins-okorie-jiraXX - SCRUM-XX

**Branch:** `martins-okorie-jiraXX`

**Assignee:** Martins Okorie

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
