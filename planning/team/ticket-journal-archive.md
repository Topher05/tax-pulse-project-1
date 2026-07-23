# Archived Shared Team Ticket Journal

> **Deprecated:** This file is retained as the read-only historical record of ticket
> work completed before the per-developer journal migration. Record new work in the
> appropriate journal listed in [`README.md`](README.md).

This journal records Jira-ticket implementation work from `planning/stackpulse_tax.csv`
and ties each ticket back to the code, tests, and validation evidence produced for it.

## dylan-harle-jira76 - SCRUM-76

**Branch:** `dylan-harle-jira76`

**Owner:** Dylan Harle

**Jira Key:** SCRUM-76

**Epic:** SCRUM-15 - Polyglot Backend & Contracts

**Summary:** Store idempotency keys for case creation

**Description:** As a Backend Developer, I want an idempotency-key store, so that a
retried create returns the original result.

**Acceptance Criteria:**

- An idempotency record keyed by Idempotency-Key persists the first result.
- A repeat request with the same key returns the stored original result.
- Distinct keys create distinct cycles.

**Code Connection:**

- `POST /tax-plan-cycles` requires a trimmed, non-empty `Idempotency-Key` header and passes
  it through the create controller.
- `createTaxPlanCycleRepository` stores the successful first create result in
  `tax_plan_cycle_idempotency_key`, scoped by tenant and idempotency key.
- Repeated creates with the same tenant/key return the stored original `case_id`; distinct
  keys continue to create distinct Tax Plan Cycles with their own transition and audit rows.
- The OpenAPI document now advertises the required `Idempotency-Key` header on the create
  operation.
- ADR-0010 records the decision to store tenant-scoped case creation idempotency records in
  the Core Case Service PostgreSQL store.

**Project Scope Connection:**

Idempotent case creation builds directly on SCRUM-53's persistent Intake create path while
preserving tenant isolation, the stage-based workflow model, and the existing immutable
audit/transition side effects. This ticket establishes the stored result foundation for
SCRUM-77's later concurrent-create guard.

**Changed Files:**

- `planning/team/ticket-journal.md`
- `adr/0010-tenant-scoped-case-creation-idempotency.md`
- `adr/README.md`
- `src/typescript/coreCaseOpenApi.ts`
- `src/typescript/db/drizzle-migrations/0005_store_case_creation_idempotency_keys.sql`
- `src/typescript/db/schema.ts`
- `src/typescript/index.ts`
- `src/typescript/taxPlanCycleCreateController.ts`
- `src/typescript/taxPlanCycleRepository.ts`
- `src/typescript/taxPlanCycleRoutes.ts`
- `tests/typescript/coreCaseOpenApi.test.ts`
- `tests/typescript/taxPlanCycle/taxPlanCycle.integration.ts`
- `tests/typescript/taxPlanCycleRoutes.test.ts`

**Validation Notes:**

- Required-header refactor validation: `npm run typecheck` passed.
- Required-header refactor validation:
  `npx vitest run tests/typescript/taxPlanCycleRoutes.test.ts tests/typescript/coreCaseOpenApi.test.ts tests/typescript/jwtProtectedTaxPlanCycleRoutes.test.ts tests/typescript/mainTaxPlanCycleComposition.test.ts`
  passed with 24 tests.
- Required-header refactor validation:
  `npx vitest run --config vitest.integration.config.ts tests/typescript/taxPlanCycle/taxPlanCycle.integration.ts`
  passed with 16 tests.
- `npm run typecheck` passed.
- `npx vitest run tests/typescript/taxPlanCycleRoutes.test.ts tests/typescript/coreCaseOpenApi.test.ts`
  passed with 17 tests.
- `npx vitest run --config vitest.integration.config.ts tests/typescript/taxPlanCycle/taxPlanCycle.integration.ts`
  passed with 16 tests, including same-key replay and distinct-key create coverage.
- `npm test` passed typechecking and reported 133 passing tests; it ended with the known
  `tests/typescript/tenantsMigration.test.ts` PostgreSQL 17 `uuidv7()` failure that is
  outside this ticket.
- Initial Node validation commands failed inside the default Windows sandbox with
  `EPERM: operation not permitted, lstat 'C:\Users\Drybones'`; the same commands ran with
  approved elevated filesystem access.

## dylan-harle-jira77 - SCRUM-77

**Branch:** `dylan-harle-jira77`

**Owner:** Dylan Harle

**Jira Key:** SCRUM-77

**Epic:** SCRUM-15 - Polyglot Backend & Contracts

**Summary:** Guard concurrent creates with the idempotency key

**Description:** As a Backend Developer, I want concurrent creates with the same key to
produce one cycle, so that retries under load never duplicate cases.

**Acceptance Criteria:**

- Two concurrent requests with the same Idempotency-Key create exactly one cycle.
- The second request waits for or reads the first result rather than inserting again.
- A concurrency test asserts a single cycle is created.

**Code Connection:**

- `createTaxPlanCycleRepository.create` still requires the SCRUM-76 `idempotencyKey` input.
- Required-key creates now run in a transaction that acquires a PostgreSQL advisory lock
  scoped to the tenant ID and idempotency key before reading or writing the idempotency row.
- The first same-key transaction inserts the Intake cycle, initial transition, audit entry,
  and idempotency row; later same-key transactions read the stored `case_id` and skip all
  duplicate side effects.
- The repository's internal `insert` helper remains a no-key fixture/seed path and does not
  change public create behavior.
- ADR-0010 now documents the advisory-lock concurrency decision.

**Project Scope Connection:**

This completes the retry-safety path established by SCRUM-76 while preserving tenant
isolation, the stage-based workflow model, and immutable transition/audit side effects.
The lock key is tenant-scoped so firms cannot observe or block each other's idempotency
keys.

**Changed Files:**

- `planning/team/ticket-journal.md`
- `adr/0010-tenant-scoped-case-creation-idempotency.md`
- `src/typescript/taxPlanCycleRepository.ts`
- `tests/typescript/taxPlanCycle/taxPlanCycle.integration.ts`

**Validation Notes:**

- Initial Node validation commands failed inside the default Windows sandbox with
  `EPERM: operation not permitted, lstat 'C:\Users\Drybones'`; the same commands ran with
  approved elevated filesystem access.
- Merge-conflict validation: `npm run typecheck` passed.
- Merge-conflict validation:
  `npx vitest run tests/typescript/taxPlanCycleRoutes.test.ts tests/typescript/coreCaseOpenApi.test.ts tests/typescript/jwtProtectedTaxPlanCycleRoutes.test.ts tests/typescript/mainTaxPlanCycleComposition.test.ts`
  passed with 31 tests.
- Merge-conflict validation:
  `npx vitest run --config vitest.integration.config.ts tests/typescript/taxPlanCycle/taxPlanCycle.integration.ts`
  passed with 22 tests, including the concurrent same-key create coverage.
- Merge-conflict validation: `npm run test` passed typechecking and 142 tests, then
  `tests/typescript/tenantsMigration.test.ts` timed out under full-suite load; rerunning
  `npx vitest run tests/typescript/tenantsMigration.test.ts` passed.
- `npx vitest run --config vitest.integration.config.ts tests/typescript/taxPlanCycle/taxPlanCycle.integration.ts`
  passed with 17 tests, including the concurrent same-key create coverage.

## dylan-harle-jira73 - SCRUM-73

**Branch:** `dylan-harle-jira73`

**Owner:** Chimaobi Martins Okorie

**Jira Key:** SCRUM-73

**Epic:** SCRUM-15 - Polyglot Backend & Contracts

**Summary:** Define the DynamoDB queue projection table

**Description:** As a Backend Developer, I want a DynamoDB table for the Plan Cycle
Queue projection, so that the queue is read from a denormalized store.

**Acceptance Criteria:**

- A DynamoDB table holds a denormalized queue projection keyed by `tenant_id` with
  case sort key.
- Each item carries case ID, client, stage, owner, priority, due_date, and overdue
  flag.
- The table definition is created against a local DynamoDB for tests.

**Code Connection:**

- `PlanCycleQueueProjectionItem` defines the Python/Pydantic queue projection item
  shape with `tenant_id`, `case_id`, `client`, `stage`, `owner`, `priority`,
  `due_date`, and `is_overdue`.
- The Python DynamoDB module defines the table contract
  `taxpulse_plan_cycle_queue_projection`, keyed by `tenant_id` as the partition key
  and `case_id` as the sort key, using pay-per-request billing.
- `create_dynamodb_client` points to `TAXPULSE_DYNAMODB_ENDPOINT_URL` or an injected
  endpoint for LocalStack, and otherwise leaves boto3 on its normal AWS credential
  provider chain for a future real AWS deployment.
- Python tests start LocalStack through Testcontainers, create the table locally, and
  write/query synthetic tenant-scoped projection items without touching paid AWS.
- The LocalStack test fixture defaults to `localstack/localstack:3.8.1` because the
  current `latest` image requires a LocalStack auth token/license; teams with a token
  can override `TAXPULSE_LOCALSTACK_IMAGE` and pass `LOCALSTACK_AUTH_TOKEN`.

**Project Scope Connection:**

TaxPulse Advisory needs a denormalized, tenant-scoped read model for the Plan Cycle
Queue before later projection and caching tickets can move reads away from the
transactional PostgreSQL case table. This ticket establishes the DynamoDB-compatible
table shape in the Python side of the polyglot backend while keeping all validation
against LocalStack rather than paid AWS.

**Changed Files:**

- `adr/0010-python-dynamodb-queue-projection-localstack.md`
- `adr/README.md`
- `pyproject.toml`
- `planning/team/ticket-journal.md`
- `src/python/tax_pulse_project_team_1/__init__.py`
- `src/python/tax_pulse_project_team_1/dynamodb/__init__.py`
- `src/python/tax_pulse_project_team_1/dynamodb/plan_cycle_queue_projection.py`
- `tests/python/test_plan_cycle_queue_projection.py`

**Validation Notes:**

- `python -m ruff format --check src/python tests/python` passed.
- `python -m ruff check src/python tests/python` passed.
- `python -m pyright --pythonpath "$(python -c 'import sys; print(sys.executable)')"`
  passed.
- `python -m pytest tests/python/test_plan_cycle_queue_projection.py` passed with 6
  tests using Docker/Testcontainers LocalStack access.
- `python -m pytest` passed with 11 tests.

## caleb-latimer-jira67 - SCRUM-67

**Branch:** `caleb-latimer-jira67`

**Owner:** Caleb Latimer

**Summary:** Wire the role-gated transition endpoint enforcing the permission matrix

**CSV Description:** As a Security Engineer, I want the stage-transition validator
exposed as a role-gated endpoint, so that only authorized roles advance a Tax Plan
Cycle and denials are audited.

**Acceptance Criteria:**

- `PATCH /cycles/{id}/transition` validates the requested move, checks role access, and
  advances the stage only for authorized, legal transitions.
- Unauthorized role attempts return `403` and illegal moves return `422`.
- Successful transitions write the `stage_transition` row in the same transaction.
- Denied attempts emit a console audit stub with `case_id`, `actor`, `action`,
  `outcome`, and `occurred_at`.

**How This Ties Into the Code:**

- `createTaxPlanCycleRouter` now serves `PATCH /cycles/:id/transition`, validates the
  path/body with Zod, loads the current cycle through the existing read path, and
  enforces the role gate before any mutation.
- `taxPlanCycleRepository.transition` updates the cycle stage and inserts the
  `stage_transition` row inside a single transaction, then returns the updated cycle.
- `taxPlanCycleTransitionController` wraps the repository for the new route boundary,
  while the route keeps the current stage-transition validator as the legality check.
- Denied attempts call a console audit stub that emits
  `{ case_id, actor, action, outcome, occurred_at }` until the real `audit_entry`
  writer exists.
- The route returns `403` for unauthorized users and `422` for illegal transitions
  without mutating the cycle.
- Mermaid sequence diagram:

```mermaid
sequenceDiagram
  actor User
  participant API as Express PATCH /cycles/{id}/transition
  participant Auth as Request context / role gate
  participant Val as Stage transition validator
  participant Repo as Drizzle repository
  participant Audit as Console audit stub
  participant DB as PostgreSQL

  User->>API: PATCH transition request
  API->>Auth: resolve tenant, actor, role, permissions
  alt unauthorized role
    Auth-->>API: 403 Forbidden
    API->>Audit: log {case_id, actor, action, outcome, occurred_at}
    API-->>User: 403 Problem Details
  else authorized role
    API->>Val: validate requested transition
    alt illegal move
      Val-->>API: 422 Unprocessable Entity
      API->>Audit: log {case_id, actor, action, outcome, occurred_at}
      API-->>User: 422 Problem Details
    else legal move
      Val-->>API: allowed
      API->>Repo: update stage + insert stage_transition in one txn
      Repo->>DB: commit
      API-->>User: success response with updated cycle
    end
  end
```
TaxPulse Advisory depends on stage-gated workflow changes and immutable audit history
for compliance. This ticket adds the secure API boundary for advancing a Tax Plan
Cycle while preserving tenant isolation, role gating, and the stage-based workflow
model.

**Changed Files:**

- `src/typescript/index.ts`
- `src/typescript/taxPlanCycle.ts`
- `src/typescript/taxPlanCycleRepository.ts`
- `src/typescript/taxPlanCycleRoutes.ts`
- `src/typescript/taxPlanCycleTransitionController.ts`
- `tests/typescript/taxPlanCycle/taxPlanCycle.integration.ts`
- `tests/typescript/taxPlanCycleRoutes.test.ts`
- `planning/prompt-journal/cl-journal.md`
- `planning/team/ticket-journal.md`

**Validation Notes:**

- `npm run typecheck` passed.
- `npm test` passed the new route coverage, but the full Vitest run still timed out in
  pre-existing `role` and `user` tests at the 5 second test limit.
- The targeted integration rerun could not complete in this shell because the local
  Node launcher hit the existing Windows `EPERM` path-resolution issue, and the
  escalated rerun was declined.
- `npm run typecheck`
- `npm test`
- `npm run test:migration`

## christopher-martus-jira64 - SCRUM-64

**Branch:** `christopher-martus-jira64`

**Owner:** Christopher Martus

**Jira Key:** SCRUM-64

**Summary:** Validate shared JWTs in a FastAPI dependency

**Description:** Add a FastAPI dependency that validates the HS256 access JWTs issued
by the Node service so the Tax Calculation Engine trusts the same identity scheme.

**Acceptance Criteria:**

- The dependency validates JWT signature, expiry, and issuer using the shared key.
- Expired or tampered tokens return 401.
- Valid tokens expose role and tenant_id to downstream handlers.

**Code Connection:**

- `JwtValidationConfig.from_environment` reads the shared `JWT_ISSUER` and
  `JWT_SIGNING_SECRET` values without an import-time environment dependency and enforces
  the Node service's minimum 32-byte secret requirement.
- `create_jwt_authentication_dependency` uses FastAPI's bearer security dependency and
  PyJWT to accept only HS256 JWTs, validate issuer and expiry, and return the typed
  `AuthenticatedPrincipal` containing verified role and tenant_id claims.
- Authentication failures, including missing credentials, invalid signatures, expired
  tokens, wrong issuers, and invalid downstream claims, use one 401 response with the
  `WWW-Authenticate: Bearer` header.
- SCRUM-84 remains responsible for attaching this reusable dependency to the Tax
  Calculation endpoint; no calculation route is added here.

**Project Scope Connection:**

TaxPulse Advisory needs a shared identity boundary across the Node Core Case Service and
the Python Tax Calculation Engine. This ticket provides that focused FastAPI boundary
while preserving tenant isolation and leaving calculation endpoint composition to the
later API ticket.

**Changed Files:**

- `pyproject.toml`
- `src/python/tax_pulse_project_team_1/jwt_authentication.py`
- `tests/python/test_jwt_authentication.py`
- `planning/team/ticket-journal.md`

**Validation Notes:**

- `python -m ruff format --check src/python tests/python` passed.
- `python -m ruff check src/python tests/python` passed.
- `python -m pyright --pythonpath "$(python -c 'import sys; print(sys.executable)')"`
  passed with 0 errors.
- `python -m pytest tests/python/test_jwt_authentication.py` passed with 15 tests.
- `python -m pytest` passed with 20 tests. FastAPI's installed TestClient emitted its
  upstream httpx deprecation warning; pytest also could not update the pre-existing
  repository `.pytest_cache` due to local access permissions.


## development - SCRUM-68

**Branch:** `development`

**Owner:** Dylan Harle

**Jira Key:** SCRUM-68

**Epic:** SCRUM-14 - Secure APIs - Auth, Audit & Boundaries

**Summary:** Redact income and deduction figures in audit output

**Description:** As a Firm Admin, I want dollar figures redacted in audit output, so
that sensitive amounts are not exposed in the trail.

**Acceptance Criteria:**

- Income and deduction dollar figures are redacted when an audit entry is rendered.
- Redaction is applied at read/serialization time, leaving the stored action intact.
- A test asserts a redacted figure never appears in the audit output.

**Code Connection:**

- `auditEntryOutput` centralizes audit-entry serialization and redacts financial
  amounts from rendered `action` and `outcome` text while preserving actor, case,
  timestamp, stages, dates, counts, and identifiers.
- `createAuditEntryRepository` reads `audit_entry` rows through a tenant-scoped join to
  `tax_plan_cycle` and returns only serialized, redacted audit output.
- `GET /tax-plan-cycles/:caseId/audit-entries` validates the existing tenant-scoped
  cycle before listing audit entries, so missing or cross-tenant cases reuse the
  existing 404 behavior and do not leak audit rows.
- This intentionally does not implement SCRUM-67's transition endpoint, role matrix,
  legal-transition enforcement, or denied-attempt audit writes. Future SCRUM-67 audit
  entries can use the same audit reader.

**Project Scope Connection:**

TaxPulse Advisory needs immutable audit history without exposing sensitive tax amounts
to every rendered trail consumer. This ticket keeps the append-only stored audit row
intact for compliance while applying least-exposure redaction at the API serialization
boundary.

**Changed Files:**

- `planning/team/ticket-journal.md`
- `src/typescript/auditEntryOutput.ts`
- `src/typescript/auditEntryRepository.ts`
- `src/typescript/index.ts`
- `src/typescript/taxPlanCycleRoutes.ts`
- `tests/typescript/auditEntryOutput.test.ts`
- `tests/typescript/jwtProtectedTaxPlanCycleRoutes.test.ts`
- `tests/typescript/taxPlanCycleRoutes.test.ts`
- `tests/typescript/taxPlanCycle/taxPlanCycle.integration.ts`

**Validation Notes:**

- `npm run typecheck` passed.
- `npx vitest run tests/typescript/auditEntryOutput.test.ts tests/typescript/taxPlanCycleRoutes.test.ts tests/typescript/jwtProtectedTaxPlanCycleRoutes.test.ts`
  passed with 14 tests.
- `npx vitest run --config vitest.integration.config.ts tests/typescript/taxPlanCycle/taxPlanCycle.integration.ts`
  passed with 14 tests, including the redacted-output and intact-storage assertion.
- `npm test` ran; typecheck passed and Vitest reported 123 passing tests
- Initial Node validation commands failed inside the default Windows sandbox with
  `EPERM: operation not permitted, lstat 'C:\Users\Drybones'`; the same commands passed
  when rerun with approved elevated filesystem access.

## dylan-harle-jira66 - SCRUM-66

**Branch:** `dylan-harle-jira66`

**Owner:** Dylan Harle

**Epic:** SCRUM-14 - Secure APIs - Auth, Audit & Boundaries

**Summary:** Write an audit entry on every stage transition

**CSV Description:** As a Firm Admin, I want every stage transition written to the
audit trail, so that the Plan Cycle is compliance-defensible.

**Acceptance Criteria:**

- Each successful stage transition writes an append-only audit entry of
  who-did-what-when.
- The audit write commits with the transition in the same transaction.
- A test asserts a transition produces exactly one audit entry.

**How This Ties Into the Code:**

- `createTaxPlanCycleRepository` now writes an `audit_entry` row in the same Drizzle
  transaction that creates the initial `stage_transition` row for a newly created Tax
  Plan Cycle.
- The audit entry reuses the transition's generated case ID, actor, and timestamp, with
  action `stage_transition:Intake->Intake` and outcome `succeeded`.
- The implementation builds on SCRUM-65's append-only `audit_entry` table, SCRUM-43's
  `stage_transition` table, and SCRUM-53's create-cycle transaction path.
- SCRUM-62 through SCRUM-64 are not required for this ticket; actor remains the string
  already supplied through the current route/controller/repository flow.
- This ticket does not add role gates, denied-attempt audit entries, or transition
  endpoint enforcement. Those remain SCRUM-67 territory.

**Project Scope Connection:**

TaxPulse Advisory needs durable, immutable evidence for workflow activity. This ticket
connects the existing transition history write path to the append-only audit trail so
successful case stage movement is recorded as compliance evidence without depending on
later authorization middleware.

**Changed Files:**

- `planning/team/ticket-journal.md`
- `src/typescript/index.ts`
- `src/typescript/taxPlanCycleRepository.ts`
- `tests/typescript/taxPlanCycle/taxPlanCycle.integration.ts`

**Validation Notes:**

- `npm run db:check` passed; no Drizzle schema migration was generated or needed for
  SCRUM-66.
- `npm run typecheck` passed.
- `npx vitest run --config vitest.integration.config.ts tests/typescript/taxPlanCycle/taxPlanCycle.integration.ts`
  passed with 13 tests, including repository/route audit-entry assertions and the
  transition-plus-audit rollback test.
- `npx vitest run tests/typescript/audit/auditEntry.test.ts` passed with 3 tests.
- `npm run test:migration` ran; the audit migration tests passed, and the overall suite
  reported 14 passing tests with 1 existing failure in
  `tests/typescript/tenantsMigration.test.ts` because the configured local PostgreSQL
  database does not provide `uuidv7()`.
- `npm test` ran; typecheck and 98 tests passed, with the same existing
  `tests/typescript/tenantsMigration.test.ts` `uuidv7()` failure.

## dylan-harle-jira65 - SCRUM-65

**Branch:** `dylan-harle-jira65`

**Owner:** Dylan Harle

**Epic:** SCRUM-14 - Secure APIs - Auth, Audit & Boundaries

**Summary:** Create the append-only `audit_entry` table

**CSV Description:** As a Backend Developer, I want an append-only `audit_entry` table,
so that who-did-what-when is recorded immutably per case.

**Acceptance Criteria:**

- A migration creates `audit_entry` with `case_id`, `actor`, `action`, `outcome`,
  and `occurred_at`.
- A database rule or trigger blocks `UPDATE` and `DELETE` on `audit_entry`.
- A test asserts an attempted update fails.

**How This Ties Into the Code:**

- `src/typescript/db/schema.ts` now defines `auditEntry` as a Drizzle table backed by
  `audit_entry`, with `case_id` referencing the generated `tax_plan_cycle.id` case
  identifier established after SCRUM-43/SCRUM-52.
- `src/typescript/db/drizzle-migrations/0004_lively_sugar_man.sql` creates the table,
  per-case read index, foreign key, and an `audit_entry_prevent_mutation` trigger
  function wired by `audit_entry_block_update_delete`.
- `src/typescript/db/seed.ts` includes `audit_entry` in the reset truncation list but
  does not seed audit rows, leaving actual audit writes to later workflow tickets.
- `tests/typescript/audit/auditEntry.test.ts` verifies the table contract, valid
  insert, missing-case FK rejection, and failed `UPDATE`/`DELETE` attempts.
- `adr/0008-append-only-audit-entry.md` records the database-owned append-only audit
  table decision, including the trigger-based immutability boundary and future-ticket
  handoff.
- This ticket does not change JWT issuance, JWT middleware, auth negative paths, or
  FastAPI JWT validation from SCRUM-61 through SCRUM-64. It also does not implement
  stage-transition audit writes from SCRUM-66 or role-gated denied-attempt auditing
  from SCRUM-67.

**Project Scope Connection:**

TaxPulse Advisory requires immutable audit history for case activity. This ticket adds
the database-owned append-only storage foundation for per-case audit evidence while
preserving the current stage-based workflow model and avoiding any dependency on the
separate authentication/JWT chain.

**Changed Files:**

- `package.json`
- `adr/0008-append-only-audit-entry.md`
- `adr/README.md`
- `planning/team/ticket-journal.md`
- `src/typescript/db/drizzle-migrations/0004_lively_sugar_man.sql`
- `src/typescript/db/drizzle-migrations/meta/0004_snapshot.json`
- `src/typescript/db/drizzle-migrations/meta/_journal.json`
- `src/typescript/db/schema.ts`
- `src/typescript/db/seed.ts`
- `tests/typescript/audit/auditEntry.test.ts`

**Validation Notes:**

- `npm run db:gen` could not run in the default sandbox because Node could not resolve
  its install directory due to `EPERM: operation not permitted, lstat
  'C:\Users\Drybones'`; the migration and metadata were added manually in the active
  Drizzle migration path.
- After SCRUM-61 introduced `refresh_token` as Drizzle migrations `0002` and `0003`,
  `npm run db:gen` was rerun with elevated local filesystem access and regenerated the
  audit table as forward migration `0004_lively_sugar_man`.
- `npm run typecheck` passed with elevated local filesystem access after the same Node
  sandbox permission issue.
- `npm run db:check` passed with elevated local filesystem access.
- `npm run test:migration` ran with elevated local filesystem access; the new
  `tests/typescript/audit/auditEntry.test.ts` passed all 3 tests, and the overall
  suite reported 14 passing tests with 1 existing failure in
  `tests/typescript/tenantsMigration.test.ts` because the configured local PostgreSQL
  database does not provide `uuidv7()`.

## dylan-harle-jira59 - SCRUM-59

**Branch:** `dylan-harle-jira59`


**Owner:** Dylan Harle

**Epic:** SCRUM-14 - Secure APIs - Auth, Audit & Boundaries

**Summary:** Enroll a user in TOTP MFA

**CSV Description:** As a Security Engineer, I want users to enroll a TOTP second
factor, so that login requires more than a password.

**Acceptance Criteria:**

- An enroll endpoint generates a TOTP secret and returns a provisioning URI.
- Enrollment is confirmed by submitting a valid current code before the factor is
  activated.
- The secret is stored in `mfa_enrollment` and the user is marked enrolled.

**How This Ties Into the Code:**

- `mfaEnrollment.ts` defines the enrollment and confirmation schemas, TOTP provider
  boundary, controller behavior, and Problem Details errors for pending enrollment,
  already-enrolled users, invalid codes, and tenant/user mismatches.
- `createDefaultMfaTotpProvider` uses `otplib` to generate a base32 TOTP secret,
  produce an `otpauth://totp/` provisioning URI, and verify submitted current codes.
- `mfaEnrollmentRepository.ts` persists enrollment state through Drizzle against the
  existing `mfa_enrollment` table and verifies tenant isolation through the `users`
  table before any enrollment state is read or written.
- `createMfaEnrollmentRouter` exposes `POST /mfa/enroll` and
  `POST /mfa/enroll/confirm`. The routes accept the `tenant_id` and `user_id`
  returned by the SCRUM-58 `/auth/login` MFA challenge response, while preserving
  `req.tenant` and `req.user` fallback support for future auth middleware.
- `index.ts` wires the MFA router to a database-backed `MfaEnrollmentRepository` when
  `DATABASE_URL` is configured and uses a clearly synthetic local mock repository when
  the database is unavailable, matching the SCRUM-58 local auth fallback.
- `coreCaseOpenApi.ts` documents the MFA enrollment endpoints and shows the login
  challenge identifiers flowing into enrollment and confirmation.
- The implementation does not add a new `users` column or a tenant column on
  `mfa_enrollment`; `mfa_enrollment.isEnrolled` remains the enrollment marker.
- SCRUM-60 still owns the final MFA challenge verification at login and token issuance.

**Project Scope Connection:**

TaxPulse Advisory requires more than a password before authentication completes. This
ticket creates the TOTP enrollment path that stores each user's second factor separately
from profile and password credential data, keeps enrollment tenant-scoped through the
user record, and prepares the login flow for SCRUM-60 without issuing tokens early.

**Changed Files:**

- `package-lock.json`
- `package.json`
- `planning/team/ticket-journal.md`
- `src/typescript/coreCaseOpenApi.ts`
- `src/typescript/index.ts`
- `src/typescript/mfaEnrollment.ts`
- `src/typescript/mfaEnrollmentRepository.ts`
- `src/typescript/mfaEnrollmentRoutes.ts`
- `tests/typescript/coreCaseOpenApi.test.ts`
- `tests/typescript/mfaEnrollment.test.ts`
- `tests/typescript/mfaEnrollmentRoutes.test.ts`

**Validation Notes:**

- `npm install` completed after merging SCRUM-57/58 dependencies so local
  `node_modules` included `argon2` and `otplib`.
- `npm run typecheck` passed.
- `npx vitest run tests/typescript/auth/auth.test.ts tests/typescript/mfaEnrollment.test.ts tests/typescript/mfaEnrollmentRoutes.test.ts tests/typescript/coreCaseOpenApi.test.ts`
  passed with 4 files and 27 tests.
- `npx vitest run --config vitest.integration.config.ts tests/typescript/auth/auth.integration.ts`
  passed with 1 file and 3 tests.
- `npm test` passed typecheck and 77 tests, then failed 1 existing PostgreSQL-backed
  tenant migration test because this local database does not provide `uuidv7()`.
- `npm install` reported existing npm audit findings; no broad dependency remediation
  was performed as part of this ticket.

## dylan-harle-jira60 - SCRUM-60

**Branch:** `dylan-harle-jira60`

**Owner:** Dylan Harle

**Epic:** SCRUM-14 - Secure APIs - Auth, Audit & Boundaries

**Summary:** Challenge and verify the MFA code at login

**CSV Description:** As a Security Engineer, I want login to require a valid TOTP
code, so that a stolen password alone cannot authenticate.

**Acceptance Criteria:**

- After password verification, login requires a second-factor code.
- An invalid or expired code returns 401 and does not issue a token.
- A valid code proceeds to JWT issuance.

**How This Ties Into the Code:**

- `authMfaLogin.ts` adds the second login step for the existing SCRUM-58 password
  flow, consuming `tenant_id`, `user_id`, and a six-digit TOTP code.
- The controller reuses the SCRUM-59 `MfaEnrollmentRepository` and TOTP provider to
  require a tenant-scoped enrolled factor before issuing any token.
- `createHmacJwtIssuer` issues a real HS256 access JWT with `sub`, `tenant_id`,
  `iss`, `iat`, and `exp` claims using `TAXPULSE_JWT_SECRET`,
  `TAXPULSE_JWT_ISSUER`, and `TAXPULSE_ACCESS_TOKEN_TTL_SECONDS`.
- `authMfaLoginRoutes.ts` exposes `POST /auth/login/mfa`, returning one generic
  401 Problem Details response for unknown challenge identifiers, missing or
  unenrolled MFA, and invalid or expired TOTP codes.
- `coreCaseOpenApi.ts` documents the MFA login verification request, bearer token
  response, and validation/authentication failure cases.

**Project Scope Connection:**

TaxPulse Advisory requires password authentication to be insufficient on its own.
This ticket completes the password-to-MFA login path by requiring an enrolled TOTP
factor before access JWT issuance while leaving refresh-token persistence and broader
JWT middleware to SCRUM-61.

**Changed Files:**

- `planning/team/ticket-journal.md`
- `src/typescript/authMfaLogin.ts`
- `src/typescript/authMfaLoginRoutes.ts`
- `src/typescript/coreCaseOpenApi.ts`
- `src/typescript/index.ts`
- `tests/typescript/authMfaLogin.test.ts`
- `tests/typescript/authMfaLoginRoutes.test.ts`
- `tests/typescript/coreCaseOpenApi.test.ts`

**Validation Notes:**

- `npm run typecheck` passed.
- `npx vitest run tests/typescript/auth/auth.test.ts tests/typescript/authMfaLogin.test.ts tests/typescript/authMfaLoginRoutes.test.ts tests/typescript/mfaEnrollment.test.ts tests/typescript/mfaEnrollmentRoutes.test.ts tests/typescript/coreCaseOpenApi.test.ts`
  passed with 6 files and 35 tests.
- `npm test` passed typecheck and 85 tests, then failed 1 existing PostgreSQL-backed
  tenant migration test because this local database does not provide `uuidv7()`.


## christopher-martus-jira61 - SCRUM-61

**Branch:** `christopher-martus-jira61`

**Owner:** Christopher Martus

**Jira Key:** SCRUM-61

**Summary:** Issue access and refresh JWTs with role and tenant claims

**Description:** Issue post-authentication access tokens carrying verified identity claims
and opaque refresh tokens whose SHA-256 hashes are persisted for later revocation.

**Acceptance Criteria:**

- Access JWTs include `sub`, `role`, `tenant_id`, `iss`, `iat`, and `exp`.
- Refresh-token state is persisted without retaining the bearer token value.
- Persisted refresh tokens can be revoked with `revoked_at` recorded.

**Code Connection:**

- `tokenService` accepts only an `AuthenticatedPrincipal`, signs HS256 access JWTs, and
  generates 256-bit opaque refresh tokens.
- `refreshTokenRepository` persists SHA-256 hashes and conditionally records revocation.
- JWT configuration requires one shared issuer and a minimum 32-byte signing secret.
- The SCRUM-60 MFA controller invokes `tokenService.issue({ userId, role, tenantId })`
  after valid TOTP verification using the server-trusted principal loaded from PostgreSQL.
- The trusted MFA lookup joins `user_status` and admits only active users, so disabled
  and invited accounts cannot receive access or refresh tokens.

**Project Scope Connection:**

This establishes a shared identity-token contract for the Node service and future FastAPI
validation while retaining refresh-token revocation state in PostgreSQL and preserving
tenant and role claims from the trusted authentication boundary.

**Changed Files:**

- `src/typescript/authConfig.ts`
- `src/typescript/authMfaLogin.ts`
- `src/typescript/authTypes.ts`
- `src/typescript/coreCaseOpenApi.ts`
- `src/typescript/index.ts`
- `src/typescript/mfaEnrollment.ts`
- `src/typescript/mfaEnrollmentRepository.ts`
- `src/typescript/refreshTokenRepository.ts`
- `src/typescript/tokenService.ts`
- `tests/typescript/authConfig.test.ts`
- `tests/typescript/authMfaLogin.integration.ts`
- `tests/typescript/authMfaLogin.test.ts`
- `tests/typescript/authMfaLoginRoutes.test.ts`
- `tests/typescript/coreCaseOpenApi.test.ts`
- `tests/typescript/mfaEnrollment.test.ts`
- `tests/typescript/mfaEnrollmentRoutes.test.ts`
- `tests/typescript/tokenService.test.ts`
- `tests/typescript/refreshToken.integration.ts`

**Validation Notes:**

- `npm run typecheck` passed.
- `npx vitest run tests/typescript/authConfig.test.ts tests/typescript/tokenService.test.ts`
  passed: 2 files, 11 tests.
- `npm run db:check` passed.
- `npm run test:integration -- tests/typescript/authMfaLogin.integration.ts` passed with
  Docker/Testcontainers access: 1 file, 1 test.
- `npm test` passed 95 of 96 tests with Docker access; the remaining existing
  `tenantsMigration` test fails because legacy migration SQL references `public.roles`
  while the test uses an isolated schema.

## martins-okorie-jira58 - SCRUM-58

**Branch:** `martins-okorie-jira58`

**Owner:** Chimaobi Martins Okorie

**Epic:** SCRUM-14 - Secure APIs — Auth, Audit & Boundaries

**Summary:** Verify password on login

**CSV Description:** As a Security Engineer, I want login to verify the password
against the argon2id hash, so that only valid credentials proceed to the second factor.

**Acceptance Criteria:**

- Login verifies the submitted password against the stored hash.
- A wrong password returns 401 without revealing whether the email exists.
- A correct password advances to the MFA challenge rather than issuing a token directly.

**How This Ties Into the Code:**

- `verifyPasswordHash` wraps Argon2id verification and returns `false` for malformed
  stored values.
- `authModel.ts` holds the password credential and authentication result contracts,
  while `authService.ts` checks submitted login passwords against stored credential
  hashes and returns either `invalid_credentials` or `mfa_challenge_required`.
- `authCredentials.ts` now focuses on Drizzle-backed credential persistence and lookup.
- `createAuthRouter` exposes `POST /auth/login`, validates the submitted `tenant_id`,
  `email`, and `password`, and maps `invalid_credentials` to a shared 401 Problem
  Details response.
- Wrong passwords and unknown emails receive the same 401 response body so the route
  does not disclose whether the email exists.
- Successful password verification returns a 202 MFA challenge payload with no token
  field, leaving token issuance to the later MFA verification step.
- `index.ts` is configured to register the `createAuthRouter` and automatically switch between live database verification and a mock authenticator fallback for local development if the database is unreachable.

**Project Scope Connection:**

TaxPulse Advisory requires password login to be only the first step of authentication.
This route preserves the tenant-scoped auth boundary, avoids account enumeration through
login errors, and advances valid passwords into the MFA flow before any token is issued.

**Changed Files:**

- `README.md`
- `adr/0007-argon2id-password-login.md`
- `adr/README.md`
- `planning/team/ticket-journal.md`
- `src/typescript/authCredentials.ts`
- `src/typescript/authModel.ts`
- `src/typescript/authRoutes.ts`
- `src/typescript/authService.ts`
- `src/typescript/index.ts`
- `tests/typescript/auth/auth.integration.ts`
- `tests/typescript/auth/auth.test.model.ts`
- `tests/typescript/auth/auth.test.ts`

**Validation Notes:**

- `npm run typecheck` passed.
- `npx vitest run tests/typescript/auth/auth.test.ts` passed with 7 unit tests.
- `npx vitest run --config vitest.integration.config.ts tests/typescript/auth/auth.integration.ts`
  passed with 3 route integration tests after granting localhost socket access for the
  ephemeral Express test server.
- `npm test` was run with elevated local socket access; all non-containerized tests
  passed, and the remaining 10 failures were existing Testcontainers-backed table
  contract tests unable to find a working Docker container runtime strategy.
- Wired `createAuthRouter` inside the server's startup script `index.ts`.
- Started development server with `npm run dev` and verified the `/auth/login` endpoint using `curl` and Postman collections, successfully generating a 202 Accepted response for valid mock credentials and a 401 Unauthorized Problem Details response for invalid passwords.

## martins-okorie-jira57 - SCRUM-57

**Branch:** `martins-okorie-jira57`

**Owner:** Chimaobi Martins Okorie

**Epic:** SCRUM-14 - Secure APIs — Auth, Audit & Boundaries

**Summary:** Hash and store passwords with argon2id

**CSV Description:** As a Security Engineer, I want passwords hashed with argon2id on
registration, so that no credential is ever stored in plaintext.

**Acceptance Criteria:**

- Registration hashes the password with argon2id and stores only the hash in the
  credential table.
- The work-factor parameters are configurable and documented.
- A test asserts the stored value is a valid argon2id hash, not the plaintext.

**How This Ties Into the Code:**

- `passwordHashing.ts` provides `hashPassword` to produce encoded Argon2id hashes with
  configurable work-factor parameters, and `verifyPasswordHash` to validate submitted
  passwords against stored hashes (returning `false` for malformed values instead of
  leaking parser errors).
- `authModel.ts` defines the credential and authentication result contracts:
  `PasswordCredentialRegistrationInput`, `StoredPasswordCredential`,
  `PasswordCredentialWriter`, `PasswordCredentialReader`,
  `PasswordCredentialLoginInput`, and the `PasswordAuthenticationResult` union
  (`invalid_credentials` | `mfa_challenge_required`).
- `authService.ts` implements `registerPasswordCredential`, which hashes the submitted
  password via `hashPassword` and delegates persistence to a `PasswordCredentialWriter`,
  and `authenticatePasswordForMfaChallenge`, which verifies login passwords and returns
  `mfa_challenge_required` for valid credentials without minting a token directly.
- `authCredentials.ts` contains `createPasswordCredentialStore`, the concrete Drizzle
  adapter for the `credential` table; its insert row contains `id`, `userId`, and
  `passwordHash`, never the submitted plaintext password. It also re-exports the
  contracts from `authModel.ts` and the service functions from `authService.ts` for
  backward compatibility.
- `resolvePasswordHashingConfig` reads the documented `TAXPULSE_ARGON2_*`
  environment overrides and rejects invalid non-positive or non-integer values.
- Salt length is enforced by generating a per-hash random salt before calling Argon2id.
- The hashing and credential APIs are exported from the TypeScript package boundary
  (`index.ts`) for the registration and login flows.

**Project Scope Connection:**

TaxPulse Advisory's multi-tenant authentication boundary must never store plaintext
credentials. This work gives registration and login a single Argon2id credential
contract with documented work-factor controls, keeps the persisted credential scoped to
the user record, and hands successful password authentication to MFA before any token is
issued.

**Changed Files:**

- `README.md`
- `package-lock.json`
- `package.json`
- `planning/team/ticket-journal.md`
- `src/typescript/authCredentials.ts`
- `src/typescript/authModel.ts`
- `src/typescript/authService.ts`
- `src/typescript/index.ts`
- `src/typescript/passwordHashing.ts`
- `tests/typescript/auth/auth.test.model.ts`
- `tests/typescript/auth/auth.test.ts`

**Validation Notes:**

- `git fetch origin development` and `git merge origin/development` completed before the
  SCRUM-57 service changes, so this branch builds on the latest dev work available at
  the time of implementation.
- `npm run typecheck` passed.
- `npx vitest run tests/typescript/auth/auth.test.ts` passed with 7 unit tests covering
  password hashing, credential registration, MFA challenge flow, and invalid credential
  handling.
- `npm run test` passed typecheck and the SCRUM-57 unit tests, then failed in existing
  Testcontainers-backed credential, MFA, role, and user suites because this environment
  could not find a working container runtime strategy.

## christopher-martus-jira54 - SCRUM-54

**Branch:** `christopher-martus-jira54`

**Owner:** Christopher Martus

**Epic:** SCRUM-13 - Domain Model & Walking Skeleton

**Summary:** Wire read-cycle and cover the create-then-read path

**CSV Description:** As an Advisor, I want to read a created Tax Plan Cycle back through
the API, so that I can confirm the end-to-end spine works.

**Acceptance Criteria:**

- GET by case ID returns the persisted cycle including stage and due_date.
- The create-then-read test confirms the persisted cycle can be fetched back.

**How This Ties Into the Code:**

- `createTaxPlanCycleRouter` serves `GET /tax-plan-cycles/:caseId`, validates the path
  parameter, reads `tenantId` from request context, and delegates to the controller.
- `createTaxPlanCycleCreateController` passes reads through to
  `TaxPlanCycleRepository.findByCaseId` with both the request tenant and generated case
  ID.
- Missing rows and cross-tenant rows return the same 404 Problem Details response, so
  the API does not reveal whether another tenant owns the requested case ID.
- Successful reads return the existing `TaxPlanCycle` JSON shape with `id`,
  `client_id`, `stage`, `priority`, `due_date`, `on_hold`, and optional `hold_reason`.
- The PostgreSQL-backed integration test now creates a cycle through the API, reads it
  back through the GET endpoint, and asserts the returned ID, `stage`, `due_date`, and
  absence of a separate `status` field.
- Cross-tenant integration coverage creates a cycle as one synthetic tenant, attempts
  to read the same case ID as a second synthetic tenant, and verifies the API returns
  the same 404 response used for missing cycles rather than a 403 or existence leak.
- Final contract cleanup documents the GET read response in the README, verifies the
  OpenAPI 200 response includes `stage` and `due_date`, and keeps the contract free of
  a separate cycle `status` field.
- The implementation does not add a separate `status`; workflow condition remains the
  persisted cycle `stage`.

**Project Scope Connection:**

TaxPulse Advisory depends on tenant-scoped Tax Plan Cycle reads so each firm can fetch
only its own cases. This API slice wires the Core Case Service read path to the
repository boundary, preserving tenant isolation and returning the stage-based domain
shape used throughout the workflow.

**Changed Files:**

- `README.md`
- `tests/typescript/coreCaseOpenApi.test.ts`
- `tests/typescript/taxPlanCycleRepository.integration.ts`
- `planning/team/ticket-journal.md`

**Validation Notes:**

- `npm run typecheck` passed.
- `npx vitest run tests/typescript/coreCaseOpenApi.test.ts` passed; 1 file and 6
  tests passed.
- `npm run test:integration -- tests/typescript/taxPlanCycleRepository.integration.ts`
  first failed in the sandbox because Testcontainers could not find a working container
  runtime strategy.
- The same repository integration command passed with Docker/Testcontainers access; 1
  file and 5 tests passed.

## christopher-martus-jira53 - SCRUM-53

**Branch:** `christopher-martus-jira53`

**Owner:** Christopher Martus

**Epic:** SCRUM-13 - Domain Model & Walking Skeleton

**Summary:** Wire create-cycle to persist in Intake stage

**CSV Description:** As an Advisor, I want creating a Tax Plan Cycle to persist it in
Intake, so that a new cycle is recorded against a client and planning period.

**Acceptance Criteria:**

- POST creates a cycle in Intake stage for a given client and planning period and returns
  its case ID.
- A creation also writes the initial stage_transition row.

**How This Ties Into the Code:**

- `TaxPlanCycleRepository.create` now accepts tenant-scoped creation data without a
  caller-selected `stage`.
- Repository create persistence writes `tax_plan_cycle.stage` as `Intake`, stores the
  submitted `due_date`, and returns the generated case ID.
- The same create transaction writes the initial `stage_transition` row for the generated
  case ID.
- Because the current `stage_transition.from_stage` column is non-null, the initial entry
  is represented as `Intake` to `Intake` with the supplied actor and current timestamp.
- `taxPlanCycleCreateSchema` now validates the POST body shape without a caller-selected
  `stage`, while requiring `planning_period`, owner, priority, client ID, and due date.
- `createTaxPlanCycleRouter` reads tenant and actor context, then delegates to the
  repository-backed create controller, which returns the generated `case_id`.
- The legacy repository `insert` path remains for compatibility but also writes `Intake`
  so repository persistence cannot choose a different initial stage.

**Project Scope Connection:**

TaxPulse Advisory starts each tenant-scoped Tax Plan Cycle in Intake so advisors have a
single workflow source of truth in the case stage. This repository slice preserves tenant
isolation and avoids introducing a separate status field while preparing the create-cycle
flow for route/controller wiring and initial transition history.

**Changed Files:**

- `src/typescript/coreCaseOpenApi.ts`
- `src/typescript/index.ts`
- `src/typescript/taxPlanCycle.ts`
- `src/typescript/taxPlanCycleCreateController.ts`
- `src/typescript/taxPlanCycleRepository.ts`
- `src/typescript/taxPlanCycleRoutes.ts`
- `tests/typescript/coreCaseOpenApi.test.ts`
- `tests/typescript/taxPlanCycleRead.typecheck.ts`
- `tests/typescript/taxPlanCycleRepository.integration.ts`
- `tests/typescript/taxPlanCycleRoutes.test.ts`
- `planning/team/ticket-journal.md`

**Validation Notes:**

- `npm run typecheck` passed.
- `npx vitest run tests/typescript/taxPlanCycleRoutes.test.ts tests/typescript/coreCaseOpenApi.test.ts`
  passed; 2 files and 12 tests passed.
- `npm run test:integration -- tests/typescript/taxPlanCycleRepository.integration.ts`
  first failed in the sandbox because Testcontainers could not find a container runtime.
- The same repository integration command passed with Docker/Testcontainers access; 1 file
  and 4 tests passed.

## martins-okorie-jira46 - SCRUM-46

**Branch:** `martins-okorie-jira46`

**Owner:** Chimaobi Martins Okorie

**Epic:** SCRUM-13 - Domain Model & Walking Skeleton

**Summary:** Test the Plan Cycle Queue ordering and overdue flag

**CSV Description:** As a Backend Developer, I want the Plan Cycle Queue query covered
against real PostgreSQL, so that ordering and overdue logic are correct.

**Acceptance Criteria:**

- A query returns a tenant's cases ordered by `due_date` ascending.
- Cases past their `due_date` are flagged overdue in the result.
- A Testcontainers test asserts both ordering and the overdue flag.

**How This Ties Into the Code:**

- `TaxPlanCycleRepository.listQueue` reads tenant-scoped Tax Plan Cycles through
  Drizzle and orders them by `due_date` ascending.
- The queue read model adds `is_overdue`, computed with the SCRUM-46 rule
  `due_date < asOfDate`.
- `TaxPlanCycleQueueInput` accepts the required tenant boundary and an optional
  deterministic `asOfDate` override for tests.
- The Testcontainers integration suite inserts synthetic queue data for two tenants
  and verifies ordering, tenant isolation, and overdue flags against PostgreSQL.

**Project Scope Connection:**

TaxPulse Advisory uses the Plan Cycle Queue to help advisors scan tenant-scoped cases
by upcoming due date. This ticket protects that workflow by proving the queue reads the
right firm's cases in the right order and clearly marks overdue Tax Plan Cycles without
introducing a separate case status field.

**Changed Files:**

- `src/typescript/taxPlanCycleRepository.ts`
- `src/typescript/index.ts`
- `tests/typescript/taxPlanCycleRepository.integration.ts`
- `tests/typescript/taxPlanCycleRead.typecheck.ts`
- `planning/team/ticket-journal.md`

**Validation Notes:**

- `npm run typecheck` passed.
- `npm test` passed with local socket permissions; 8 files and 49 tests passed.
- `npm run test:migration` passed with local PostgreSQL socket permissions; 7 tests
  passed.
- `npm run db:check` passed.
- `npm run test:integration` is wired for the SCRUM-46 Testcontainers coverage but
  could not run in this shell because Testcontainers could not find a working container
  runtime strategy.

## martins-okorie-jira33 - SCRUM-33

**Branch:** `martins-okorie-jira33`

**Owner:** Chimaobi Martins Okorie

**Epic:** SCRUM-12 - Engineering Foundations & Federal Posture

**Summary:** Surface aggregation timeouts as rejected promises

**CSV Description:** As a Backend Developer, I want a simulated source timeout surfaced
as a rejected promise, so that the Data Aggregation stage never hangs on a slow source.

**Acceptance Criteria:**

- The client races the source call against a configurable timeout.
- A simulated timeout rejects with a typed timeout error rather than hanging.
- A Vitest case asserts the rejection and that a fast call still resolves.

**How This Ties Into the Code:**

- `TaxPulseAggregationClient` now accepts optional timeout configuration while keeping
  the existing constructor call shape valid.
- Aggregation fetches race the source promise against a timeout promise and reject with
  `AggregationTimeoutError` when the timeout wins.
- The timeout error carries the affected `clientId` and configured `timeoutMs` for
  typed handling by callers and tests.
- `tests/typescript/aggregationClient.test.ts` verifies both the timeout rejection and
  the fast-source success path with deterministic fake timers.

**Tradeoffs:**

- Timeout handling rejects the client call but does not cancel the underlying
  data-source promise because the current source interface has no abort signal.
- Constructor-level timeout configuration preserves existing callers while making the
  timeout configurable for slow-source simulations.
- A `1000ms` default prevents hangs without making local mock behavior brittle.

**Project Scope Connection:**

TaxPulse Advisory depends on the Data Aggregation stage to gather client income and
deduction information without blocking the Tax Plan Cycle workflow. This ticket keeps a
slow simulated source from hanging aggregation work, which protects stage progression and
maintains predictable backend behavior for tenant-scoped planning workflows.

**Changed Files:**

- `src/typescript/aggregationClient.ts`
- `src/typescript/index.ts`
- `tests/typescript/aggregationClient.test.ts`
- `planning/team/ticket-journal.md`

**Validation Notes:**

- `npm run typecheck` passed.
- `npx vitest run tests/typescript/aggregationClient.test.ts` passed.
- `npm test` was rerun with local socket permissions; all non-migration suites passed
  with 41 tests, but the migration suites require `DATABASE_URL` in this local
  environment.

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

**Project Scope Connection:**

TaxPulse Advisory is built around a Tax Plan Cycle that moves through defined workflow
stages with role-gated transitions and immutable audit history. This ticket supports
that scope by creating the database table that records every stage change for a cycle.
That transition history is a foundation for reviewer visibility, compliance evidence,
and the archived audit trail described in the project scope.

**Changed Files:**

- `migrations/20260626120000_create_tax_plan_cycle.sql`
- `tests/typescript/taxPlanCycleMigration.test.ts`
- `vitest.config.ts`

**Validation Notes:**

- `npm run typecheck` passed.
- `npm run test:migration` now starts and reaches
  `tests/typescript/taxPlanCycleMigration.test.ts`, but this local environment needs
  `DATABASE_URL` set before the PostgreSQL migration test can execute.

## dylan-harle-jira48 - SCRUM-48

**Branch:** `dylan-harle-jira48`

**Owner:** Dylan Harle

**Epic:** SCRUM-13 - Domain Model & Walking Skeleton

**Summary:** Add the create-cycle route with zod validation

**CSV Description:** As a Backend Developer, I want a create-cycle route validated with
zod, so that malformed Tax Plan Cycle creates are rejected at the boundary.

**Acceptance Criteria:**

- A POST route validates the create body against the Tax Plan Cycle create schema.
- A malformed request returns 400 with a structured validation error.
- A valid request reaches the controller layer with no persistence yet.

**How This Ties Into the Code:**

- `createApp` now owns JSON body parsing before registered feature routes, so the
  create-cycle endpoint runs through the SCRUM-47 Express skeleton instead of a
  route-only test harness.
- `main` registers `createTaxPlanCycleRouter` through `createApp`, connecting the
  no-persistence create endpoint to the Core Case Service HTTP surface.
- Malformed create bodies are raised as `ProblemHttpError` instances and returned by
  the shared RFC 7807 Problem Details middleware with validation issues attached as
  safe extension data.
- Controller failures also flow through the same Problem Details middleware, while
  valid creates still reach the controller stub and return the accepted response.
- `tests/typescript/taxPlanCycleRoutes.test.ts` boots the route through `createApp`
  to verify JSON parsing, shared error handling, and controller delegation together.

**Project Scope Connection:**

TaxPulse Advisory centers work around the Tax Plan Cycle. This ticket adds the first
write-side HTTP boundary for creating a cycle while preserving the project constraints
that workflow state remains in the case stage and malformed boundary input is rejected
before it can affect downstream case, tenant, audit, or persistence behavior.

**Changed Files:**

- `package-lock.json`
- `src/typescript/app.ts`
- `src/typescript/errors.ts`
- `src/typescript/index.ts`
- `src/typescript/taxPlanCycleRoutes.ts`
- `tests/typescript/taxPlanCycleRoutes.test.ts`
- `planning/team/ticket-journal.md`

**Validation Notes:**

- `npm install` completed and installed the SCRUM-47 logging dependencies declared in
  `package.json`.
- `npm run typecheck` passed.
- `npm test` passed, including smoke tests and Vitest coverage for the health
  endpoint, pino request logging, Problem Details middleware, and the create-cycle
  route through `createApp`.

## dylan-harle-jira49 - SCRUM-49

**Branch:** `dylan-harle-jira49`

**Owner:** Dylan Harle

**Epic:** SCRUM-13 - Domain Model & Walking Skeleton

**Summary:** Add the read-cycle route

**CSV Description:** As a Backend Developer, I want a read-cycle route by case ID, so
that a created Tax Plan Cycle can be fetched back.

**Acceptance Criteria:**

- A GET route accepts a case ID path parameter and validates it.
- An unknown case ID returns 404 as Problem Details.
- The route is tenant-scoped via the request's tenant context.

**How This Ties Into the Code:**

- `taxPlanCycleSchema` uses `client_id` as the Tax Plan Cycle unit-of-work identifier
  exposed through the current `caseId` route parameter.
- `tax_plan_cycle` follows the SCRUM-42 table shape without a separate `case_id`
  column, while transition history still uses the SCRUM-43 `stage_transition.case_id`
  column to reference `tax_plan_cycle.client_id`.
- `createTaxPlanCycleRouter` now serves `GET /tax-plan-cycles/:caseId`, validates
  the path parameter with zod, reads tenant scope from `req.tenant.id`, and delegates
  to `findByCaseId({ tenantId, caseId })`.
- Missing or cross-tenant cycles return the shared RFC 7807 Problem Details response
  with a 404 status, preserving tenant isolation by not revealing cross-tenant
  existence.

**Project Scope Connection:**

TaxPulse Advisory centers work around tenant-scoped Tax Plan Cycles. This ticket adds
the read-side HTTP boundary needed to fetch a cycle by its case identifier while
preserving stage-based workflow state, tenant isolation, and the shared Problem
Details error contract.

**Changed Files:**

- `migrations/20260626120000_create_tax_plan_cycle.sql`
- `src/typescript/index.ts`
- `src/typescript/taxPlanCycle.ts`
- `src/typescript/taxPlanCycleCreateController.ts`
- `src/typescript/taxPlanCycleRoutes.ts`
- `tests/typescript/smoke.test.ts`
- `tests/typescript/taxPlanCycle.test.ts`
- `tests/typescript/taxPlanCycleMigration.test.ts`
- `tests/typescript/taxPlanCycleRoutes.test.ts`
- `planning/team/ticket-journal.md`

**Validation Notes:**

- `npm run typecheck` passed.
- `npm test` passed.
- `npm run test:migration` did not execute the migration test because the current
  `vitest.config.ts` explicitly excludes `tests/typescript/taxPlanCycleMigration.test.ts`;
  Vitest exited with "No test files found."

## development - SCRUM-50

**Branch:** `development`

**Owner:** Reyhan Daniels

**Epic:** SCRUM-13 - Domain Model & Walking Skeleton

**Summary:** Publish the OpenAPI document for create and read

**CSV Description:** As a Backend Developer, I want an OpenAPI description of the
create and read operations, so that the contract is published before clients consume it.

**Acceptance Criteria:**

- An OpenAPI document describes the create and read operations with their
  request/response schemas.
- The document is served at a documented path and validates against the OpenAPI spec.

**How This Ties Into the Code:**

- `createCoreCaseOpenApiDocument` publishes an OpenAPI 3.0.3 document for
  `POST /tax-plan-cycles` and `GET /tax-plan-cycles/{caseId}`.
- The document derives Tax Plan Cycle request, read parameter, and read response schemas
  from the same Zod definitions used by the route boundary.
- The create acknowledgment response now has a small Zod schema source so the OpenAPI
  response schema is not maintained as an unrelated hand-written contract.
- `createCoreCaseOpenApiRouter` serves the document at `GET /openapi.json`, and service
  startup registers it with the existing Core Case Service routes.
- `README.md` documents the OpenAPI path and the covered create/read operations.
- `tests/typescript/coreCaseOpenApi.test.ts` verifies the served document, operation
  coverage, schema contents, source schema registrations, and local OpenAPI structure.

**Project Scope Connection:**

TaxPulse Advisory exposes tenant-scoped Tax Plan Cycle operations to client teams.
Publishing the create/read OpenAPI contract gives client teams a stable, documented
boundary while preserving tenant isolation language, the stage-based workflow model,
and fake-only synthetic examples.

**Changed Files:**

- `README.md`
- `planning/team/ticket-journal.md`
- `src/typescript/coreCaseOpenApi.ts`
- `src/typescript/coreCaseOpenApiRoutes.ts`
- `src/typescript/index.ts`
- `src/typescript/taxPlanCycleCreateController.ts`
- `tests/typescript/coreCaseOpenApi.test.ts`

**Validation Notes:**

- `npm run typecheck` passed.
- `npm test` passed, including the OpenAPI document tests.
- `python -m ruff format --check src/python tests/python` passed.
- `python -m pytest` passed with 4 tests; pytest emitted a local cache warning because
  it could not write under `.pytest_cache`.

## martins-okorie-jira51 - SCRUM-51

**Branch:** `martins-okorie-jira51`

**Owner:** Chimaobi Martins Okorie

**Epic:** SCRUM-13 - Domain Model & Walking Skeleton

**Summary:** Define the Drizzle schema for the Tax Plan Cycle tables

**CSV Description:** As a Backend Developer, I want Drizzle schema definitions matching
the PostgreSQL tables, so that persistence is type-safe and migration-driven.

**Acceptance Criteria:**

- Drizzle definitions match the tenant, tax_plan_cycle, and stage_transition tables.
- A generated migration creates the tables from empty and matches the hand-written
  migrations.
- Running migrations is idempotent and recorded in a migrations table.

**How This Ties Into the Code:**

- `src/typescript/db/schema.ts` defines exported Drizzle tables for `tenants`,
  `tax_plan_cycle`, and `stage_transition` with the intended columns, constraints,
  indexes, and foreign keys.
- `drizzle.config.ts` points Drizzle Kit at the TypeScript schema and writes generated
  migration evidence into `drizzle/`.
- `migrations/20260626120000_create_tax_plan_cycle.sql` now matches SCRUM-42 by
  focusing on `tax_plan_cycle`, while `migrations/20260627120000_create_stage_transition.sql`
  keeps the SCRUM-43 transition history DDL in its own migration.
- `stage_transition.case_id` remains a foreign key to the generated `tax_plan_cycle.id`
  case identifier.
- `applyMigrations` now creates `schema_migrations`, records applied SQL files, and
  skips already-applied migrations so reruns are idempotent.
- Migration tests verify the table contract, Drizzle-generated SQL evidence, migration
  tracking, idempotent reruns, and the foreign key/check-constraint behavior.

**Project Scope Connection:**

TaxPulse Advisory centers work on tenant-scoped Tax Plan Cycles with stage-based
workflow state and durable transition history. This ticket gives the Core Case Service
a typed Drizzle schema for those persistence tables while preserving tenant isolation,
the no-separate-status rule, and migration evidence needed for a defensible walking
skeleton.

**Changed Files:**

- `README.md`
- `drizzle.config.ts`
- `drizzle/`
- `migrations/20260625120000_create_tenants.sql`
- `migrations/20260626120000_create_tax_plan_cycle.sql`
- `migrations/20260627120000_create_stage_transition.sql`
- `package-lock.json`
- `package.json`
- `src/typescript/db/schema.ts`
- `src/typescript/index.ts`
- `src/typescript/postgresMigrations.ts`
- `tests/typescript/taxPlanCycleMigration.test.ts`
- `tests/typescript/tenantsMigration.test.ts`
- `planning/team/ticket-journal.md`

**Validation Notes:**

- `npm run typecheck` passed.
- `npm run db:check` passed.
- `npm run db:generate` created the Drizzle migration evidence; a second run reported
  no schema changes.
- `npm test` passed with local socket permissions; 8 files and 49 tests passed.
- `npm run test:migration` passed with local PostgreSQL socket permissions; 7 tests
  passed.
- The handwritten stage transition migration was split into its own idempotent file
  for readability while preserving the existing table shape.
- Python validation commands could not run in this shell because `python`/`python3`
  are Python 3.13.2 and do not have Ruff, Pyright, or pytest installed, while
  `pyproject.toml` requires Python 3.13.14 exactly.

## dylan-harle-jira52 - SCRUM-52

**Branch:** `dylan-harle-jira52`

**Owner:** Dylan Harle

**Epic:** SCRUM-13 - Domain Model & Walking Skeleton

**Summary:** Implement the Tax Plan Cycle repository through Drizzle

**CSV Description:** As a Backend Developer, I want a repository that inserts and reads
a Tax Plan Cycle through Drizzle, so that the service persists cases via one typed
boundary.

**Acceptance Criteria:**

- A repository method inserts a cycle and returns its generated case ID.
- A repository method reads a cycle back by case ID within the tenant scope.
- A Testcontainers test covers insert-then-read through Drizzle.

**How This Ties Into the Code:**

- `tax_plan_cycle.id` is now the generated primary key and the service-facing case ID.
- `tax_plan_cycle.client_id` remains a required client reference, but it is no longer
  the cycle primary key or the target of transition history.
- `stage_transition.case_id` now references `tax_plan_cycle.id`.
- `TaxPlanCycle` read models include generated `id`, while create payloads omit it.
- `createTaxPlanCycleRepository` inserts through Drizzle, returns the generated `id`,
  and reads by `{ tenantId, caseId }` using the new primary key.
- `createTaxPlanCycleReadHelper` remains as a compatibility wrapper for existing route
  code.

**Project Scope Connection:**

TaxPulse Advisory centers work around tenant-scoped Tax Plan Cycles with durable stage
history. This ticket removes the temporary `client_id`-as-case-ID assumption and gives
future case, transition, audit, and read-model work a stable generated cycle key while
preserving tenant-scoped reads.

**Changed Files:**

- `drizzle/`
- `migrations/20260626120000_create_tax_plan_cycle.sql`
- `seed.sql`
- `src/typescript/coreCaseOpenApi.ts`
- `src/typescript/db/schema.ts`
- `src/typescript/index.ts`
- `src/typescript/taxPlanCycle.ts`
- `src/typescript/taxPlanCycleRepository.ts`
- `tests/typescript/smoke.test.ts`
- `tests/typescript/taxPlanCycle.test.ts`
- `tests/typescript/taxPlanCycleMigration.test.ts`
- `tests/typescript/taxPlanCycleRead.typecheck.ts`
- `tests/typescript/taxPlanCycleRepository.integration.ts`
- `tests/typescript/taxPlanCycleRoutes.test.ts`

**Validation Notes:**

- `npm install` restored declared dependencies, including `drizzle-orm`, into
  `node_modules`.
- `npm run typecheck` passed.
- `npx vitest run tests/typescript/aggregationClient.test.ts tests/typescript/coreCaseOpenApi.test.ts tests/typescript/httpApp.test.ts tests/typescript/taxPlanCycle.test.ts tests/typescript/taxPlanCycleRoutes.test.ts tests/typescript/taxPlanCycleTransitions.test.ts`
  passed with 41 tests.
- `npm run test:integration` passed with 2 Testcontainers repository tests.
- `npm run test:smoke` passed with 9 tests.
- `npm run db:check` passed.
- `npm test` still fails in this local environment when migration tests use the
  configured `DATABASE_URL` because that PostgreSQL instance does not provide
  `uuidv7()`.

## caleb-latimer-jira55 - SCRUM-55

**Branch:** `caleb-latimer-jira55`

**Owner:** Caleb Latimer

**Epic:** SCRUM-14 - Secure APIs - Auth, Audit & Boundaries

**Summary:** Create the user and role tables

**CSV Description:** As a Backend Developer, I want user and role tables, so that
TaxPulse identities and their roles are stored per tenant.

**Acceptance Criteria:**

- A migration creates a `user` table with `tenant_id`, `email` unique per tenant, and
  `status`.
- A `role` table enumerates Firm Admin, Advisor, Client, and TaxPulse Platform Admin.
- A `user_status` table enumerates invited, active, and disabled.
- A user is assigned exactly one role and one status via foreign keys.

**How This Ties Into the Code:**

- `src/typescript/db/schema.ts` now defines `role`, `user_status`, and `user`
  alongside the existing tenant and cycle tables.
- `role.role` is modeled as a Postgres enum-backed lookup column for the four canonical
  role labels, while `user_status.status` captures the three account lifecycle states.
- `role.id` and `user_status.id` now use integer identity primary keys, and `users`
  points at both lookup tables through `role_id` and `status_id`.
- The Mermaid ER diagram for the auth lookup tables is:

```mermaid
erDiagram
  TENANTS ||--o{ USERS : has
  ROLES ||--o{ USERS : assigns
  USER_STATUS ||--o{ USERS : sets

  TENANTS {
    uuid id PK
    text name
    timestamptz created_at
  }

  ROLES {
    int id PK
    user_role_name role
  }

  USER_STATUS {
    int id PK
    user_status_value status
  }

  USERS {
    uuid id PK
    uuid tenant_id FK
    text email
    int role_id FK
    int status_id FK
  }
```

**Project Scope Connection:**

TaxPulse Advisory needs tenant-isolated identities before the auth, roster, and JWT
work can land. This ticket creates the persistence boundary for firm staff, clients,
and platform admins while preserving least-privilege, scoped access, and the project
rule that workflow condition stays in the Tax Plan Cycle stage rather than in a
separate case status field.

**Changed Files:**

- `drizzle/0001_user_role.sql`
- `drizzle/meta/_journal.json`
- `drizzle/meta/0000_snapshot.json`
- `src/typescript/db/schema.ts`
- `src/typescript/index.ts`
- `tests/typescript/userRoleMigration.test.ts`
- `planning/prompt-journal/cl-journal.md`
- `planning/team/ticket-journal.md`

**Validation Notes:**

- Implementation was completed in the workspace.
- Review action items:
  - `npm run db:check`
- `npm run typecheck`
- `npm test`
- `npm run test:migration`

## caleb-latimer-jira56 - SCRUM-56

**Branch:** `caleb-latimer-jira56`

**Owner:** Caleb Latimer

**Epic:** SCRUM-14 - Secure APIs - Auth, Audit & Boundaries

**Summary:** Create the credential and mfa_enrollment tables

**CSV Description:** As a Backend Developer, I want credential and mfa_enrollment
tables, so that password hashes and second factors are stored apart from user profile
data.

**Acceptance Criteria:**

- A Drizzle migration creates a `credential` table keyed to a user with a CUID primary
  key and an argon2id password hash column.
- A Drizzle migration creates an `mfa_enrollment` table with a per-user TOTP secret
  and enrolled flag.
- Neither table stores a plaintext password or recovery code.

**How This Ties Into The Code:**

- `src/typescript/db/schema.ts` now defines `credential` and `mfa_enrollment` with
  camelCase TypeScript field names, matching the repo's TypeScript default style.
- `credential` stores `id`, `userId`, and `passwordHash`, while `mfa_enrollment`
  stores `userId`, `totpSecret`, and `isEnrolled` with a `false` default.
- `src/typescript/db/seed.ts` now seeds synthetic credential hashes and TOTP secrets
  alongside the existing tenant, user, role, and cycle fixtures.
- `tests/typescript/credential/*` and `tests/typescript/mfa_enrollement/*` now cover
  the table contracts, seeded rows, FK enforcement, and one-row-per-user behavior.
- `package.json` wires the new auth schema tests into `npm run test:migration` so the
  dedicated migration suite exercises the new tables with the existing repository
  contracts.
- The Mermaid ER diagram for the auth storage split is:

```mermaid
erDiagram
  USERS ||--|| CREDENTIAL : has
  USERS ||--|| MFA_ENROLLMENT : enrolls

  USERS {
    uuid id PK
    uuid tenantId FK
    text email
    int roleId FK
    int statusId FK
  }

  CREDENTIAL {
    varchar(25) id PK
    uuid userId FK
    varchar(255) passwordHash
  }

  MFA_ENROLLMENT {
    uuid userId PK, FK
    varchar(512) totpSecret
    boolean isEnrolled
  }
```

**Project Scope Connection:**

TaxPulse Advisory keeps credentials and second factors out of the user profile record
so identity data, password hashes, and MFA enrollment can evolve independently while
preserving least privilege and the project's audit-friendly auth boundary.

**Changed Files:**

- `package.json`
- `planning/prompt-journal/cl-journal.md`
- `planning/team/ticket-journal.md`
- `src/typescript/db/schema.ts`
- `src/typescript/db/seed.model.ts`
- `src/typescript/db/seed.ts`
- `src/typescript/index.ts`
- `tests/typescript/credential/credential.integration.ts`
- `tests/typescript/credential/credential.test.model.ts`
- `tests/typescript/credential/credential.test.ts`
- `tests/typescript/mfa_enrollement/mfa_enrollement.integration.ts`
- `tests/typescript/mfa_enrollement/mfa_enrollement.test.model.ts`
- `tests/typescript/mfa_enrollement/mfa_enrollement.test.ts`

**Validation Notes:**

- Schema, seed, and test scaffolding were added in the workspace.
- Drizzle generation and Node-based validation were left as follow-up action items per
  the user's request not to run node scripts in this turn.

## christopher-martus-jira62 - SCRUM-62

**Branch:** `christopher-martus-jira62`

**Owner:** Christopher Martus

**Jira Key:** SCRUM-62

**Summary:** Add JWT validation middleware to protected routes

**Description:** Validate bearer access JWTs before protected Core Case Service routes
use tenant or user context.

**Acceptance Criteria:**

- Access-token signature, expiry, issuer, and required claims are verified.
- Missing, malformed, invalid-signature, expired, wrong-issuer, and invalid-claim
  tokens return a consistent 401 Problem Details response.
- Verified `sub`, `role`, and `tenant_id` claims are available to downstream handlers.

**Code Connection:**

- `createJwtAuthenticationMiddleware` uses SCRUM-61's `jose` HS256 contract and the
  configured `JWT_ISSUER` and `JWT_SIGNING_SECRET`; it does not hard-code credentials.
- It attaches `authenticatedPrincipal: { userId, role, tenantId }` and preserves the
  existing `req.user.id` and `req.tenant.id` route context compatibility fields.
- Only `GET/POST /tax-plan-cycles` are protected. Health, OpenAPI, login, and MFA
  enrollment routes remain public.

**Project Scope Connection:**

The Core Case Service now establishes a verified tenant and user boundary before
operational Tax Plan Cycle processing, without adding authorization policy, tenant query
filtering, token issuance, refresh-token access, revocation, or other auth mechanisms.

**Changed Files:**

- `src/typescript/jwtAuthentication.ts`
- `src/typescript/index.ts`
- `tests/typescript/jwtAuthentication.test.ts`
- `tests/typescript/jwtProtectedTaxPlanCycleRoutes.test.ts`
- `planning/team/ticket-journal.md`

**Validation Notes:**

- `npm run typecheck` passed.
- `npx vitest run tests/typescript/jwtAuthentication.test.ts` passed: 12 tests.
- `npx vitest run tests/typescript/jwtProtectedTaxPlanCycleRoutes.test.ts tests/typescript/taxPlanCycleRoutes.test.ts` passed: 9 tests.
- `npm test` passed typechecking and 100 tests. Its 13 unrelated PostgreSQL migration
  tests could not run because this environment has no working Testcontainers container
  runtime.

## dylan-harle-jira63 - SCRUM-63

**Branch:** `dylan-harle-jira63`

**Owner:** Dylan Harle

**Jira Key:** SCRUM-63

**Summary:** Cover auth negative paths and reject SSO callbacks

**Description:** As a Security Engineer, I want negative-path auth tests including a
rejected SSO callback, so that only the supported email+password+MFA flow can
authenticate.

**Acceptance Criteria:**

- Tests assert wrong password, missing MFA, and tampered token each return 401.
- A request to a hypothetical SSO/OIDC callback route returns 404; SSO is out of scope.
- The negative-path suite runs locally and is green.

**Code Connection:**

- `authNegativePaths.test.ts` composes the existing password login router, MFA login
  router, and SCRUM-62 JWT middleware around an in-memory protected route.
- Wrong-password login returns the existing invalid-credentials 401 response.
- A successful password step returns only the existing MFA challenge response; without
  completing `/auth/login/mfa`, protected route access still returns the JWT middleware
  401 response.
- A tampered bearer token returns the same authentication-required 401 used by SCRUM-62.
- `POST /auth/callback/oidc` remains unregistered and returns 404, confirming no SSO or
  OIDC callback flow was added.

**Project Scope Connection:**

This ticket is test-only coverage over the supported email+password+MFA authentication
boundary. It does not add SSO, introduce alternate authentication routes, change token
issuance, change JWT validation, or alter protected Core Case Service behavior. Later
tickets greater than 62 remain functionally unaffected: SCRUM-64 can still validate the
shared JWT contract in FastAPI, SCRUM-67 and SCRUM-69 can still consume SCRUM-62's
authenticated tenant/user context, and no inspected later ticket depends on an SSO route.

**Changed Files:**

- `tests/typescript/authNegativePaths.test.ts`
- `planning/team/ticket-journal.md`

**Validation Notes:**

- `npx vitest run tests/typescript/authNegativePaths.test.ts` passed: 4 tests.
- `npx vitest run tests/typescript/auth/auth.test.ts tests/typescript/authMfaLoginRoutes.test.ts tests/typescript/jwtAuthentication.test.ts` passed: 23 tests.
- `npm run typecheck` passed.
- `npm test` passed typechecking and the new SCRUM-63 suite inside the full Vitest run.
  The full run ended with 118 passing tests and 1 existing migration failure in
  `tests/typescript/tenantsMigration.test.ts` because PostgreSQL reported
  `function uuidv7() does not exist`.

## christopher-martus-jira72 - SCRUM-72

**Branch:** `christopher-martus-jira72`

**Owner:** Christopher Martus

**Jira Key:** SCRUM-72

**Summary:** Document service ownership boundaries in an ADR

**Description:** As a Backend Developer, document which entity each service owns so
that TaxPulse bounded contexts remain clear as the system grows.

**Acceptance Criteria:**

- The ADR states that the Core Case Service owns the case and the Tax Engine owns
  calculations.
- The ADR names the store each context writes to.
- The ADR is linked from the ADR index.

**Code Connection:**

- ADR-0009 defines Core Case Service ownership of Tax Plan Cycles and persisted
  scenarios in its Drizzle-backed PostgreSQL store.
- ADR-0009 defines Tax Engine ownership of calculation rules and execution, while
  documenting that it currently does not write calculation results to a persistent
  store.
- The Core Case Service calls the Tax Engine through its supported API and persists
  returned scenario figures as case-owned data.

**Project Scope Connection:**

This decision preserves tenant, workflow, access, and audit boundaries in the Core
Case Service while allowing the Tax Engine to evolve its calculation behavior
independently. It records current persistence responsibilities without inventing a
Tax Engine store before one is selected.

**Changed Files:**

- `adr/0009-service-ownership-boundaries.md`
- `adr/README.md`
- `planning/team/ticket-journal.md`

**Validation Notes:**

- `npx vitest run tests/typescript/authNegativePaths.test.ts` passed: 4 tests.
- `npx vitest run tests/typescript/auth/auth.test.ts tests/typescript/authMfaLoginRoutes.test.ts tests/typescript/jwtAuthentication.test.ts` passed: 23 tests.
- `npm run typecheck` passed.
- `npm test` passed typechecking and the new SCRUM-63 suite inside the full Vitest run.
  The full run ended with 118 passing tests and 1 existing migration failure in
  `tests/typescript/tenantsMigration.test.ts` because PostgreSQL reported
  `function uuidv7() does not exist`.

## martins-okorie-jira69 - SCRUM-69

**Branch:** `martins-okorie-jira69`

**Owner:** Chimaobi Martins Okorie

**Jira Key:** SCRUM-69

**Summary:** Enforce per-tenant rate limiting

**Description:** As a Platform Engineer, I want per-tenant rate limiting, so that one
firm cannot exhaust shared capacity.

**Acceptance Criteria:**

- Requests exceeding a per-tenant limit return 429 with a Retry-After header.
- Rate-limit counters are isolated per tenant_id.
- A test asserts one tenant's burst does not throttle another tenant.

**Code Connection:**

- `createTenantRateLimitMiddleware` enforces an in-memory default of 60 requests per
  tenant per 60 seconds, with injectable limit, window, clock, and store options for
  focused tests.
- The middleware keys counters from `req.tenant.id`, which SCRUM-62's JWT middleware
  derives from the verified `tenant_id` access-token claim.
- Exceeded limits set `Retry-After` and return a 429 Problem Details response using the
  TaxPulse problem type `https://taxpulse.example/problems/rate-limit-exceeded`.
- `main()` wires the limiter after JWT authentication and before the Tax Plan Cycle
  router, so public health, OpenAPI, login, and MFA routes are not rate-limited by this
  ticket.

**Project Scope Connection:**

Per-tenant rate limiting protects shared Core Case Service capacity while preserving the
project's tenant isolation boundary. The implementation is process-local for the MVP and
does not add schema changes, a distributed cache dependency, broader auth policy, public
route throttling, or a separate Tax Plan Cycle status field.

**Changed Files:**

- `src/typescript/tenantRateLimiting.ts`
- `src/typescript/index.ts`
- `tests/typescript/tenantRateLimiting.test.ts`
- `tests/typescript/jwtProtectedTaxPlanCycleRoutes.test.ts`
- `planning/team/ticket-journal.md`

**Validation Notes:**

- `npm run typecheck` passed.
- `npx vitest run tests/typescript/tenantRateLimiting.test.ts tests/typescript/jwtProtectedTaxPlanCycleRoutes.test.ts` passed: 7 tests.
- `npm run test` passed typechecking and all non-container route/unit coverage needed for
  SCRUM-69. The full Vitest run ended with 111 passing tests and 13 existing
  Testcontainers-backed migration failures because this environment could not find a
  working container runtime strategy.

## martins-okorie-jira70 - SCRUM-70

**Branch:** `martins-okorie-jira70`

**Owner:** Reyhan Daniels

**Jira Key:** SCRUM-70

**Summary:** Emit cost-accounting headers per request

**Description:** As a Platform Engineer, I want cost-accounting headers on responses, so
that per-request usage is observable.

**Acceptance Criteria:**

- Responses include a header reporting the request's accounted cost units.
- The cost value reflects the operation performed.
- A test asserts the header is present on a representative endpoint.

**Code Connection:**

- `createCostAccountingMiddleware` sets `X-TaxPulse-Cost-Units` from a default resolver
  for Tax Plan Cycle operations.
- The default cost model accounts `GET /tax-plan-cycles/:caseId` as 1 unit and
  `POST /tax-plan-cycles` as 2 units.
- `main()` wires cost accounting after SCRUM-62 JWT authentication and before SCRUM-69
  tenant rate limiting, so protected Tax Plan Cycle success responses and rate-limited
  attempts can report the attempted operation's cost.
- The middleware supports an injected resolver for focused tests without adding storage,
  billing, or quota state.

**Project Scope Connection:**

Cost-accounting headers make Core Case Service usage observable per request while staying
inside the secure Tax Plan Cycle boundary created by SCRUM-62 and SCRUM-69. This ticket
does not add persistence, billing records, tenant quota enforcement, OpenAPI changes,
migrations, public-route headers, or a separate Tax Plan Cycle status field.

**Changed Files:**

- `src/typescript/costAccounting.ts`
- `src/typescript/index.ts`
- `tests/typescript/costAccounting.test.ts`
- `tests/typescript/jwtProtectedTaxPlanCycleRoutes.test.ts`
- `planning/team/ticket-journal.md`

**Validation Notes:**

- `npm run typecheck` passed.
- `npx vitest run tests/typescript/costAccounting.test.ts tests/typescript/tenantRateLimiting.test.ts tests/typescript/jwtProtectedTaxPlanCycleRoutes.test.ts` passed: 11 tests.
- `npm run test` passed typechecking and all non-container route/unit coverage needed for
  SCRUM-70. The full Vitest run ended with 115 passing tests and 13 existing
  Testcontainers-backed migration failures because this environment could not find a
  working container runtime strategy.

## caleb-latimer-jira74 - SCRUM-74

**Branch:** `caleb-latimer-jira74`

**Owner:** Caleb Latimer

**Jira Key:** SCRUM-74

**Summary:** Project Tax Plan Cycle changes into the queue projection

**Description:** As a Backend Developer, I want cycle changes projected into the
queue read model, so that the DynamoDB view stays consistent with the case.

**Acceptance Criteria:**

- Creating or updating a cycle upserts its queue projection item.
- The overdue flag is recomputed from `due_date` on each projection.
- A test asserts the projection matches the source cycle after a stage change.

**Code Connection:**

- `TaxPlanCycleRecord` and `TaxPlanCycleQueueProjectionItem` define the source and
  queue-read-model shapes used by the Python projection seam.
- `project_tax_plan_cycle_to_queue_item` rebuilds the denormalized queue item from the
  source cycle on every call and recomputes `overdue` from `due_date` instead of
  persisting stale state.
- `upsert_tax_plan_cycle_queue_projection` is the DynamoDB write boundary for SCRUM-73
  and is intentionally stubbed with the inline marker `Blocked by Scrum-74 pending impl`
  until the table contract lands.
- `tests/python/test_queue_projection.py` covers overdue recomputation, the upsert
  seam, and the stage-change regression case that keeps the queue projection aligned
  with the source cycle.
- Diagram:

```mermaid
flowchart LR
    NODE["Node Core Case Service"]

    subgraph PY_QUEUE["Python queue_projection feature"]
        direction TB
        MODELS["models.py<br/>dataclasses"]
        SERVICE["service.py<br/>projection + upsert seam"]
        SERVICE -->|uses| MODELS
    end

    PG[(PostgreSQL<br/>cycle source store)]
    DDB[(DynamoDB<br/>queue projection store)]

    NODE -->|persists cycle changes| PG
    NODE -->|emits cycle changes| SERVICE
    SERVICE -->|reads canonical cycle state| PG
    SERVICE -->|upserts queue projection| DDB
```

**Project Scope Connection:**

This ticket keeps PostgreSQL as the source of truth for cycle data while adding the
Python-side queue projection seam that will eventually feed DynamoDB. It does not add
or imply a FastAPI runtime, does not assume SCRUM-73's table contract exists yet, and
preserves tenant-isolated cycle data by projecting per-cycle state into the queue
view.

**Changed Files:**

- `src/python/tax_pulse_project_team_1/queue_projection.py`
- `src/python/tax_pulse_project_team_1/__init__.py`
- `tests/python/test_queue_projection.py`
- `planning/team/ticket-journal.md`
- `planning/prompt-journal/cl-journal.md`

**Validation Notes:**

- `py -3.12 -m pytest tests/python/test_queue_projection.py` passed: 3 tests.
- `py -3.12 -m pytest tests/python/test_smoke.py` passed: 1 test.
- `py -3.12 -m pytest tests/python/test_jwt_authentication.py` could not run in this
  host interpreter because `jwt` is not installed there.
- `npx pyright --version` could not be executed here because Node launched through
  `cmd` still hits the repository path `EPERM` `lstat` issue at `C:\Users\Exia`.

## caleb-latimer-jira74-refactor - SCRUM-74

**Branch:** `caleb-latimer-jira74`

**Owner:** Caleb Latimer

**Jira Key:** SCRUM-74

**Summary:** Refactor the queue projection into a feature package

**Description:** As a Backend Developer, I want the queue projection isolated by
feature, so that the models and logic stay separated as the projection layer grows.

**Acceptance Criteria:**

- Projection models live in a dedicated feature module.
- Projection logic lives in a separate service module.
- Tests are grouped by feature and still cover the Express-aligned contract.

**Code Connection:**

- `src/python/tax_pulse_project_team_1/queue_projection/models.py` owns the source and
  projection dataclasses.
- `src/python/tax_pulse_project_team_1/queue_projection/service.py` owns the pure
  projection and stubbed upsert behavior.
- `src/python/tax_pulse_project_team_1/queue_projection/__init__.py` provides the
  public feature export surface.
- `tests/python/queue_projection/test_models.py` and
  `tests/python/queue_projection/test_service.py` split the model-shape coverage from
  the projection behavior coverage.

**Project Scope Connection:**

This refactor keeps the SCRUM-74 queue projection aligned with the Express entity while
making the Python code easier to extend without implying a FastAPI runtime that the
repo does not yet have. It preserves the DynamoDB stub seam and the tenant-scoped
projection boundary.

**Changed Files:**

- `src/python/tax_pulse_project_team_1/queue_projection/__init__.py`
- `src/python/tax_pulse_project_team_1/queue_projection/models.py`
- `src/python/tax_pulse_project_team_1/queue_projection/service.py`
- `src/python/tax_pulse_project_team_1/__init__.py`
- `tests/python/queue_projection/test_models.py`
- `tests/python/queue_projection/test_service.py`
- `planning/team/ticket-journal.md`
