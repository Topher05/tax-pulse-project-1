# Christopher Martus Ticket Journal

**Owner:** Christopher Martus  
**Branch prefix:** `christopher-martus-`

Add new ticket entries below using this template.

<!--
## christopher-martus-jiraXX - SCRUM-XX

**Branch:** `christopher-martus-jiraXX`

**Assignee:** Christopher Martus

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
## christopher-martus-jira192 - SCRUM-192

**Branch:** `christopher-martus-jira192`

**Assignee:** Christopher Martus

**Jira Key:** SCRUM-192

**Summary:** Provide an auth context and session hooks for login, refresh, and logout

**Description:** As a Frontend Developer, I want an auth context that holds the session
and a hook for login, token refresh, and logout, so that every screen, route guard, and
query reads identity from one source.

**Acceptance Criteria:**

- An auth context provider holds the authenticated session and restores it across reloads.
- A session hook exposes identity, authentication state, and session actions.
- Login stores issued tokens; logout clears the session and cached data.
- Refresh and invalidation are centralized and covered by component tests.

**Code Connection:**

- The first implementation slice defines the Pulse UI's typed session, BFF token-response,
  MFA challenge, and hook contracts. It validates JWT identity claims centrally and maps
  issued token responses to a browser session without retaining a refresh token in
  JavaScript state.
- The BFF now sets refresh tokens only in a `Secure`, `HttpOnly`, `SameSite=Strict`
  cookie after MFA. `POST /auth/refresh` atomically revokes the presented active token
  before issuing a replacement pair, and `POST /auth/logout` revokes when possible and
  always clears the cookie.
- `AuthProvider` restores the cookie-backed session at application startup and exposes
  `useSession` actions for login, MFA completion, refresh, logout, and current access
  token retrieval. The injected client seam keeps the component behavior testable.
- Access-token access now refreshes within a 60-second expiry leeway. The shared
  authenticated fetch wrapper retries a 401 exactly once after refresh, then invalidates
  through logout; logout always invokes the supplied cache-clearing seam.
- The browser auth client validates the BFF's login, MFA, refresh, and logout contracts
  before session state changes; the provider keeps the user anonymous until MFA completes.
- `useSession` now directly exposes `user` and `isAuthenticated`. The application-level
  auth boundary blocks protected routed content while restoration is pending or when the
  session is anonymous, forcing re-authentication through SCRUM-193's forthcoming UI.

**Project Scope Connection:**

This establishes the frontend identity boundary for the React SPA. Subsequent slices add
the provider, BFF refresh/logout contract, and authenticated request behavior while
preserving tenant and role isolation.

**Changed Files:**

- `src/pulseUI/auth/session.ts`
- `src/pulseUI/auth/authClient.ts`
- `src/pulseUI/auth/AuthProvider.tsx`
- `src/pulseUI/auth/AuthBoundary.tsx`
- `src/pulseUI/auth/authenticatedFetch.ts`
- `src/pulseUI/app/bootstrap.tsx`
- `src/pulseUI/tests/auth/session.test.tsx`
- `src/pulseUI/tests/auth/AuthProvider.test.tsx`
- `src/pulseUI/tests/auth/authClient.test.tsx`
- `src/pulseUI/tests/auth/authenticatedFetch.test.tsx`
- `src/pulseUI/tests/auth/AuthBoundary.test.tsx`
- `src/typescript/authSessionCookies.ts`
- `src/typescript/authSessionRoutes.ts`
- `src/typescript/authMfaLoginRoutes.ts`
- `src/typescript/refreshTokenRepository.ts`
- `src/typescript/tokenService.ts`
- `src/typescript/coreCaseOpenApi.ts`
- `src/typescript/index.ts`
- `tests/typescript/authSessionRoutes.test.ts`
- `tests/typescript/authMfaLoginRoutes.test.ts`
- `tests/typescript/authMfaLogin.test.ts`
- `tests/typescript/tokenService.test.ts`
- `tests/typescript/bootstrap/authFlow.ts`
- `tests/typescript/coreCaseOpenApi.test.ts`
- `planning/team/cm-ticket-journal.md`

**Validation Notes:**

- `npm test -- --run tests/auth/session.test.tsx --cache=false` passed (3 tests).
- `npm test -- --run tests/auth/session.test.tsx tests/auth/AuthProvider.test.tsx --cache=false` passed (7 tests).
- `npm test -- --run tests/auth/session.test.tsx tests/auth/AuthProvider.test.tsx tests/auth/authenticatedFetch.test.tsx --cache=false` passed (12 tests).
- `npm test -- --run tests/auth/session.test.tsx tests/auth/authClient.test.tsx tests/auth/AuthProvider.test.tsx tests/auth/authenticatedFetch.test.tsx --cache=false` passed (17 tests).
- `npm test -- --run tests/auth/session.test.tsx tests/auth/authClient.test.tsx tests/auth/AuthProvider.test.tsx tests/auth/authenticatedFetch.test.tsx tests/auth/AuthBoundary.test.tsx --cache=false` passed (20 tests).
- `npx vitest run tests/typescript/authSessionRoutes.test.ts tests/typescript/authMfaLoginRoutes.test.ts tests/typescript/tokenService.test.ts tests/typescript/authMfaLogin.test.ts tests/typescript/coreCaseOpenApi.test.ts` passed (22 tests).
- Root `npm run typecheck` remains blocked by pre-existing missing
  `@pact-foundation/pact` resolution and incomplete Tax Engine test doubles. The new
  auth contract compiles before those unrelated test failures.
- Pulse UI `npm run typecheck` remains blocked by pre-existing route parameter/import
  errors and missing `@tailwindcss/vite` type resolution. None reference the auth
  provider or client.

## christopher-martus-jira195 - SCRUM-195

**Branch:** `christopher-martus-jira195`

**Assignee:** Christopher Martus

**Jira Key:** SCRUM-195

**Summary:** Register User

**Description:** As a new user, I want to register an account so that I can securely
access the application.

**Acceptance Criteria:**

- A registration request accepts the required user details and creates a user with a
  securely hashed password.
- A request using an email address that is already registered returns a clear conflict
  error without creating another user.
- A successful registration returns the new user's non-sensitive account details and
  never exposes the password or password hash.

**Code Connection:**

- `authRegistration.ts` defines strict registration input and safe account-output
  schemas, along with server-controlled `Client` and `invited` defaults.
- `authRegistrationService.ts` hashes passwords through the existing Argon2id helper
  before delegating persistence.
- `authRegistrationRepository.ts` inserts the user and credential in one PostgreSQL
  transaction and maps the tenant-email unique-constraint violation to a registration
  conflict.
- `authRoutes.ts` exposes `POST /auth/register`, returning 201 for a safe account DTO,
  400 for invalid bodies, and a Problem Details 409 for duplicate tenant emails.
- `index.ts` wires the repository and service into the runtime auth router.
- `coreCaseOpenApi.ts` documents the registration operation and its 201, 400, and 409
  response contracts alongside the existing Authentication endpoints.

**Project Scope Connection:**

This completes the Identity & Auth registration boundary for the multi-tenant TaxPulse
workspace. It keeps credentials separate from user-profile data, preserves tenant-scoped
email uniqueness, and applies least-privilege defaults without allowing a caller to set
their own role or status.

**Changed Files:**

- `src/typescript/authRegistration.ts`
- `src/typescript/authRegistrationService.ts`
- `src/typescript/authRegistrationRepository.ts`
- `src/typescript/authRoutes.ts`
- `src/typescript/coreCaseOpenApi.ts`
- `src/typescript/index.ts`
- `tests/typescript/authRegistration.test.ts`
- `tests/typescript/authRegistrationService.test.ts`
- `tests/typescript/authRegistrationRoutes.test.ts`
- `tests/typescript/authRegistration.integration.test.ts`
- `tests/typescript/coreCaseOpenApi.test.ts`
- `planning/team/cm-ticket-journal.md`

**Validation Notes:**

- `npm run typecheck` passed.
- The focused registration contract, service, and route tests passed: 9 tests.
- `npx vitest run tests/typescript/coreCaseOpenApi.test.ts --config vitest.config.ts`
  passed: 8 tests.
- `npx vitest run tests/typescript/authRegistration.integration.test.ts --config
  vitest.integration.config.ts` passed with Docker access; it verifies Argon2id storage,
  tenant-scoped conflicts, cross-tenant reuse of an email, and transaction rollback.
- `git diff --check` passed.
- The default sandbox cannot run the wider Testcontainers-backed suite without Docker
  access; registration integration coverage was run with Docker access.

## christopher-martus-jira86 - SCRUM-86

**Branch:** `christopher-martus-jira86`

**Assignee:** Christopher Martus

**Jira Key:** SCRUM-86

**Summary:** Compute scenario deltas against the baseline

**Description:** As an Advisor, I want each scenario's delta versus the baseline
computed, so that I can compare planning options for a client.

**Acceptance Criteria:**

- A scenario request accepts 2-5 scenarios of typed-in figures and rejects fewer than
  2 or more than 5.
- Each result reports total tax and the dollar delta versus the baseline.
- Scenario calculations reuse the same bracket logic as the baseline calculation.

**Code Connection:**

- The persisted scenario result contract now reserves `total_tax` and
  `delta_vs_baseline`. Python comparison request and result models use
  `TaxCalculationRequest` for baseline and scenario typed figures, enforce the 2-5
  request bound, and represent the signed delta. The comparison service calculates the
  baseline once and delegates every scenario to `calculate_tax`, ensuring a single
  calculation path for bracket logic.

**Project Scope Connection:**

This implements the typed Domain Compute contract between ticket 85 scenario persistence
and ticket 87 transport. It does not add an HTTP endpoint, database migration, or bracket
liability calculation.

**Changed Files:**

- `src/typescript/scenario.ts`
- `tests/typescript/scenario.test.ts`
- `tests/typescript/scenarioRepository.test.ts`
- `src/python/tax_pulse_project_team_1/scenario_comparison.py`
- `src/python/tax_pulse_project_team_1/__init__.py`
- `tests/python/test_scenario_comparison.py`
- `planning/team/cm-ticket-journal.md`

**Validation Notes:**

- `.venv\\Scripts\\python.exe -m pytest tests/python/test_scenario_comparison.py`
  passed (7 tests; only an existing pytest-cache permission warning).
- `.venv\\Scripts\\python.exe -m ruff format --check src/python tests/python` passed.
- `.venv\\Scripts\\python.exe -m pyright --pythonpath ".\\.venv\\Scripts\\python.exe"`
  passed with 0 errors and 0 warnings.
- The real-bracket scenario comparison test passed as part of the focused 27-test
  ticket-81/ticket-86 suite.
- `.venv\\Scripts\\python.exe -m pytest tests/python/test_tax_calculation.py
  tests/python/test_tax_brackets.py tests/python/test_tax_bracket_schedules.py
  tests/python/test_scenario_comparison.py` passed (27 tests; only an existing
  pytest-cache permission warning).
- `.venv\\Scripts\\python.exe -m ruff format --check src/python tests/python` passed.
- `.venv\\Scripts\\python.exe -m pyright --pythonpath ".\\.venv\\Scripts\\python.exe"`
  passed with 0 errors and 0 warnings.

## christopher-martus-jira81 - SCRUM-81

**Branch:** `christopher-martus-jira81`

**Assignee:** Christopher Martus

**Jira Key:** SCRUM-81

**Summary:** Implement bracket liability and effective/marginal rates

**Description:** As an Advisor, I want federal and state bracket liability with effective
and marginal rates, so that each Tax Plan Cycle shows real numbers.

**Acceptance Criteria:**

- The engine computes federal and state bracket liability for a given filing status and
  state.
- It derives the effective rate and the marginal rate from the brackets.
- Identical inputs always return identical outputs (deterministic, no ML).

**Code Connection:**

- This first implementation slice adds an immutable `TaxBracket` value object and a
  pure `calculate_bracket_liability` helper. The helper accumulates each reached income
  range without I/O, time, randomness, or mutable shared state.
- This second slice supplies immutable 2026 federal and 2025 California schedules for
  every supported filing status. `get_bracket_schedules` returns the federal and
  requested state schedules through a state-neutral lookup mapping.
- This third slice upgrades the calculation contract to `Decimal` monetary values and
  returns rounded federal, state, and total liabilities with combined effective and
  marginal rates. It normalizes supported state codes and returns zero rates when
  taxable income is zero.

**Project Scope Connection:**

This establishes the deterministic progressive-tax primitive for the Domain Compute
service. The public calculation response and rate outputs will be added in subsequent
SCRUM-81 slices.

**Changed Files:**

- `src/python/tax_pulse_project_team_1/tax_calculation.py`
- `tests/python/test_tax_brackets.py`
- `tests/python/test_tax_bracket_schedules.py`
- `tests/python/test_tax_calculation.py`
- `planning/team/cm-ticket-journal.md`

**Validation Notes:**

- Isolated calculation assertions for multi-bracket, boundary, and zero-income cases
  passed via direct module execution.
- `python -m ruff format --check src/python/tax_pulse_project_team_1/tax_calculation.py
  tests/python/test_tax_brackets.py` passed.
- `python -m pyright src/python/tax_pulse_project_team_1/tax_calculation.py` passed.
- Isolated schedule lookup assertions for all supported filing statuses and California
  bounds passed via direct module execution.
- Isolated end-to-end assertions for the exact single-filer liabilities/rates,
  zero-taxable-income rates, and repeated identical requests passed via direct module
  execution.
- Pytest collection is currently blocked before tests run because the local Python
  environment is missing the project dependency `boto3`.

## christopher-martus_jira85 - SCRUM-85

**Branch:** `christopher-martus_jira85`

**Assignee:** Christopher Martus

**Jira Key:** SCRUM-85

**Summary:** Create the scenario table for typed-in figures

**Description:** As a Backend Developer, I want a scenario table, so that 2-5 modeled
scenarios are persisted per cycle.

**Acceptance Criteria:**

- A migration creates a scenario table keyed to a case with name, typed-in figures, and
  computed result.
- A constraint or repository check limits a case to between 2 and 5 scenarios.
- A test asserts a 6th scenario insert is rejected.

**Code Connection:**

- The first implementation slice defines the shared TypeScript schemas for manually
  entered calculation figures and stored calculation results, plus the matching Drizzle
  table contract. The migration creates that table, and the tenant-scoped repository
  locks the parent case while counting inserts so a sixth scenario is rejected safely.

**Project Scope Connection:**

This establishes the PostgreSQL persistence boundary between Tax Plan Cycles and Domain
Compute scenario comparisons. It does not expose an HTTP endpoint or calculate deltas.

**Changed Files:**

- `src/typescript/scenario.ts`
- `src/typescript/db/schema.ts`
- `src/typescript/db/drizzle-migrations/0006_scenario.sql`
- `src/typescript/db/drizzle-migrations/meta/0006_snapshot.json`
- `src/typescript/db/drizzle-migrations/meta/_journal.json`
- `tests/typescript/scenario.test.ts`
- `tests/typescript/scenarioMigration.test.ts`
- `src/typescript/scenarioRepository.ts`
- `tests/typescript/scenarioRepository.test.ts`
- `planning/team/cm-ticket-journal.md`

**Validation Notes:**

- `npm run typecheck` passed.
- `npx vitest run tests/typescript/scenario.test.ts` passed (2 tests).
- `npm run db:check` passed.
- `npx vitest run tests/typescript/scenarioMigration.test.ts` is blocked because this
  environment has no working container runtime for Testcontainers.
- `npx vitest run tests/typescript/scenarioRepository.test.ts` is blocked for the same
  Testcontainers runtime limitation; it contains the acceptance case that persists five
  scenarios and rejects the sixth.

## christopher-martus-jira79 - SCRUM-79

**Branch:** `christopher-martus-jira79`

**Assignee:** Christopher Martus

**Jira Key:** SCRUM-79

**Summary:** Create the bracket reference tables

**Description:** As a Backend Developer, I want federal and state bracket reference
tables seeded, so that the engine computes liability from real brackets.

**Acceptance Criteria:**

- A migration creates federal and state bracket tables with rate, lower, and upper
  bounds by filing status.
- A seed loads current-year federal and a sample state's brackets.
- A query returns the brackets for a given filing status and state.

**Code Connection:**

- Drizzle schema definitions and migration `0005_fair_reaper.sql` create the global
  `federal_tax_bracket` and `state_tax_bracket` reference tables, including tax year,
  filing status, rate, lower bound, and nullable upper bound.
- The shared seed loads all five supported filing statuses using 2026 federal schedules
  from IRS Publication 505 and California's currently published 2025 Form 540 schedules.
- `createBracketReferenceRepository` returns separately ordered federal and requested
  state brackets for a filing status and state code.

**Project Scope Connection:**

This implements the reference-data persistence seam required by the Domain Compute
service. The tables are global statutory data rather than tenant data. This ticket does
not calculate liability, expose an HTTP endpoint, change the Python calculation seam, or
add additional state datasets.

**Changed Files:**

- `src/typescript/db/schema.ts`
- `src/typescript/db/drizzle-migrations/0005_fair_reaper.sql`
- `src/typescript/db/drizzle-migrations/meta/0005_snapshot.json`
- `src/typescript/db/drizzle-migrations/meta/_journal.json`
- `src/typescript/db/seed.model.ts`
- `src/typescript/db/seed.ts`
- `src/typescript/bracketReferenceRepository.ts`
- `src/typescript/index.ts`
- `tests/typescript/brackets/bracketReferenceMigration.test.ts`
- `tests/typescript/brackets/bracketReferenceRepository.test.ts`
- `package.json`
- `planning/team/ticket-journal.md`

**Validation Notes:**

- `npm run typecheck` passed after the schema, seed, and repository changes.
- `npm run db:check` passed after generating the Drizzle migration.
- Focused PostgreSQL tests and `npm run test:migration` require Testcontainers; they are
  blocked in this environment because no working container runtime is available.
