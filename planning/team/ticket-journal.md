# Shared Team Ticket Journal

This journal records Jira-ticket implementation work from `planning/stackpulse_tax.csv`
and ties each ticket back to the code, tests, and validation evidence produced for it.

## martins-okorie-jira43 - SCRUM-43

**Branch:** `martins-okorie-jira43`

**Owner:** Chimaobi Martins Okorie

**Epic:** SCRUM-13 - Domain Model & Walking Skeleton

**Summary:** Create the `stage_transition` table

**CSV Description:** As a Backend Developer, I want a `stage_transition` table, so that
every stage change on a Tax Plan Cycle is recorded.

**Acceptance Criteria:**

- A migration creates `stage_transition` with `case_id` FK, `from_stage`, `to_stage`,
  `actor`, and `occurred_at`.
- A foreign key ties each transition to its `tax_plan_cycle`.
- An index on `case_id` supports reading a case's transition history.

**How This Ties Into the Code:**

- `migrations/20260626120000_create_tax_plan_cycle.sql` now creates the
  `stage_transition` table after `tax_plan_cycle`.
- `stage_transition.case_id` references `tax_plan_cycle.client_id`, matching the current
  Tax Plan Cycle primary key.
- `from_stage` and `to_stage` use check constraints with the same seven canonical
  workflow stages as `tax_plan_cycle.stage`.
- `stage_transition_case_id_idx` supports reading transition history by case.
- `tests/typescript/taxPlanCycleMigration.test.ts` verifies the table shape, FK, stage
  checks, index, valid transition insert/read, missing-case rejection, and invalid-stage
  rejection.
- `vitest.config.ts` no longer excludes the migration test, so `npm run test:migration`
  reaches the intended test file.

**Changed Files:**

- `migrations/20260626120000_create_tax_plan_cycle.sql`
- `tests/typescript/taxPlanCycleMigration.test.ts`
- `vitest.config.ts`

**Validation Notes:**

- `npm run typecheck` passed.
- `npm run test:migration` now starts and reaches
  `tests/typescript/taxPlanCycleMigration.test.ts`, but this local environment needs
  `DATABASE_URL` set before the PostgreSQL migration test can execute.
