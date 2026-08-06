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

**Code Connection:** The Pulse route tree nests all internal workspace routes under a
shared `AuthenticatedWorkspace` wrapper. That wrapper renders `AuthBoundary`, waits for
the cookie-backed session restore to finish, and redirects anonymous sessions to the
unguarded `/sign-in` route before the app shell/sidebar can render.

**Project Scope Connection:** This supports the TaxPulse multi-tenant advisory
workspace by keeping internal advisor and firm screens behind a frontend authentication
boundary while allowing the separate sign-in, MFA, and password-reset routes to remain
public.

**Changed Files:**

- `src/pulseUI/app/routeTree.tsx`
- `src/pulseUI/auth/AuthBoundary.tsx`
- `src/pulseUI/auth/AuthProvider.tsx`
- `src/pulseUI/tests/appShell.test.tsx`
- `src/pulseUI/tests/auth/AuthBoundary.test.tsx`
- `src/pulseUI/tests/auth/AuthProvider.test.tsx`

**Validation Notes:** See the `demo4` verification entry below for the current
post-merge validation pass against SCRUM-98 and SCRUM-99.

## martins-okorie-jira99 - SCRUM-99

**Branch:** `martins-okorie-jira99`

**Assignee:** Martins Okorie

**Jira Key:** SCRUM-99

**Summary:** Attach JWT and refresh-on-401 in TanStack Query

**Description:** As an Advisor, I want TanStack Query to attach the JWT and refresh on
401, so that authorized data loads without manual re-login.

**Acceptance Criteria:**

- TanStack Query attaches the access token to API calls.
- A 401 triggers a token refresh and one retry.
- A failed refresh logs the user out rather than retrying indefinitely.

**Code Connection:** The Pulse UI now routes TanStack Query-backed live data requests
through the shared AuthProvider session instead of reading JWTs from localStorage. The
authenticated fetch wrapper attaches the in-memory access token, performs one
refresh-and-retry on a 401 through the BFF's cookie-backed `POST /auth/refresh`
contract, coalesces concurrent refresh calls during route restore/request races, and
clears query/session state when refresh fails. The generic case API helper now only
handles URL construction, credentials inclusion, JSON parsing, and HTTP error mapping.

**Project Scope Connection:** This connects SCRUM-98 route guarding with SCRUM-100 live
queue/detail data loading so tenant-scoped case reads use the signed-in user's JWT
instead of a hardcoded local testing token. Login UI and central auth context remain in
the later SCRUM-192 scope. Refresh tokens remain server-managed through Secure,
HttpOnly, SameSite=Strict cookies and are not exposed to browser JavaScript.

**Changed Files:**

- `src/pulseUI/app/bootstrap.tsx`
- `src/pulseUI/app/routeTree.tsx`
- `src/pulseUI/components/AppShell.tsx`
- `src/pulseUI/components/CurrentCaseSelector.tsx`
- `src/pulseUI/entities/clientRosterQueries.ts`
- `src/pulseUI/entities/deductionQueries.ts`
- `src/pulseUI/entities/quarterlyEstimateQueries.ts`
- `src/pulseUI/entities/taxPlanCycleQueries.ts`
- `src/pulseUI/auth/AuthProvider.tsx`
- `src/pulseUI/pages/taxPlanCycle/Details.tsx`
- `src/pulseUI/pages/taxPlanCycle/PlanCycle.tsx`
- `src/pulseUI/shared/caseApi.ts`
- `src/pulseUI/tests/appShell.test.tsx`
- `src/pulseUI/tests/auth/AuthProvider.test.tsx`
- `src/pulseUI/tests/caseApi.test.tsx`
- `src/pulseUI/tests/clients/ClientRosterPage.test.tsx`
- `src/pulseUI/tests/clients/ClientRosterQueries.test.tsx`
- `src/pulseUI/tests/components/CurrentCaseSelector.test.tsx`
- `src/pulseUI/tests/entities/deductionQueries.test.tsx`
- `src/pulseUI/tests/deductions/DeductionsPage.test.tsx`
- `src/pulseUI/tests/quarterlyPayments/QuarterlyPaymentsPage.test.tsx`
- `src/pulseUI/tests/scenarios/ScenarioPlannerPage.test.tsx`
- `src/pulseUI/tests/taxPlanCycle/Details.test.tsx`
- `src/pulseUI/tests/taxPlanCycle/Queue.test.tsx`
- `src/pulseUI/tests/taxPlanCycle/QueueState.test.tsx`
- `src/pulseUI/tests/testAuth.tsx`
- `planning/team/mm-ticket-journal.md`

**Validation Notes:**

- `npm --prefix src/pulseUI run typecheck` passed.
- `npm --prefix src/pulseUI run test` passed with 21 files and 72 tests.

## demo4 - SCRUM-98/SCRUM-99 Verification

**Branch:** `demo4`

**Assignee:** Chimaobi Martins Okorie

**Jira Keys:** SCRUM-98, SCRUM-99

**Summary:** Re-verify route guarding and authenticated query behavior.

**Description:** Reviewed the current Pulse UI implementation against the SCRUM-98 and
SCRUM-99 acceptance criteria after the MFA/login manual testing flow exposed a reload
session issue.

**Acceptance Criteria:**

- SCRUM-98: internal workspace routes are guarded by TanStack Router composition.
- SCRUM-98: anonymous users are redirected to `/sign-in`.
- SCRUM-98: tests assert unauthenticated users cannot render the workspace.
- SCRUM-99: TanStack Query-backed case API calls attach the access token.
- SCRUM-99: a 401 triggers refresh and exactly one retry.
- SCRUM-99: failed refresh logs the user out instead of looping.

**Code Connection:** Confirmed that `routeTree.tsx` nests workspace routes under
`AuthenticatedWorkspace` and `AuthBoundary`. Confirmed that `authenticatedFetch.ts`
adds the bearer token, refreshes once on 401, retries once, and invalidates the session
on failed refresh. Fixed the remaining unauthenticated TanStack Query call sites in the
current case selector, deductions, and quarterly-estimates hooks. Added refresh request
coalescing in `AuthProvider` so React StrictMode or overlapping initial requests do not
double-rotate the same refresh token and force a sign-out on reload.

**Project Scope Connection:** Keeps the authenticated Pulse UI workspace aligned with
tenant-scoped case access while allowing authenticated refresh to happen silently when
the server-side refresh cookie is still valid.

**Changed Files:**

- `src/pulseUI/auth/AuthProvider.tsx`
- `src/pulseUI/components/CurrentCaseSelector.tsx`
- `src/pulseUI/entities/deductionQueries.ts`
- `src/pulseUI/entities/quarterlyEstimateQueries.ts`
- `src/pulseUI/tests/auth/AuthProvider.test.tsx`
- `src/pulseUI/tests/components/CurrentCaseSelector.test.tsx`
- `src/pulseUI/tests/deductions/DeductionsPage.test.tsx`
- `src/pulseUI/tests/entities/deductionQueries.test.tsx`
- `src/pulseUI/tests/quarterlyPayments/QuarterlyPaymentsPage.test.tsx`
- `planning/team/mm-ticket-journal.md`

**Validation Notes:**

- `npm --prefix src/pulseUI run typecheck` passed.
- `npm --prefix src/pulseUI run test -- AuthProvider.test.tsx AuthBoundary.test.tsx authenticatedFetch.test.tsx appShell.test.tsx CurrentCaseSelector.test.tsx deductionQueries.test.tsx DeductionsPage.test.tsx QuarterlyPaymentsPage.test.tsx` passed with 9 files and 53 tests.

## demo4 - SCRUM-97

**Branch:** `demo4`

**Assignee:** Chimaobi Martins Okorie

**Jira Key:** SCRUM-97

**Summary:** Build the Comments and Audit Trail tabs.

**Description:** As an Advisor, I want the Comments and Audit Trail tabs, so that I can
discuss the case and review its history.

**Acceptance Criteria:**

- The Comments tab lists comments and offers an add-comment input.
- The Audit Trail tab renders the case's audit entries read-only with redacted figures.
- Both tabs render loading and empty states.

**Code Connection:** Re-verified SCRUM-97 against the acceptance criteria and closed the
remaining Comments tab state gap. The Comments tab now reads through a query surface so
it can render populated, loading, and empty states while preserving the add-comment
draft composer. The Audit Trail tab continues to lazy-load redacted audit entries from
the case audit endpoint and render them read-only.

**Project Scope Connection:** Keeps the detail page aligned with the Pulse UI operator
experience for case discussion and audit review without adding comment persistence or
weakening tenant-scoped audit reads.

**Changed Files:**

- `src/pulseUI/entities/taxPlanCycleQueries.ts`
- `src/pulseUI/pages/taxPlanCycle/Details.tsx`
- `src/pulseUI/tests/taxPlanCycle/Details.test.tsx`
- `src/pulseUI/tests/taxPlanCycle/queries.test.ts`
- `planning/team/mm-ticket-journal.md`

**Validation Notes:**

- `npm --prefix src/pulseUI run typecheck` passed.
- `npm --prefix src/pulseUI run test -- caseApi.test.tsx queries.test.ts Details.test.tsx`
  passed with 4 files and 17 tests.

## martins-okorie-jira102 - SCRUM-102

**Branch:** `martins-okorie-jira102`

**Assignee:** Martins Okorie

**Jira Key:** SCRUM-102

**Summary:** Render scenario results in a TanStack Table

**Description:** As an Advisor, I want scenario results in a TanStack Table, so that I
can compare each scenario's tax impact.

**Acceptance Criteria:**

- Submitting calls the calculation endpoint and renders each scenario's total tax and delta.
- The baseline row shows the current taxable and tax figures.
- The table renders loading and error states around the request.

**Code Connection:** Wired the SCRUM-101 Scenario Planner modal submission into an
authenticated scenario modeling POST through the shared Case API helper. Added a typed
scenario result boundary that maps the form's 2-5 scenarios onto the Core service
payload, derives the baseline tax from returned deltas, and renders the baseline plus
scenario rows through TanStack Table v9.

**Project Scope Connection:** Completes the Scenario Planner handoff from local
validated input capture to a live tax-impact comparison surface inside the React SPA
operator experience.

**Changed Files:**

- `src/pulseUI/components/scenario-form/Form.tsx`
- `src/pulseUI/entities/scenarioResults.ts`
- `src/pulseUI/package.json`
- `src/pulseUI/package-lock.json`
- `src/pulseUI/pages/scenarios/ScenarioPlannerPage.tsx`
- `src/pulseUI/pages/scenarios/ScenarioPlannerPage.module.css`
- `src/pulseUI/shared/caseApi.ts`
- `src/pulseUI/tests/caseApi.test.tsx`
- `src/pulseUI/tests/scenarios/ScenarioPlannerPage.test.tsx`
- `planning/team/mm-ticket-journal.md`

**Validation Notes:**

- `npm --prefix src/pulseUI run typecheck` passed.
- `npm --prefix src/pulseUI run test -- caseApi.test.tsx ScenarioForm.test.tsx ScenarioPlannerPage.test.tsx`
  passed with 3 files and 16 tests.
- `git diff --check` passed.
- Full `npm --prefix src/pulseUI run test` was attempted and remains blocked by two
  existing `DeductionsPage.test.tsx` expectations that assert `caseApiGetJson` is called
  without the authenticated fetcher while the current deductions page and shared case
  selector call it with one.

## martins-okorie-jira106 - SCRUM-106

**Branch:** `martins-okorie-jira106`

**Assignee:** Chimaobi Martins Okorie

**Jira Key:** SCRUM-106

**Summary:** Add the TanStack Query hook to the income endpoint

**Description:** As a Frontend Developer, I want a TanStack Query hook fetching the
client's income events, so that the Income screen reads live data through one typed
boundary.

**Acceptance Criteria:**

- A TanStack Query hook calls the income endpoint and returns typed income events.
- The hook exposes loading, error, and data states to callers.
- A test asserts the hook returns parsed income events for a mocked response.

**Code Connection:** Added a case-scoped Pulse UI income query boundary that follows
the existing deductions and quarterly-estimates pattern. The hook calls
`/v1/cases/:caseId/income-events` through the authenticated Case API helper, parses
income event rows with Zod, coerces currency strings from the API into numbers, and
exposes TanStack Query's loading, error, and data states to future Income screen
callers.

**Project Scope Connection:** This completes the frontend data-fetching contract for
the Income screen without adding the backend persistence table or Express route, which
are tracked separately by later income-backend work such as SCRUM-172. The mocked
response test keeps SCRUM-106 usable as a typed handoff for SCRUM-107, SCRUM-108, and
SCRUM-109.

**Changed Files:**

- `src/pulseUI/entities/incomeQueries.ts`
- `src/pulseUI/tests/entities/incomeQueries.test.tsx`
- `planning/team/mm-ticket-journal.md`

**Validation Notes:**

- `npm --prefix src/pulseUI run typecheck` passed.
- `npm --prefix src/pulseUI run test -- incomeQueries.test.tsx` passed with 1 file and
  3 tests.
- Refreshed `src/pulseUI` dependencies with `npm --prefix src/pulseUI install` because
  the latest development branch references `@playwright/test` types and the local
  dependency tree was missing them. npm reported the existing Node engine mismatch
  (`22.0.0` required, `24.17.0` used), 23 audit findings, and pending install-script
  approvals.

## martins-okorie-jira119 - SCRUM-119

**Branch:** `martins-okorie-jira119`

**Assignee:** Dylan Harle

**Jira Key:** SCRUM-119

**Summary:** Add loading, empty, and error states to the Quarterly Payments screen

**Description:** As a Frontend Developer, I want the Quarterly Payments screen to render
loading, empty, and error states, so that the screen behaves predictably while data
resolves.

**Acceptance Criteria:**

- A loading skeleton renders while the quarterly estimates request is in flight.
- An empty state renders when no quarterly estimates exist for the period.
- An error state renders with a retry affordance on request failure.

**Code Connection:** Reused the SCRUM-107 Income screen pattern for Quarterly Payments:
the route container derives a query state from `useQuarterlyEstimatesQuery`, renders an
accessible skeleton while the request is pending, shows a no-estimates empty state for
successful empty responses, and exposes a retryable error state that calls the query's
`refetch`. The prior placeholder-estimates fallback no longer renders while live data
is loading or unavailable.

**Project Scope Connection:** Keeps Quarterly Payments aligned with the shared
plan-tool case selection flow and preserves the read-only KPI/timeline screen for
successful data responses. Payment recording and mark-paid controls remain explicitly
out of MVP scope.

**Changed Files:**

- `src/pulseUI/pages/quarterlyPayments/QuarterlyPaymentsPage.tsx`
- `src/pulseUI/pages/quarterlyPayments/QuarterlyPaymentsPage.module.css`
- `src/pulseUI/tests/quarterlyPayments/QuarterlyPaymentsPage.test.tsx`
- `planning/team/mm-ticket-journal.md`

**Validation Notes:**

- `npm --prefix src/pulseUI run typecheck` passed.
- `npm --prefix src/pulseUI run test -- QuarterlyPaymentsPage.test.tsx` passed with 1
  file and 7 tests.
- `npm --prefix src/pulseUI run test` passed with 31 files and 137 tests. The run
  printed existing stderr from intentional scenario error-path coverage and jsdom's
  missing canvas implementation during axe checks, but all tests passed.
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
