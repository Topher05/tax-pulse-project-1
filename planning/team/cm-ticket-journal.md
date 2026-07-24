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
- `python -m ruff format --check src/python tests/python` passed.
- `npm run typecheck` passed.
- `python -m pyright --pythonpath "$(python -c 'import sys; print(sys.executable)')`
  reports only existing unresolved optional imports for `boto3` and
  `testcontainers.localstack`; no scenario-comparison findings remain.

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
