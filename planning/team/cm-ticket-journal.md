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

**Project Scope Connection:**

This establishes the deterministic progressive-tax primitive for the Domain Compute
service. The public calculation response and rate outputs will be added in subsequent
SCRUM-81 slices.

**Changed Files:**

- `src/python/tax_pulse_project_team_1/tax_calculation.py`
- `tests/python/test_tax_brackets.py`
- `tests/python/test_tax_bracket_schedules.py`
- `planning/team/cm-ticket-journal.md`

**Validation Notes:**

- Isolated calculation assertions for multi-bracket, boundary, and zero-income cases
  passed via direct module execution.
- `python -m ruff format --check src/python/tax_pulse_project_team_1/tax_calculation.py
  tests/python/test_tax_brackets.py` passed.
- `python -m pyright src/python/tax_pulse_project_team_1/tax_calculation.py` passed.
- Isolated schedule lookup assertions for all supported filing statuses and California
  bounds passed via direct module execution.
- Pytest collection is currently blocked before tests run because the local Python
  environment is missing the project dependency `boto3`.

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
