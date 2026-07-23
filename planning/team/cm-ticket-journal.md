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
  table contract. The migration and repository enforcement follow in later slices.

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
- `planning/team/cm-ticket-journal.md`

**Validation Notes:**

- `npm run typecheck` passed.
- `npx vitest run tests/typescript/scenario.test.ts` passed (2 tests).
- `npm run db:check` passed.
- `npx vitest run tests/typescript/scenarioMigration.test.ts` is blocked because this
  environment has no working container runtime for Testcontainers.

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
