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
## christopher-martus-jira133 - SCRUM-133

**Branch:** `christopher-martus-jira133`

**Assignee:** Christopher Martus

**Jira Key:** SCRUM-133

**Summary:** Write stage transitions through a transactional outbox

**Description:** As a Backend Developer, I want stage transitions written through an
outbox, so that an event is never lost when the case commits.

**Acceptance Criteria:**

- The stage change and its outbox row commit in the same database transaction.
- The outbox row carries the serialized CloudEvent payload.
- A test asserts a rolled-back transition leaves no outbox row.

**Code Connection:**

- The first implementation slice adds the minimal `outbox_event` persistence contract
  with a generated identifier, serialized text payload, and creation timestamp.
- The second slice moves CloudEvent construction and its input types into the domain event
  module so both database persistence and SNS delivery can reuse the same validated
  payload without coupling the repository to AWS infrastructure.
- The third slice builds the CloudEvent from the tenant-scoped database row and writes its
  serialized payload alongside the cycle stage and transition history in the existing
  Drizzle transaction. Production composition no longer directly publishes during the
  request, leaving the SNS publisher available for the SCRUM-134 relay.
- The final slice extends the successful transition integration path to validate the
  serialized outbox payload against the CloudEvent schema and forces an outbox insert
  failure to prove the cycle, transition history, and outbox row roll back together.

**Project Scope Connection:**

The outbox table establishes the durable database boundary required to prevent committed
stage-change events from being lost before asynchronous delivery.

**Changed Files:**

- `src/typescript/shared/database/schema.ts`
- `src/typescript/shared/database/drizzle-migrations/0010_outbox_event.sql`
- `src/typescript/shared/database/drizzle-migrations/meta/0007_snapshot.json`
- `src/typescript/shared/database/drizzle-migrations/meta/0008_snapshot.json`
- `src/typescript/shared/database/drizzle-migrations/meta/0009_snapshot.json`
- `src/typescript/shared/database/drizzle-migrations/meta/0010_snapshot.json`
- `src/typescript/shared/database/drizzle-migrations/meta/_journal.json`
- `src/typescript/shared/database/migrate.ts`
- `src/typescript/shared/database/seed.ts`
- `src/typescript/shared/scripts/drizzleMigrations.ts` (removed)
- `src/typescript/shared/scripts/runMigrations.ts` (removed)
- `tests/typescript/bootstrap/migrationTestUtils.ts`
- `drizzle.config.ts`
- `README.md`
- `src/typescript/features/taxPlanCycle/stageChangedEvent.ts`
- `src/typescript/features/taxPlanCycle/infrastructure/stageChangedSnsPublisher.ts`
- `src/typescript/features/taxPlanCycle/index.ts`
- `src/typescript/features/taxPlanCycle/repositories/repository.ts`
- `src/typescript/index.ts`
- `tests/typescript/features/taxPlanCycle/integration.test.ts`
- `planning/team/cm-ticket-journal.md`

**Validation Notes:**

- `npm run db:check` passed and loaded the updated Drizzle schema successfully.
- `git diff --check` passed.
- A focused `tsx` check built and schema-validated a deterministic stage-changed
  CloudEvent through the relocated domain helper.
- `npm run db:check` and `git diff --check` continue to pass after the second slice.
- A scoped strict TypeScript compile of the updated repository passed after the third
  slice.
- `npm run db:check` and `git diff --check` continue to pass with the transactional write.
- The application and TypeScript test typechecks passed. The combined `npm run typecheck`
  then stopped in the unrelated Pulse UI because its local `@playwright/test` type
  dependency is absent.
- The focused CloudEvent schema and SNS publisher suites passed: 11 tests in two files.
- Rebuilt the inherited Drizzle metadata chain so tenant login, deductions, client roster,
  and the outbox are registered sequentially as migrations `0007` through `0010` with
  matching snapshots. A no-op `drizzle-kit generate` confirmed there is no schema drift.
- `npm run db:check`, `npm run typecheck`, and `git diff --check` passed after rebuilding
  the migration metadata.
- Standardized runtime, seed, and test migration execution on Drizzle. Drizzle Kit remains
  the operator CLI, while the programmatic paths use Drizzle ORM's PostgreSQL migrator
  and the shared `drizzle.__drizzle_migrations` ledger.
- Removed the custom filename scanner and `drizzle_schema_migrations` ledger. Destructive
  seed and shared-schema test setup now remove both `public` and `drizzle` before replaying
  the generated journal from `0000`.
- `npm run db:gen -- --name verify_no_schema_drift` reported no schema changes and created
  no migration files. `npm run db:check`, `npm run typecheck`, and `git diff --check` passed.
- `npm test` and `npm run test:integration` reached their database-backed suites but could
  not start Testcontainers because no Docker-compatible runtime is available. The explicit
  integration run still passed its six non-container authentication tests.
- The Tax Plan Cycle integration suite collected successfully, but its 22 database tests
  could not start because no Docker-compatible container runtime is available locally.
  This includes both new transactional-outbox acceptance paths.
- The cumulative SCRUM-133 diff is 316 changed lines (255 additions and 61 deletions),
  remaining below the 500-line PR limit.

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

## christopher-martus-jira193 - SCRUM-193

**Branch:** `christopher-martus-jira193`

**Assignee:** Christopher Martus

**Jira Key:** SCRUM-193

**Ticket:** [SCRUM-193](../Tax_pulse.csv)

**Related ADRs:** [ADR-0017: Pulse UI React/Vite shell](../../adr/0017-pulse-ui-react-vite-shell.md) and [ADR-0020: Pulse UI layered application structure](../../adr/0020-pulse-ui-layered-application-structure.md)

**Summary:** Build the sign-in, MFA, and password-reset UI wired to the auth context

**Description:** Provide SPA sign-in, MFA challenge, and mocked password-reset screens
on the auth-context foundation supplied by SCRUM-192.

**Acceptance Criteria:**

- Anonymous users see sign-in as the protected-workspace entry view.
- Sign-in, MFA, and password-reset routes are public screens.
- Sign-in submits credentials through the shared auth context and passes its MFA challenge
  only through browser navigation state to the MFA screen.
- MFA completion establishes the session, routes using the authenticated role, and logout
  returns the SPA to sign-in.
- Reset request and confirmation are local-only UI routes; they call no live endpoint.
- Component coverage exercises the successful sign-in/MFA/logout flow and the reset
  flow's no-network guarantee.

**Deferred Role-Landing Note:**

The SPA preserves the authenticated role and invokes role-based landing selection after
MFA. All roles currently land on the shared dashboard because distinct role-specific
views have not yet been delivered. The client portal is planned in SCRUM-142 and
SCRUM-144; Firm Admin screens in SCRUM-146 through SCRUM-150; and TaxPulse Platform
Admin screens in SCRUM-151 and SCRUM-152. This ticket must be revisited when those
destinations are available.

**Code Connection:**

- The router now separates public authentication routes from an `AuthBoundary`-guarded
  workspace layout. The boundary uses the new sign-in screen for anonymous sessions.
- The sign-in form calls `useSession().login`; the typed, ephemeral route state carries
  the returned tenant, email, and user challenge to the MFA view without persisting it.
- MFA verification returns the authenticated user to the UI for role-based landing
  selection. The current MVP maps every role to the existing dashboard until the later
  client and platform-admin landing screens are available.
- Shared authentication-screen styles use the established TaxPulse navy, gold, teal, and
  Inter design language. The reset request form navigates locally to confirmation only.
- Vite proxies only the local BFF auth endpoints while preserving the tenant subdomain;
  this leaves Vite's `/auth/*.tsx` source-module URLs available to the browser. Password
  login sends only email and password; the BFF derives tenant identity from that hostname.

**Project Scope Connection:**

This is the first UI-routing slice for the React SPA authentication flow. It introduces
no BFF endpoint, token, password-reset, or authorization-policy change.

**Migration Impact:**

None. This ticket changes browser routes and UI state only; it adds no schema, data, or
service migration.

**Risk Notes:**

Until the deferred role-specific views ship, all authenticated users share the dashboard
landing route. Server-side authorization and tenant-scoped BFF enforcement remain the
source of truth for access control.

**Changed Files:**

- `src/pulseUI/app/bootstrap.tsx`
- `src/pulseUI/app/routeTree.tsx`
- `src/pulseUI/auth/AuthBoundary.tsx`
- `src/pulseUI/auth/landingPath.ts`
- `src/pulseUI/auth/mfaChallengeState.ts`
- `src/pulseUI/auth/session.ts`
- `src/pulseUI/auth/AuthProvider.tsx`
- `src/pulseUI/auth/authClient.ts`
- `src/pulseUI/components/AppShell.tsx`
- `src/pulseUI/shared/styles.css`
- `src/pulseUI/vite.config.ts`
- `src/pulseUI/pages/auth/SignInPage.tsx`
- `src/pulseUI/pages/auth/MfaChallengePage.tsx`
- `src/pulseUI/pages/auth/PasswordResetPage.tsx`
- `src/pulseUI/pages/auth/PasswordResetConfirmationPage.tsx`
- `src/pulseUI/tests/auth/AuthenticatedSessionProvider.tsx`
- `src/pulseUI/tests/auth/SignInPage.test.tsx`
- `src/pulseUI/tests/auth/PasswordResetPage.test.tsx`
- `src/pulseUI/tests/auth/authClient.test.tsx`
- Existing Pulse UI route/component tests
- `planning/team/cm-ticket-journal.md`

**Validation Notes:**

- `npm --prefix src/pulseUI test` passed: 48 tests in 13 files.
- `npm --prefix src/pulseUI run typecheck` passed.
- Root `npm run typecheck` passed after restoring the lockfile-pinned
  `@pact-foundation/pact` development dependency.
- `npm --prefix src/pulseUI run build` reaches production bundling but is blocked in this
  checkout because Windows holds `dist/pulseUI/assets/index-BSegwS6H.css` open. Release
  the external file lock or remove the stale generated output before rerunning the build.
- Vitest result caching is disabled in the UI config so test runs do not depend on writing
  to the local `node_modules/.vite` cache directory.

## Follow-up: merged sign-in regression repair

**Branch:** `christopher-martus-jira193`

**Assignee:** Christopher Martus

**Jira Key:** SCRUM-193

**Summary:** Restore the sign-in UI after the merged route and session changes.

**Description:** Remove duplicated Pulse UI route registrations that prevent router construction.
Retain hostname-derived tenant selection and allow refresh cookies over local HTTP while keeping
production cookies secure.

**Acceptance Criteria:**

- The SPA router constructs without duplicate route identifiers.
- Tenant identity continues to derive from the `{tenant-slug}.localhost` hostname.
- Local HTTP sessions retain refresh cookies; production sessions retain the `Secure` cookie flag.

**Code Connection:** Workspace routes are registered only beneath the authenticated workspace
layout and rely on its `AuthBoundary`; the obsolete `localStorage` route guard no longer bypasses
the auth context. The production composition passes cookie security based on `NODE_ENV`, while
router defaults preserve secure cookies for non-local consumers and focused test servers.

**Project Scope Connection:** This repairs SCRUM-193's sign-in and MFA session flow without
changing tenancy resolution or authorization policy.

**Changed Files:**

- `src/pulseUI/app/routeTree.tsx`
- `src/typescript/authSessionCookies.ts`
- `src/typescript/authSessionRoutes.ts`
- `src/typescript/authMfaLoginRoutes.ts`
- `src/typescript/index.ts`
- `tests/typescript/authSessionRoutes.test.ts`
- `planning/team/cm-ticket-journal.md`

**Validation Notes:**

- `npm run typecheck` passed.
- `npm --prefix src/pulseUI test -- --run tests/auth` passed: 24 tests in 7 files.
- `npx vitest run tests/typescript/authSessionRoutes.test.ts tests/typescript/authMfaLoginRoutes.test.ts --config vitest.config.ts` passed.
- `planning/team/cm-ticket-journal.md`

## christopher-martus-jira103 - SCRUM-103

**Branch:** `christopher-martus-jira103`

**Assignee:** Christopher Martus

**Jira Key:** SCRUM-103

**Summary:** Render Estimated Tax by Quarter and Income Breakdown charts

**Description:** As an Advisor, I want the quarterly and income charts, so that the
client's tax picture is visible at a glance.

**Acceptance Criteria:**

- An Estimated Tax by Quarter bar chart renders the four quarterly estimates.
- An Income Breakdown chart renders income by source.
- Charts re-render when the underlying calculation data changes.

**Code Connection:**

- The initial implementation slice adds the typed read-model contract consumed by the
  dashboard chart region. It carries one calculation identifier, exactly four labelled
  quarterly estimates, and income totals grouped by source. `DashboardPage` now accepts
  the latest snapshot at its component boundary. Responsive Estimated Tax by Quarter and
  Income Breakdown components render the supplied quarter estimates and income sources.

**Project Scope Connection:**

This is the front-end contract for the Read-models/BFF data used by the two dashboard
charts. It does not add a BFF endpoint, persistence, or a charting dependency. The
dashboard shows clearly synthetic fallback chart values until the BFF supplies a current
calculation snapshot.

**Changed Files:**

- `src/pulseUI/pages/dashboard/dashboardChartData.ts`
- `src/pulseUI/pages/dashboard/QuarterlyTaxChart.tsx`
- `src/pulseUI/pages/dashboard/QuarterlyTaxChart.module.css`
- `src/pulseUI/pages/dashboard/IncomeBreakdownChart.tsx`
- `src/pulseUI/pages/dashboard/IncomeBreakdownChart.module.css`
- `src/pulseUI/pages/dashboard/DashboardPage.tsx`
- `src/pulseUI/tests/dashboard/DashboardCharts.test.tsx`
- - `planning/team/cm-ticket-journal.md`

**Validation Notes:**
- `npm run typecheck` passed.
- `git diff --check` passed.
- `npm --prefix src/pulseUI test -- DashboardCharts.test.tsx` passed (1 test).
- `DashboardCharts.test.tsx` covers initial chart values and re-rendering after a new
  calculation snapshot is received.

## christopher-martus-jira104 - SCRUM-104

**Branch:** `christopher-martus-jira104`

**Assignee:** Christopher Martus

**Jira Key:** SCRUM-104

**Summary:** Render Tax Breakdown and Year-over-Year charts

**Description:** As an Advisor, I want the Tax Breakdown and Year-over-Year visuals, so
that the dashboard is complete per the wireframe.

**Acceptance Criteria:**

- A Tax Breakdown panel renders federal, state, and effective-rate figures.
- A Year-over-Year chart compares the current year against the prior year.
- The four dashboard KPI cards (Estimated Total Tax, Effective Rate, YTD Gross Income,
  Outstanding Payments) render.

**Code Connection:**

- The typed dashboard read-model now includes KPI, tax-breakdown, and current/prior-year
  tax comparison fields, along with clearly synthetic fallback data.
- `DashboardPage` renders the four required KPI cards and a data-driven federal, state,
  and effective-rate breakdown. `YearOverYearTaxChart` presents the current and prior
  tax years with accessible labels and proportional bars.
- The dashboard visual test renders the page with two calculation snapshots and confirms
  the required visual labels and updated values.

**Project Scope Connection:**

This completes the MVP dashboard presentation layer for the Read-models/BFF workstream.
It consumes the existing typed component boundary and does not add a BFF endpoint,
persistence, or a third-party chart dependency.

**Changed Files:**

- `src/pulseUI/pages/dashboard/dashboardChartData.ts`
- `src/pulseUI/pages/dashboard/DashboardPage.tsx`
- `src/pulseUI/pages/dashboard/YearOverYearTaxChart.tsx`
- `src/pulseUI/pages/dashboard/YearOverYearTaxChart.module.css`
- `src/pulseUI/tests/dashboard/DashboardCharts.test.tsx`
- `planning/team/cm-ticket-journal.md`

**Validation Notes:**

- `npm run typecheck` passed.
- `npm --prefix src/pulseUI run test -- --run tests/dashboard/DashboardCharts.test.tsx`
  passed (2 tests).
- `git diff --check` passed.
- The Estimated Total Tax KPI is derived from the displayed federal and state amounts,
  preventing the summary from disagreeing with the Tax Breakdown panel.


## christopher-martus-jira105 - SCRUM-105

**Branch:** `christopher-martus-jira105`

**Assignee:** Christopher Martus

**Jira Key:** SCRUM-105

**Summary:** Scaffold the Income screen component from the wireframe

**Description:** As a Frontend Developer, I want a typed Income screen component
scaffolded from the wireframe, so that the screen has a stable structure before data is
wired.

**Acceptance Criteria:**

- A typed React component renders the Income screen layout (header, KPI region, table
  region) matching the wireframe.
- The component declares typed props for the income data it will receive.
- The component renders inert placeholder regions with no data fetching yet.

**Code Connection:**

- `IncomePage` exports typed income-event and screen-prop contracts, then renders the
  wireframe-aligned Income Events header, five source KPI placeholders, table shell, and
  empty placeholder state without reading from an API or query hook.
- The `/income` route preserves its authentication boundary and provides an empty typed
  payload so the scaffold can be reached without introducing live data behavior.

**Project Scope Connection:**

This creates the stable presentation seam for the React SPA's Income workspace. It
intentionally excludes the income query hook, loading/error states, add-income form,
live table rendering, and component/accessibility tests, which are owned by subsequent
Income tickets.

**Changed Files:**

- `src/pulseUI/pages/income/IncomePage.tsx`
- `src/pulseUI/pages/income/IncomePage.module.css`
- `src/pulseUI/app/routeTree.tsx`
- `planning/team/cm-ticket-journal.md`

**Validation Notes:**

- `git diff --check` passed.
- `npm run typecheck` is blocked by existing unresolved `react-hook-form` and
  `@hookform/resolvers/zod` imports in `ScenarioPlanningForm.tsx`.
- `npm run build` is blocked by the same existing unresolved dependencies.

## christopher-martus-jira193 - SCRUM-193 authentication completion follow-up

**Branch:** `christopher-martus-jira193`

**Assignee:** Christopher Martus

**Jira Key:** SCRUM-193

**Summary:** Complete the SPA authentication route and logout acceptance criteria

**Description:** Remove the duplicate placeholder login experience, place all workspace
routes behind the shared authentication boundary, wire every visible logout control, make
anonymous route tests restore an actually anonymous session, and document tenant-aware
local SPA login.

**Acceptance Criteria:**

- `/sign-in` is the only registered SPA sign-in route; the obsolete `/login` route and
  placeholder page are removed.
- Root, operator, and administration workspace routes redirect anonymous sessions to the
  real sign-in screen.
- Both the sidebar Logout and topbar Sign out controls call the auth-context logout path
  and return the user to sign-in.
- Component coverage exercises anonymous refresh failure, authenticated administration,
  sign-in through MFA, and both visible logout controls.
- Local development guidance uses `{tenant-login-slug}.localhost:5173` and explains why
  plain localhost cannot resolve a login workspace.

**Code Connection:**

- Administration routes are children of the `AuthBoundary`-guarded workspace layout, and
  the root route exposes only the public sign-in, MFA, and password-reset screens.
- `AppShell` shares one logout handler between its sidebar and topbar controls, relying on
  the auth provider's existing finally-path to clear the session before redirecting.
- `TestSessionProvider` can return a valid refresh session or reject refresh for anonymous
  coverage, while allowing focused client-method spies.
- The README documents the tenant-subdomain URL already preserved by the Vite proxy; no
  tenant ID is added to the login payload and no backend contract changes.

**Project Scope Connection:**

This closes the remaining SCRUM-193 SPA entry, route protection, logout, and local-login
usability gaps while preserving server-controlled tenant resolution and existing
role-landing behavior.

**Changed Files:**

- `README.md`
- `src/pulseUI/app/routeTree.tsx`
- `src/pulseUI/components/AppShell.tsx`
- `src/pulseUI/components/AppShell.module.css`
- `src/pulseUI/pages/LoginPage.tsx` (removed)
- `src/pulseUI/tests/appShell.test.tsx`
- `src/pulseUI/tests/auth/AuthenticatedSessionProvider.tsx` (replaced)
- `src/pulseUI/tests/auth/TestSessionProvider.tsx`
- Authenticated workspace component tests updated to import `TestSessionProvider`
- `planning/team/cm-ticket-journal.md`

**Validation Notes:**

- `git diff --check` passed.
- `npm --prefix src/pulseUI run typecheck` passed.
- Focused Pulse UI auth/workspace validation passed: 38 tests in 7 files.
- `npm run typecheck` passed for application, tests, and Pulse UI.
- The full Pulse UI run passed 77 tests and retained four pre-existing failures: the
  Deductions and Scenario Planner route tests render protected routes without an auth
  provider. Supplying authentication also exposes that `/scenarios` currently renders
  `EmptyPage`, outside SCRUM-193.
- `npm --prefix src/pulseUI run build` transformed all modules but could not empty the
  output directory because Windows holds `dist/pulseUI/assets/index-CkhYVya1.js` open.
- Root `npm test` completed typechecking but remains blocked by unavailable Testcontainers
  runtime tests and the existing Tax Plan Cycle JWT response assertion that expects a
  `scenarios` field.

## christopher-martus-jira193 - SCRUM-193 negative-path test follow-up

**Branch:** `christopher-martus-jira193`

**Assignee:** Christopher Martus

**Jira Key:** SCRUM-193

**Summary:** Add negative-path coverage for the SPA sign-in and MFA flow

**Description:** Extend the end-to-end component test for this branch's authentication
screens beyond the successful sign-in, MFA, dashboard, and logout path.

**Acceptance Criteria:**

- Rejected credentials display the generic sign-in error and do not advance to MFA.
- Rejected MFA verification displays an error and does not establish a workspace session.
- Direct access to the MFA route without ephemeral challenge state returns the user to a
  safe sign-in recovery path and never submits an MFA request.

**Code Connection:** The route-level component coverage supplies rejecting auth-client
test doubles and verifies both visible feedback and the absence of downstream authentication
calls or protected dashboard content.

**Project Scope Connection:** These cases protect SCRUM-193's public authentication screens
and ephemeral MFA-state boundary without changing production authentication behavior.

**Changed Files:**

- `src/pulseUI/tests/auth/SignInPage.test.tsx`
- `planning/team/cm-ticket-journal.md`

**Validation Notes:**

- Focused sign-in coverage passed: 4 tests in 1 file.
- Full Pulse UI coverage passed: 107 tests in 29 files.
- `npm --prefix src/pulseUI run typecheck` passed.
- `git diff --check` passed.

## christopher-martus-jira193 - SCRUM-193 authentication styling follow-up

**Branch:** `christopher-martus-jira193`

**Assignee:** Christopher Martus

**Jira Key:** SCRUM-193

**Summary:** Align public authentication screens with the current Pulse UI theme

**Description:** Replace the legacy light navy, teal, and gold authentication treatment
with the dark indigo visual system used by the authenticated TaxPulse workspace.

**Acceptance Criteria:**

- Sign-in, MFA challenge, and password-reset screens use the shared workspace typography,
  color tokens, surfaces, borders, controls, and focus treatment.
- Authentication cards retain readable error states and responsive mobile sizing.
- Existing authentication behavior and accessible form semantics remain unchanged.

**Code Connection:** The shared authentication selectors now consume the current Pulse UI
design tokens, add the same gradient brand mark used by the workspace shell, and provide
consistent interactive states for inputs, buttons, and links. Because the public routes
share this style layer, the sign-in, MFA, reset request, and reset confirmation screens stay
visually consistent without duplicating page-level styles.

**Project Scope Connection:** This closes the visual-system gap in SCRUM-193's public SPA
authentication flow without changing tenant resolution, credentials, MFA state, or session
behavior.

**Changed Files:**

- `src/pulseUI/shared/styles.css`
- `planning/team/cm-ticket-journal.md`

**Validation Notes:**

- Full Pulse UI coverage passed: 107 tests in 29 files.
- `npm --prefix src/pulseUI run typecheck` passed.
- A production Vite build passed using an isolated temporary output directory. The normal
  `dist/pulseUI` directory was locked by an existing Node process during validation.
- `git diff --check` passed.




## christopher-martus-jira108 - SCRUM-108

**Branch:** `christopher-martus-jira108`

**Assignee:** Christopher Martus

**Jira Key:** SCRUM-108

**Summary:** Build the Add Income form with react-hook-form and zod

**Description:** As a Frontend Developer, I want an Add Income form validated with
react-hook-form and zod, so that malformed income entries are rejected at the boundary.

**Acceptance Criteria:**

- The form captures source, type, amount, and withholding and validates with
  react-hook-form and zod.
- A negative amount or missing required field surfaces an inline validation message and
  blocks submit.
- A valid submit invokes the create handler with the typed payload.

**Code Connection:**

- The first implementation slice defines the route-local Zod schema for source, type,
  amount, and withholding. It separates raw form input from the parsed create payload,
  trims the source, restricts type to the existing income categories, and converts
  monetary input strings to finite, non-negative numbers.
- `IncomePage` consumes and re-exports the shared category type so the screen and future
  form use one income-type contract.
- The second slice adds `IncomeEntryForm`, which delegates form state to react-hook-form
  and validation to the Zod resolver. Required and invalid values render associated
  inline alerts, while valid parsed payloads invoke the typed create handler before the
  modal closes.
- The third slice adds a typed create-handler prop to `IncomePage`, enables both existing
  Add Income controls, and uses page-local state to open and close the form. The route
  supplies the composition seam that SCRUM-109 can replace with live creation and table
  refresh behavior.
- The fourth slice styles the form with the Income screen's established Segoe UI stack,
  dark surfaces, slate text, indigo actions, responsive layout, and visible validation
  and focus states while reusing the shared modal shell.
- The final slice covers missing fields, negative amounts, and successful submission of
  parsed numeric values through the typed create handler.

**Project Scope Connection:**

This completes the typed validation boundary, functional Add Income form, Income page
launch flow, visual treatment, and focused acceptance coverage. API persistence and
table refresh remain outside this ticket.

**Changed Files:**

- `src/pulseUI/pages/income/incomeEntrySchema.ts`
- `src/pulseUI/pages/income/IncomeEntryForm.tsx`
- `src/pulseUI/pages/income/IncomeEntryForm.module.css`
- `src/pulseUI/pages/income/IncomePage.tsx`
- `src/pulseUI/tests/components/IncomeEntryForm.test.tsx`
- `src/pulseUI/app/routeTree.tsx`
- `planning/team/cm-ticket-journal.md`

**Validation Notes:**

- `npm --prefix src/pulseUI run typecheck` passed.
- `npm --prefix src/pulseUI test -- --run tests/components/IncomeEntryForm.test.tsx`
  passed: 3 tests.

## christopher-martus-jira120 - SCRUM-120

**Branch:** `christopher-martus-jira120`

**Assignee:** Christopher Martus

**Jira Key:** SCRUM-120

**Summary:** Render the KPI cards and read-only quarter timeline

**Description:** As a Frontend Developer, I want the KPI cards and quarter timeline
rendered read-only, so that estimated amounts and deadlines are visible without any
recording action.

**Acceptance Criteria:**

- The four 1040-ES quarter items render with date and estimated amount from the hook data.
- KPI cards render total estimated, paid so far, and remaining; a withholding-progress
  bar renders coverage.
- No mark-paid or payment-recording control is present; recording remains outside MVP.

**Code Connection:**

- The quarterly-estimate view model retains the endpoint's covered and remaining values,
  allowing the KPI cards to sum the API contract directly while withholding remains the
  separate input to the coverage calculation.
- The withholding bar clamps coverage to the 0-100 range and exposes its value through a
  progress indicator.
- The page removes synthetic fallback quarters and maps successful hook data into a
  canonical Q1-Q4 timeline with each deadline and estimated amount visible.
- The focused route/component coverage verifies four hook-backed quarter items, KPI
  totals, withholding coverage, and the absence of payment-recording controls.

**Project Scope Connection:**

This completes the read-only Quarterly Payments presentation slice for the React SPA. It
consumes the tenant-scoped query boundary without introducing payment mutations, forms,
or recording behavior. Loading, empty, and error-state presentation remains owned by
SCRUM-119, while broader accessibility coverage remains owned by SCRUM-121.

**Changed Files:**

- `src/pulseUI/components/QuarterlyTimelineItem.tsx`
- `src/pulseUI/components/WithholdingProgressChart.tsx`
- `src/pulseUI/pages/quarterlyPayments/QuarterlyPaymentsPage.tsx`
- `src/pulseUI/tests/quarterlyPayments/QuarterlyPaymentsPage.test.tsx`
- `planning/team/cm-ticket-journal.md`

**Validation Notes:**

- `npm --prefix src/pulseUI run typecheck` passed.
- `npm --prefix src/pulseUI test -- tests/quarterlyPayments/QuarterlyPaymentsPage.test.tsx`
  passed: 4 tests.
- `npm --prefix src/pulseUI run build` passed; Vite reported only its existing bundle-size
  advisory.
- The full Pulse UI run passed 121 of 123 tests. Two unrelated Deductions tests fail
  because their `caseApiGetJson` expectations omit the authenticated fetcher argument;
  the SCRUM-120 test file passed within the same run.
- `git diff --check` passed.

## christopher-martus-jira121 - SCRUM-121

**Branch:** `christopher-martus-jira121`

**Assignee:** Christopher Martus

**Jira Key:** SCRUM-121

**Summary:** Add accessibility and a component test for the Quarterly Payments screen

**Description:** As a Frontend Developer, I want the Quarterly Payments screen to pass
an axe check and a component test, so that it is accessible and regression-guarded.

**Acceptance Criteria:**

- An axe accessibility check on the rendered screen reports no violations.
- A component test asserts the four quarter items and KPI cards render from sample data.
- The test asserts no payment-recording control is present in the rendered screen.

**Code Connection:**

- The existing Quarterly Payments component test now runs `vitest-axe` against the
  production screen rendered with its reusable sample-data fixture.
- The regression assertions explicitly cover Q1 through Q4 and scope the three expected
  totals to the labeled KPI region.
- The read-only assertion continues to guard against payment and mark-paid controls.

**Project Scope Connection:**

This adds focused accessibility and regression coverage to the read-only Quarterly
Payments presentation without changing its production behavior or the loading, empty,
error, and retry states owned by SCRUM-119.

**Changed Files:**

- `src/pulseUI/tests/quarterlyPayments/QuarterlyPaymentsPage.test.tsx`
- `planning/team/cm-ticket-journal.md`

**Validation Notes:**
- Corrected the loading-state regression assertion to expect the two rendered occurrences
  of `$3,620`: the Q1 estimated amount and its withholding-applied value.
- `npm --prefix src/pulseUI test -- tests/quarterlyPayments/QuarterlyPaymentsPage.test.tsx`
  passed: 8 tests, including the axe check.
- `npm --prefix src/pulseUI run typecheck` passed.
- The full Pulse UI run passed 122 of 124 tests. The same two unrelated Deductions
  tests documented by SCRUM-120 fail because their `caseApiGetJson` expectations omit
  the authenticated fetcher argument; all Quarterly Payments tests passed.
- `git diff --check` passed.

## christopher-martus-jira109 - SCRUM-109

**Branch:** `christopher-martus-jira109`

**Assignee:** Christopher Martus

**Jira Key:** SCRUM-109

**Summary:** Render the income table from live data

**Description:** As a Frontend Developer, I want the income table rendered from the hook
data, so that recorded income events and their amounts are visible.

**Acceptance Criteria:**

- The table renders date, source, type, amount, and withholding columns from the hook data.
- Per-source KPI cards (W-2, 1099, Capital Gains, Rental, Other) render above the table.
- A newly added income event appears in the table after a successful create.

**Code Connection:**

- `IncomePage` now renders its typed `incomeEvents` input as table rows with readable
  income-type labels, UTC-safe display dates, and USD-formatted amount and withholding
  values. The empty state only renders when that collection is empty.
- The five existing KPI cards now aggregate event amounts by W-2, 1099, Capital Gains,
  Rental, and Other, including zero-dollar values for categories without events.
- A compact component-flow test supplies the same prop contract that the SCRUM-106 hook
  will use. It verifies table and KPI rendering, then exercises a successful form callback
  and confirms the updated collection renders the new row and KPI value.
- The live read query is connected, but production create persistence and cache invalidation
  remain blocked until a create endpoint is available. The route therefore retains a
  placeholder create handler and does not claim end-to-end persistence coverage.

**Project Scope Connection:**

This supplies the minimal presentation and aggregation behavior required for recorded
income events while preserving the typed composition seam for the tenant-scoped income
query. The remaining hook integration will make this presentation contract live without
rewriting the table or KPI logic.

**Changed Files:**

- `src/pulseUI/pages/income/IncomePage.tsx`
- `src/pulseUI/pages/income/IncomePage.module.css`
- `src/pulseUI/tests/income/IncomePage.test.tsx`
- `planning/team/cm-ticket-journal.md`

**Validation Notes:**

- `npm --prefix src/pulseUI run typecheck` passed.
- The focused Income page tests passed: 5 tests, including a presentation-level successful
  create callback that rerenders the new table row and its 1099 KPI total.
- Full Pulse UI coverage passed: 146 tests in 34 files.
- `npm --prefix src/pulseUI run build` passed; Vite reported its existing large-chunk
  advisory warning.
- `git diff --check` passed.


## chirstopher-martus-jira110 - SCRUM-110

**Branch:** `chirstopher-martus-jira110`

**Assignee:** Christopher Martus

**Jira Key:** SCRUM-110

**Summary:** Add accessibility and a component test for the Income screen

**Description:** As a Frontend Developer, I want the Income screen to pass an axe check
and a component test, so that it is accessible and regression-guarded.


**Acceptance Criteria:**

- An axe accessibility check on the rendered screen reports no violations.
- A component test asserts the table renders rows and the empty state for no data.
- The form's inputs carry accessible labels and the test asserts a validation error is
  announced.

**Code Connection:**

- `ToolHeader` accepts an optional heading ID, allowing both Income page states to connect
  their `aria-labelledby` attribute to the visible Income Events heading.
- The shared accessibility gate renders a populated `IncomeScreen`, confirms its named
  table is present, runs axe against the rendered DOM, and requires zero violations.
- Existing Income page component coverage verifies populated table rows and the no-data
  empty state without duplicating those scenarios.
- The Income form component test locates all four controls by accessible name and verifies
  that an invalid Source input is marked invalid, described by its error, and announced
  through an alert role.

**Project Scope Connection:**

This adds the minimal accessibility and regression coverage required for the Income tool.
It does not change income data fetching, tenant-scoped access, creation persistence, or
workflow behavior.

**Changed Files:**

- `src/pulseUI/components/ToolHeader.tsx`
- `src/pulseUI/pages/income/IncomePage.tsx`
- `src/pulseUI/tests/accessibility/axeGate.test.tsx`
- `src/pulseUI/tests/components/IncomeEntryForm.test.tsx`
- `planning/team/cm-ticket-journal.md`

**Validation Notes:**

- `npm --prefix src/pulseUI run typecheck` passed.
- Focused Income coverage passed: 8 tests across the Income page and entry form suites.
- The accessibility gate passed: 4 tests, including zero axe violations for the rendered
  Income screen. JSDOM continues to emit its existing canvas/color-contrast warning.
- Full Pulse UI coverage passed: 150 tests in 34 files.
- `git diff --check` passed.
- `npm --prefix src/pulseUI run build` transformed all 2,108 modules but could not replace
  the existing `dist/pulseUI/assets` directory because Windows returned `EPERM`; no source
  compilation error was reported.


## christopher-martus-jira134 - SCRUM-134

**Branch:** `christopher-martus-jira134`

**Assignee:** Christopher Martus

**Jira Key:** SCRUM-134

**Summary:** Relay outbox rows with retry

**Description:** As a Backend Developer, I want a relay that publishes outbox rows and
retries on failure, so that committed events are reliably delivered.

**Acceptance Criteria:**

- A relay publishes unsent outbox rows and marks them sent.
- A transient publish failure is retried with backoff.
- A test asserts a row is marked sent only after a successful publish.

**Code Connection:**

- Adds the nullable `outbox_event.sent_at` delivery marker. The relay will select rows
  without this value and set it only after a successful publisher call.
- `createOutboxRelay` reads unsent rows in creation order, publishes the serialized
  CloudEvent payload, and records `sent_at` only after publication succeeds.
- `createSnsOutboxEventPublisher` sends that stored payload to the configured SNS topic
  without rebuilding the event.
- The relay retries transient publisher failures up to three total attempts, using 100 ms,
  then 200 ms exponential backoff by default. Retry count and timing are injectable for
  deterministic tests.
- A focused relay test simulates one transient publisher failure and verifies the row remains
  unsent until the second publish attempt succeeds.

**Project Scope Connection:**

This provides the minimal relay path and transient-failure retry behavior for reliable
delivery of the transactional outbox introduced in SCRUM-133, without introducing a worker
runtime, scheduler, retries for database writes, or SCRUM-135 dead-letter behavior.

**Changed Files:**

- `src/typescript/shared/database/schema.ts`
- `src/typescript/shared/database/drizzle-migrations/0013_low_callisto.sql`
- `src/typescript/shared/database/drizzle-migrations/meta/0013_snapshot.json`
- `src/typescript/shared/database/drizzle-migrations/meta/_journal.json`
- `src/typescript/features/taxPlanCycle/infrastructure/outboxRelay.ts`
- `src/typescript/features/taxPlanCycle/index.ts`
- `src/typescript/index.ts`
- `tests/typescript/features/taxPlanCycle/outboxRelay.test.ts`
- `planning/team/cm-ticket-journal.md`

**Validation Notes:**

- `npm run typecheck` passed after the schema and migration change.
- `npm run typecheck` passed after adding relay behavior and its test seam.
- `npx vitest run --config vitest.config.ts tests/typescript/features/taxPlanCycle/outboxRelay.test.ts`
  passed: 1 test verifies retry backoff and marks the row sent only after success.
- `git diff --check` passed.
