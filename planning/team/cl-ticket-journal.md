# Caleb Latimer Ticket Journal

**Owner:** Caleb Latimer  
**Branch prefix:** `caleb-latimer-`

Add new ticket entries below using this template.

## caleb-latimer-jira229 - SCRUM-229

**Branch:** `caleb-latimer-jira229`

**Assignee:** Caleb Latimer

**Jira:** [SCRUM-229](https://fedstack-june22-t1.atlassian.net/browse/SCRUM-229)

**Related ADR:** [ADR-0001: Tax Plan Cycle condition lives in stage](../../adr/0001-condition-lives-in-stage.md)

**Summary:** Tax Plan Cycle hold management

**Description:** Add a tenant-scoped hold/unhold mutation for Tax Plan Cycles, keep hold as an orthogonal flag, and block stage advancement while a hold is active. The Pulse UI replaces the placeholder Hold toast with a working modal flow for placing a hold reason and an immediate unhold action.

**Acceptance Criteria:**

- A `PATCH /v1/tax-plan-cycles/:caseId/hold` endpoint exists with strict hold/unhold validation.
- A non-empty trimmed hold reason is required when `on_hold` is true, and unhold clears the stored reason.
- Firm Admins and Advisors with `EDIT` can change hold state; clients and other unauthorized users cannot.
- Held cycles cannot advance stages, including concurrent hold/advance races.
- The Pulse details view shows the hold reason while held and disables Advance Stage until the hold is removed.
- The Hold action opens a modal for active cycles and removes hold immediately for held cycles.

**Code Connection:**

- `src/typescript/features/taxPlanCycle/controllers/holdController.ts`
- `src/typescript/features/taxPlanCycle/repositories/repository.ts`
- `src/typescript/features/taxPlanCycle/routes.ts`
- `src/typescript/features/taxPlanCycle/lambdaHandlers.ts`
- `src/typescript/auditEntryRepository.ts`
- `src/typescript/features/taxPlanCycle/index.ts`
- `src/typescript/coreCaseOpenApi.ts`
- `src/typescript/index.ts`
- `src/typescript/shared/scripts/cloudTap.ts`
- `src/typescript/shared/scripts/taxPlanCycleLambdaRuntime.ts`
- `src/typescript/shared/scripts/execute-lambda/index.ts`
- `src/typescript/shared/scripts/present-to-client-lambda/index.ts`
- `src/pulseUI/entities/taxPlanCycleQueries.ts`
- `src/pulseUI/pages/taxPlanCycle/Details.tsx`
- `src/pulseUI/pages/taxPlanCycle/Details.module.css`

**Project Scope Connection:**

- Core Case workflow and tenant-scoped state transitions
- Pulse UI case details workflow controls
- API contract and audit logging

**Changed Files:**

- `planning/team/cl-ticket-journal.md`
- `src/pulseUI/entities/taxPlanCycleQueries.ts`
- `src/pulseUI/pages/taxPlanCycle/Details.module.css`
- `src/pulseUI/pages/taxPlanCycle/Details.tsx`
- `src/pulseUI/tests/taxPlanCycle/Details.test.tsx`
- `src/pulseUI/tests/taxPlanCycle/queries.test.ts`
- `src/typescript/coreCaseOpenApi.ts`
- `src/typescript/features/taxPlanCycle/controllers/holdController.ts`
- `src/typescript/features/taxPlanCycle/index.ts`
- `src/typescript/features/taxPlanCycle/repositories/repository.ts`
- `src/typescript/features/taxPlanCycle/routes.ts`
- `src/typescript/features/taxPlanCycle/lambdaHandlers.ts`
- `src/typescript/features/taxPlanCycle/infrastructure/queueCache.ts`
- `src/typescript/features/taxPlanCycle/taxPlanCycle.ts`
- `src/typescript/index.ts`
- `src/typescript/auditEntryRepository.ts`
- `src/typescript/shared/scripts/cloudTap.ts`
- `src/typescript/shared/scripts/taxPlanCycleLambdaRuntime.ts`
- `src/typescript/shared/scripts/execute-lambda/index.ts`
- `src/typescript/shared/scripts/present-to-client-lambda/index.ts`
- `tests/typescript/coreCaseOpenApi.test.ts`
- `tests/typescript/features/taxPlanCycle/createIdempotency.test.ts`
- `tests/typescript/features/taxPlanCycle/holdController.test.ts`
- `tests/typescript/features/taxPlanCycle/integration.test.ts`
- `tests/typescript/features/taxPlanCycle/lambdaHandlers.test.ts`
- `tests/typescript/features/taxPlanCycle/queueCache.test.ts`
- `tests/typescript/features/taxPlanCycle/routes.test.ts`
- `tests/typescript/features/taxPlanCycle/transitionController.test.ts`
- `tests/typescript/shared/scripts/presentToClientLambda.test.ts`

**Validation Notes:**

- `npm run typecheck:core` passed.
- `npm --prefix src/pulseUI run typecheck` passed.
- Focused backend Vitest suites passed: 77 tests across OpenAPI, hold controller, Lambda handlers, queue cache, routes, transition controller, and deployed present-to-client boundary.
- Focused Pulse UI Details/query suites passed: 29 tests.
- The database integration suite could not start because Testcontainers could not find a working Docker or Podman runtime; this is an environment limitation, not a test assertion failure.
- `git diff --check origin/development...HEAD` and `git diff --check` passed with no whitespace errors.

## caleb-latimer-jira181 - SCRUM-181

**Branch:** `caleb-latimer-jira181`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-181

**Summary:** Gate retrieval quality with RAGAS

**Description:** As a Data Engineer, I want a RAGAS evaluation, so that AI-Assist retrieval meets a documented quality bar. Jira 180 is merged and supplies the concrete hybrid retriever used to collect ranked contexts.

**Acceptance Criteria:**

- Fifteen synthetic evaluation questions are checked in under `data/corpus/evaluation/`. This is the accepted working benchmark after the earlier 30-question tuning pass proved too slow for local RAGAS iteration.
- Thresholds are checked in separately for mean `context_relevance >= 0.80` and mean `faithfulness >= 0.60`.
- TypeScript evaluation contracts and collection scripts use the Jira 180 retriever without changing the `/assist` HTTP surface.
- A Python scorer writes the offline RAGAS report and exits nonzero when thresholds fail or inputs are malformed.
- Documentation explains setup, commands, environment variables, report interpretation, threshold rationale, the pgvector requirement, and the Jira 180 dependency.

**Code Connection:**

- Added the shared AI-Assist evaluation contract layer in `src/typescript/assist/evaluation.ts`.
- Added checked-in synthetic evaluation inputs in `data/corpus/evaluation/questions.json` and `data/corpus/evaluation/thresholds.json`.
- Added collection and combined evaluation commands in `src/typescript/shared/scripts/assistEvaluationCollect.ts` and `src/typescript/shared/scripts/assistEvaluation.ts`.
- Added the offline RAGAS scorer in `src/python/retrieval/ragas_evaluation.py` using the collections API `ContextRelevance` and `Faithfulness` metrics.
- Integrated the Jira 180 hybrid keyword/vector retriever and relevance reranker through the narrow evaluation retriever factory.
- Switched the combined evaluation path to `uv run --locked --extra eval python src/python/retrieval/ragas_evaluation.py` and made collection hardwire the Compose PostgreSQL stack through `assertComposePostgresReady()`.
- Added the `eval` optional dependency group in `pyproject.toml` for `openai` and `ragas`.
- Added a root `osv-scanner.toml` with explicit eval-advisory ignores for the locked `diskcache`, `langchain-openai`, and `ragas` findings so the security gate can remain strict without blocking the branch on known accepted eval-only packages.
- Tuned the checked-in evaluation bank to 15 corpus-grounded Advisor and Firm Admin scenarios so the offline RAGAS scorer remains usable for local iteration while still exercising the retrieval boundary.
- Repaired the RAGAS import path mismatch by keeping the `eval` dependency group and `uv.lock` aligned; the scorer now imports RAGAS directly from the locked environment.
- Cleaned the Python quality-gate path by removing the obsolete RAGAS import shim, registering shared JWT fixtures through the root Pytest `conftest.py`, and running CI Python checks from the already-synchronized `uv` environment.

**Project Scope Connection:**

- RAG-Powered AI Assist.
- Lives in the assist corpus and evaluation pipeline rather than Core Case, Tax Engine, Pulse UI, or the `/assist` endpoint.
- Builds on Jira 180's ranked chunk retriever and contributes evaluation evidence for Jira 182 and Jira 189.

**Changed Files:**

- `data/corpus/evaluation/questions.json`
- `data/corpus/evaluation/thresholds.json`
- `.github/workflows/build-test-quality.yml`
- `adr/0035-ai-assist-corpus-boundary.md`
- `conftest.py`
- `package.json`
- `planning/team/cl-ticket-journal.md`
- `pyproject.toml`
- `osv-scanner.toml`
- `src/python/retrieval/evaluation_validation.py`
- `src/python/retrieval/ragas_evaluation.py`
- `src/typescript/assist/evaluation.ts`
- `src/typescript/shared/scripts/assistEvaluation.ts`
- `src/typescript/shared/scripts/assistEvaluationCollect.ts`
- `src/typescript/shared/scripts/composePostgres.ts`
- `src/typescript/assist/retrieval.ts`
- `tests/tax_liability_engine/ragas_evaluation_test.py`
- `tests/tax_liability_engine/auth_test_support.py`
- `tests/typescript/shared/scripts/assistEvaluation.test.ts`
- `tests/typescript/shared/scripts/composePostgres.test.ts`
- `tests/typescript/assist/embeddings.integration.test.ts`
- `tests/typescript/assist/evaluation.test.ts`
- `tests/typescript/assist/retrieval.test.ts`
- `tests/typescript/bootstrap/migrationTestUtils.ts`
- `tests/typescript/features/deductions/repository.test.ts`
- `tests/typescript/features/deductions/routes.test.ts`
- `tests/typescript/tenantLoginResolver.test.ts`

**Validation Notes:**

- Question-bank integrity validation passed for the accepted 15-question benchmark with non-empty contract fields and corpus-grounded expected-section references.
- `npm run typecheck` passed.
- AI-Assist and Compose pgvector-backed case-service validation passed: 5 files and 24 tests.
- The focused Docker pgvector hybrid retrieval integration passed: 1 file and 1 test.
- The broader case-service run excluding only tests that directly start Docker PostgreSQL containers passed: 79 files and 359 tests. Docker startup timeout failures from the unfiltered run were ignored as directed.
- The tax-liability suite passed: 106 tests passed and 2 were skipped.
- Python Ruff format/lint, Pyright, and Pytest quality checks were refreshed for the retrieval evaluation implementation and shared authentication tests.
- Collection uses the concrete hybrid retriever and requires the Compose pgvector database for live ranked-context evaluation.
- Corrected the Jira 180 reranker so it no longer rewards inherited parent headings or generic token overlap from section IDs; it now uses leaf headings and exact section-ID matching for top-1 ranking.

<!--
## caleb-latimer-jiraXX - SCRUM-XX

**Branch:** `caleb-latimer-jiraXX`

**Assignee:** Caleb Latimer

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

## caleb-latimer-jira189 - SCRUM-189

**Branch:** `caleb-latimer-jira189`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-189

**Summary:** Assemble the reproducible evidence packet

**Description:** As a Platform Engineer, I want an evidence packet, so that the build
is reproducible and auditable by reviewers. This branch now carries the Jira-169 gate
corrections, Terraform-backed SPA targeting for the release ZAP scan, a release
evidence manifest artifact, and a rewritten evidence packet that preserves the required
TODO markers while documenting the now-available Jira-169 and Jira-181 evidence paths.

**Acceptance Criteria:**

- The packet links CI test results, security scan reports, and SBOMs for the released
  images.
- The packet includes exact steps to reproduce the deploy from a clean checkout.
- A reviewer can follow the packet to a running stack without tribal knowledge.
- Missing Jira-169 and Jira-181 inputs remain called out with `TODO: Depending on
  Jira-XXX` comments instead of being implied as complete.
- The ZAP release gate fails closed for malformed reports and scans the Terraform-backed
  deployed SPA URL instead of a hardcoded hostname.
- One release manifest artifact ties the release SHA, commit checks page, Actions run,
  deployed SPA URL, immutable image digests, and uploaded artifact names together.

**Code Connection:**

- `docs/release-evidence-packet.md`
- `.github/scripts/enforce-zap-high-severity.mjs`
- `.github/workflows/container-scan-sbom.yml`
- `.github/workflows/zap-baseline.yml`
- `tests/typescript/workflows/zapBaselineSecurityGate.test.ts`
- `docs/stride-threat-model.md`
- `docs/trivy-suppressions.md`
- `README.md`
- `deployment/ecs/README.md`
- `deployment/spa/README.md`
- `terraform/README.md`

**Project Scope Connection:**

- Hardening, Evidence & Final Demo
- Release-readiness documentation
- Release security gate correctness
- CI, scan, SBOM, deployment, and evidence traceability

**Changed Files:**

- `.github/scripts/enforce-zap-high-severity.mjs`
- `.github/workflows/container-scan-sbom.yml`
- `docs/release-evidence-packet.md`
- `planning/team/cl-ticket-journal.md`
- `tests/typescript/workflows/zapBaselineSecurityGate.test.ts`

**Validation Notes:**

- `development` was already an ancestor of `caleb-latimer-jira189`, so no merge was
  required before implementation.
- The ZAP gate tests were expanded to cover malformed roots, invalid site/alert
  containers, invalid risk codes, valid empty alerts, and valid informational/low/
  medium reports.
- The release workflow test now verifies Terraform-backed `spa_url` resolution, the
  absence of a hardcoded CloudFront hostname, pre-ZAP invalid output checks, and the
  release evidence manifest contents.
- Local validation still depends on the repository Node/Python environments and any
  available workflow linters in this shell; see the implementation report for the exact
  commands and outcomes.

## caleb-latimer-jira171 - SCRUM-171

**Branch:** `caleb-latimer-jira171`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-171

**Summary:** Complete the disposition log template and the shared observability path it references

**Description:** As a Platform Engineer, I want a disposition log template and the
supporting observability plumbing, so that triaged issues can be tied back to a real
metric and trace boundary. This branch now combines the SCRUM-170 telemetry updates
with the SCRUM-171 planning artifact.

**Acceptance Criteria:**

- A reusable markdown disposition template exists under `planning/`.
- The template defines the log fields, evidence-link format, root-cause format, and
  action format.
- The template includes one synthetic completed entry that references the TaxPulse
  observability shape.
- The shared runtime now emits request IDs, trace context, and EMF-shaped metrics for
  the scenario-modeling path.
- The sandbox ECS task definitions include the ADOT collector sidecars and X-Ray
  permissions needed to validate the evidence path.

**Code Connection:**

- `src/typescript/shared/cloud-logger/observability.ts`
- `src/typescript/shared/cloud-logger/logger.ts`
- `src/typescript/app.ts`
- `src/typescript/features/taxPlanCycle/routes.ts`
- `src/typescript/features/taxPlanCycle/controllers/scenarios.ts`
- `src/typescript/features/taxPlanCycle/infrastructure/engineClient.ts`
- `src/tax_liability_engine/app.py`
- `src/tax_liability_engine/observability.py`
- `terraform/modules/ecs_services/main.tf`
- `terraform/modules/ecs_services/variables.tf`
- `terraform/modules/ecs_services/outputs.tf`
- `terraform/delivery.tf`
- `planning/scrum-171-disposition-log-template.md`
- `tests/typescript/shared/cloud-logger.test.ts`
- `tests/typescript/features/taxPlanCycle/engineClient.test.ts`
- `tests/typescript/features/taxPlanCycle/engineClient.pact.test.ts`
- `tests/typescript/features/taxPlanCycle/routes.test.ts`
- `tests/typescript/ecsTaskDefinitions.test.ts`
- `tests/typescript/workflows/terraformDeliveryModules.test.ts`
- `tests/tax_liability_engine/tax_calculation_api_test.py`
- `planning/team/cl-ticket-journal.md`

**Project Scope Connection:**

- IaC, Secure Pipeline & Observability
- Cross-service scenario-modeling telemetry
- Triage evidence and release-readiness documentation
- Sandbox validation evidence for SCRUM-170 and SCRUM-171

**Changed Files:**

- `planning/scrum-171-disposition-log-template.md`
- `planning/team/cl-ticket-journal.md`
- `src/typescript/app.ts`
- `src/typescript/features/taxPlanCycle/controllers/scenarios.ts`
- `src/typescript/features/taxPlanCycle/infrastructure/engineClient.ts`
- `src/typescript/features/taxPlanCycle/routes.ts`
- `src/typescript/shared/cloud-logger/logger.ts`
- `src/typescript/shared/cloud-logger/observability.ts`
- `src/tax_liability_engine/app.py`
- `src/tax_liability_engine/observability.py`
- `terraform/delivery.tf`
- `terraform/modules/ecs_services/README.md`
- `terraform/modules/ecs_services/main.tf`
- `terraform/modules/ecs_services/outputs.tf`
- `terraform/modules/ecs_services/variables.tf`
- `terraform/variables.tf`
- `deployment/ecs/core-case-service.task-definition.json`
- `deployment/ecs/tax-engine.task-definition.json`
- `pacts/CoreCaseService-TaxCalculationEngine.json`
- `tests/tax_liability_engine/tax_calculation_api_test.py`
- `tests/typescript/ecsTaskDefinitions.test.ts`
- `tests/typescript/features/taxPlanCycle/engineClient.pact.test.ts`
- `tests/typescript/features/taxPlanCycle/engineClient.test.ts`
- `tests/typescript/features/taxPlanCycle/routes.test.ts`
- `tests/typescript/httpApp.test.ts`
- `tests/typescript/shared/cloud-logger.test.ts`
- `tests/typescript/workflows/terraformDeliveryModules.test.ts`

**Validation Notes:**

- The planning artifact was rewritten into a fielded template with a synthetic sample
  entry and explicit CloudWatch/X-Ray coordinate guidance.
- Focused Vitest coverage passed for the touched TypeScript files.
- `terraform fmt -check -recursive` passed after formatting `terraform/delivery.tf`.
- `py_compile` passed for the new Python observability module, but `pytest` is blocked
  in this shell because the Python dependency environment is incomplete (`jwt` is
  missing).
- `terraform validate` is still blocked until the local modules are initialized, and
  `terraform init -backend=false` could not reach the Terraform registry from this
  shell.
- `npm run typecheck` still reports the preexisting `src/typescript/assist/embeddings.ts`
  OpenAI dependency issue.
- No live AWS evidence was captured from the sandbox in this shell.

## caleb-latimer-jira170 - SCRUM-170

**Branch:** `caleb-latimer-jira170`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-170

**Summary:** Emit CloudWatch metrics and X-Ray traces across services

**Description:** As a Platform Engineer, I want CloudWatch metrics and X-Ray traces, so
that I can observe the deployed stack. This branch now carries the Core Case request
correlation, Tax Engine observability middleware, EMF metric emission, and the ECS
delivery changes needed for the sandbox evidence path.

**Acceptance Criteria:**

- Services emit structured observability records that include request IDs, trace IDs,
  span IDs, and full traceparent values.
- Scenario modeling emits valid CloudWatch EMF data with `TaxPulse` namespace metrics
  and low-cardinality dimensions.
- Outbound Tax Engine requests propagate trace context and request IDs through retries
  without logging authorization headers or response bodies.
- ECS task definitions include the ADOT collector sidecars, OTLP env vars, and X-Ray
  task-role permissions required for sandbox validation.
- No stage, audit, or domain behavior changes are introduced.

**Code Connection:**

- `src/typescript/shared/cloud-logger/observability.ts`
- `src/typescript/shared/cloud-logger/logger.ts`
- `src/typescript/app.ts`
- `src/typescript/features/taxPlanCycle/routes.ts`
- `src/typescript/features/taxPlanCycle/controllers/scenarios.ts`
- `src/typescript/features/taxPlanCycle/infrastructure/engineClient.ts`
- `src/tax_liability_engine/app.py`
- `src/tax_liability_engine/observability.py`
- `terraform/modules/ecs_services/main.tf`
- `terraform/modules/ecs_services/variables.tf`
- `terraform/modules/ecs_services/outputs.tf`
- `terraform/delivery.tf`
- `deployment/ecs/core-case-service.task-definition.json`
- `deployment/ecs/tax-engine.task-definition.json`

**Project Scope Connection:**

- IaC, Secure Pipeline & Observability
- Cross-service request tracing and CloudWatch-ready structured telemetry
- Sandbox validation for the Tax Plan Cycle scenario-modeling path

**Changed Files:**

- `src/typescript/app.ts`
- `src/typescript/features/taxPlanCycle/controllers/scenarios.ts`
- `src/typescript/features/taxPlanCycle/infrastructure/engineClient.ts`
- `src/typescript/features/taxPlanCycle/routes.ts`
- `src/typescript/shared/cloud-logger/logger.ts`
- `src/typescript/shared/cloud-logger/observability.ts`
- `src/tax_liability_engine/app.py`
- `src/tax_liability_engine/observability.py`
- `terraform/delivery.tf`
- `terraform/modules/ecs_services/README.md`
- `terraform/modules/ecs_services/main.tf`
- `terraform/modules/ecs_services/outputs.tf`
- `terraform/modules/ecs_services/variables.tf`
- `terraform/variables.tf`
- `deployment/ecs/core-case-service.task-definition.json`
- `deployment/ecs/tax-engine.task-definition.json`
- `pacts/CoreCaseService-TaxCalculationEngine.json`
- `planning/scrum-171-disposition-log-template.md`
- `planning/team/cl-ticket-journal.md`
- `tests/tax_liability_engine/tax_calculation_api_test.py`
- `tests/typescript/ecsTaskDefinitions.test.ts`
- `tests/typescript/features/taxPlanCycle/engineClient.pact.test.ts`
- `tests/typescript/features/taxPlanCycle/engineClient.test.ts`
- `tests/typescript/features/taxPlanCycle/routes.test.ts`
- `tests/typescript/httpApp.test.ts`
- `tests/typescript/shared/cloud-logger.test.ts`
- `tests/typescript/workflows/terraformDeliveryModules.test.ts`

**Validation Notes:**

- The runtime work is now wired for correlation and EMF, but the branch still needs the
  remaining Python dependency installation and full Terraform provider validation
  outside this shell.
- The earlier "tests suspended" note is no longer accurate.
- Focused Vitest coverage passed for the touched TypeScript files.
- `terraform fmt -check -recursive` passed after formatting `terraform/delivery.tf`.
- `py_compile` passed for the new Python observability module, but `pytest` is blocked
  in this shell because the Python dependency environment is incomplete (`jwt` is
  missing).
- `terraform validate` is still blocked until the local modules are initialized, and
  `terraform init -backend=false` could not reach the Terraform registry from this
  shell.
- `npm run typecheck` still reports the preexisting `src/typescript/assist/embeddings.ts`
  OpenAI dependency issue.
- No live AWS trace or metric permalink was captured from the sandbox in this shell.

## caleb-latimer-jira166 - SCRUM-166

**Branch:** `caleb-latimer-jira166`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-166

**Summary:** Add the OSV and Gitleaks gate

**Description:** As a Security Engineer, I want OSV and Gitleaks on every PR, so that
vulnerable dependencies and committed secrets are blocked.

**Acceptance Criteria:**

- OSV flags a known-vulnerable dependency and fails the PR.
- Gitleaks blocks a committed secret.
- Checkov runs as its own Terraform security step and fails on a high-severity finding.
- tfsec runs as its own Terraform security step and fails on a high-severity finding.
- Confirm whether an org-level `GITLEAKS_LICENSE` secret already exists and should be
  preferred over the repo-level secret before merging.
- All four checks run automatically on the pull request path.

**Code Connection:**

- `.github/workflows/dependency-security-gate.yml` adds the PR-time OSV and Gitleaks
  gate on the same Blacksmith runner pattern used by SCRUM-165.
- `.github/pull_request_template.md` now calls out mocked or stubbed infrastructure
  boundaries plus scan suppressions and exceptions in the Risk Notes section.
- `planning/ai-review-checklist.md` now asks reviewers to verify that mocked or stubbed
  boundaries and any scan suppressions or exceptions are surfaced in Risk Notes.
- `GITLEAKS_LICENSE` must be populated as a GitHub Secret for the org-owned repository
  or the Gitleaks action fails before scanning starts.
- `terraform/vpc.tf`, `terraform/database.tf`, and `terraform/redis.tf` already carry
  the seeded infrastructure stance that later tickets will need to revisit: public
  subnet auto-IP is intentionally explicit, and the ECS task security-group references
  still describe a future compute layer rather than a live one.

**Project Scope Connection:**

- IaC, Secure Pipeline & Observability
- PR-time dependency and secret scanning before merge
- Supply-chain and secret detection on the repository's merge path
- Stubbed platform plumbing until ECS, load balancer, and container delivery exist
- Gitleaks license validation for the organization-owned repo

**Changed Files:**

- `.github/pull_request_template.md`
- `.github/workflows/dependency-security-gate.yml`
- `planning/ai-review-checklist.md`
- `planning/team/cl-ticket-journal.md`
- `tests/typescript/workflows/dependencySecurityGate.test.ts`

**Validation Notes:**

- Repository-local workflow coverage was added for the new dependency and secret gate.
- The journal records the existing Terraform stub/suppression posture so the future PR
  checklist can carry it forward as risk notes.
- The Gitleaks action now expects the `GITLEAKS_LICENSE` secret to be configured in
  GitHub before the workflow can succeed in an organization-owned repo.
- No runtime validation was run against the new workflow in this shell.

## caleb-latimer-jira163 - SCRUM-163

**Branch:** `caleb-latimer-jira163`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-163

**Summary:** Gate Terraform with Checkov and tfsec

**Description:** As a Security Engineer, I want Checkov and tfsec scanning the Terraform, so that misconfigurations are caught before apply.

**Acceptance Criteria:**

- Checkov and tfsec run in CI against the Terraform root.
- The gate fails on a high-severity misconfiguration.
- Documented suppressions require a justification comment.
- The workflow runs on a Blacksmith-backed GitHub Actions runner.

**Code Connection:**

- `.github/workflows/terraform-security-gate.yml` adds the PR-time Terraform gate on the Blacksmith runner and runs `terraform fmt`, `terraform init -backend=false`, `terraform validate`, Checkov, and tfsec.
- `.github/workflows/container-build-scaffold.yml` keeps the Blacksmith Docker builder helpers on deck for the future container delivery work without changing the Terraform gate.
- `terraform/database.tf`, `terraform/dynamodb.tf`, and `terraform/redis.tf` now tighten the security posture that the scanners were flagging.
- `terraform/vpc.tf` keeps the intentional public-subnet behavior in the current Terraform root without inline scanner suppressions.
- `terraform/.tfsec/config.yml` makes the tfsec severity threshold explicit in repo config.
- `tests/typescript/workflows/terraformSecurityGate.test.ts` guards the workflow shape and scan requirements with a repo-local regression test.
- `tests/typescript/workflows/containerBuildScaffold.test.ts` guards the future container scaffold text and helper references.
- `adr/0033-terraform-security-gate-on-blacksmith-runners.md` records the deployment boundary and visual flow for the gate.

**Architecture Diagram:**

```mermaid
flowchart LR
  PR[Pull request updates terraform/]
  WF[GitHub Actions workflow]
  BS[Blacksmith runner]
  TF[Terraform checks<br/>fmt / init -backend=false / validate]
  CK[Checkov<br/>hard fail on HIGH]
  TS[tfsec<br/>minimum severity HIGH]
  PASS[Required status check passes]
  FAIL[Fail the gate]
  BR[Branch protection / merge policy]

  PR --> WF --> BS --> TF --> CK --> TS --> PASS --> BR
  CK -->|high-severity finding| FAIL
  TS -->|high-severity finding| FAIL
```

**Project Scope Connection:**

- IaC, Secure Pipeline & Observability
- Terraform provisioning safety for the seeded SCRUM-162 infrastructure
- PR-time security scanning before any future apply path

**Changed Files:**

- `.github/workflows/terraform-security-gate.yml`
- `.github/workflows/container-build-scaffold.yml`
- `adr/0033-terraform-security-gate-on-blacksmith-runners.md`
- `adr/README.md`
- `terraform/.tfsec/config.yml`
- `tests/typescript/workflows/terraformSecurityGate.test.ts`
- `tests/typescript/workflows/containerBuildScaffold.test.ts`
- `planning/team/cl-ticket-journal.md`

**Validation Notes:**

- Repository-local workflow assertions cover the Blacksmith runner label, Terraform trigger scope, required scan commands, and removal of the legacy VPC suppressions.
- tfsec now runs from `/src/terraform`, matching the Terraform root used by formatting, initialization, validation, and Checkov.
- No AWS credentials are required for the static gate path.
- GitHub branch protection and required status checks still need to be configured in the repository settings.

## caleb-latimer-jira184 - SCRUM-184

**Branch:** `caleb-latimer-jira184`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-184

**Summary:** Add the AI-Assist drawer to Plan Cycle Detail

**Description:** Implement the AI-Assist drawer experience on Plan Cycle Detail, with a
shell-level floating action button, a slide-in assistant panel, and a temporary
feature-slice `/tax-plan-cycles/:caseId/assist` endpoint that accepts an empty request body and returns the
current stub response path.

**Acceptance Criteria:**

- The Pulse UI shows an AI-Assist FAB on Plan Cycle Detail that opens a slide-in drawer.
- The drawer renders a top toolbar, a message log area, and a modern AI-style input row.
- The drawer shows a themed loader while the assistant request is in flight.
- The UI posts an empty `{}` body to `/v1/tax-plan-cycles/:caseId/assist`.
- The tax-plan-cycle feature slice exposes a typed case-scoped assistant endpoint stub.

**Code Connection:**

- Added app-shell assistant state and drawer wiring so the assistant overlays routed views
  instead of living inside the detail page.
- Added `AssistFAB`, `AssistantDrawer`, and `AssitantLoader` components under
  `src/pulseUI/components/assist/` plus the assistant panel state hook.
- Added a `taxPlanDetailsAssistant` client helper for the empty-body POST flow.
- Added a feature-slice assistant controller and case-scoped `/tax-plan-cycles/:caseId/assist` route stub in
  `src/typescript/features/taxPlanCycle/`.
- Updated Plan Cycle Detail to register the current case context with the assistant
  shell.

**Project Scope Connection:**

- Extends the Plan Cycle Detail experience with a reusable RAG-assistant shell surface.
- Keeps the first pass focused on UI orchestration and the backend stub contract rather
  than the full assist pipeline.
- Preserves the existing Plan Cycle Detail route, stage workflow, and audit history flow.

**Changed Files:**

- `src/pulseUI/components/AppShell.tsx`
- `src/pulseUI/components/assist/AssistantDrawer.tsx`
- `src/pulseUI/components/assist/AssistantDrawer.module.css`
- `src/pulseUI/components/assist/AssistFAB.tsx`
- `src/pulseUI/components/assist/AssistFAB.module.css`
- `src/pulseUI/components/assist/AssitantLoader.tsx`
- `src/pulseUI/components/assist/AssitantLoader.module.css`
- `src/pulseUI/components/assist/assistantPanel.tsx`
- `src/pulseUI/entities/taxPlanDetailsAssistant.ts`
- `src/pulseUI/pages/taxPlanCycle/Details.tsx`
- `src/typescript/features/taxPlanCycle/controllers/assistantController.ts`
- `src/typescript/features/taxPlanCycle/index.ts`
- `src/typescript/features/taxPlanCycle/routes.ts`

**Validation Notes:**

- Logic-only implementation pass completed.
- Feedback Loop I UI and API refinement completed.
- `npm run typecheck` passed for application, tests, and Pulse UI.
- Focused Pulse UI assist tests passed: 6 tests across 2 files.
- Focused Core Case Service assistant route tests passed: 3 tests; the remaining route
  tests were skipped by the assistant name filter.
- `npm run build` passed for the Pulse UI production bundle.

**Feedback Loop I Changes:**

- Added CSS-module-first tooltip primitives and four-button drawer controls with
  fullscreen, new-dialogue, prompt-toast, and close behavior.
- Moved the FAB to the right-side Quick Actions anchor with a fixed fallback, corrected
  its primary color, clipped shimmer, and single vertical pitch animation.
- Reduced drawer transitions to 250ms open and 200ms close, updated case metadata,
  moved Send into the composer, and added Enter submission behavior.
- Migrated the assistant request to TanStack Query and changed the backend route to
  `/v1/tax-plan-cycles/:caseId/assist` with the `hello Tax Pulse v2` 418 stub response.

**Feedback Loop II Changes:**

- Moved FAB fixed/anchored positioning to the parent tooltip boundary so the tooltip
  shares the visible button coordinate system in both scroll states.
- Changed the FAB open animation to a Y-axis flip, and slide the full FAB boundary below
  the viewport with disabled pointer, keyboard, and assistive-technology access while
  the drawer is open.
- Removed the hidden attribute from the Plan Cycle Detail FAB anchor so the portaled FAB
  remains accessible before the drawer opens.
- Restored pointer events on the open drawer above the backdrop so toolbar, message, and
  composer interactions no longer click through and close the assistant.
- API contract intentionally unchanged for Feedback Loop II.

**Feedback Loop II Validation Notes:**

- `npm.cmd --prefix src/pulseUI run typecheck` passed.
- Focused Pulse UI assistant tests passed: 15 tests across 3 files.
- `npm.cmd --prefix src/pulseUI run build` passed; Vite reported the existing chunk-size warning.

**Feedback Loop III Changes:**

- Reworked the shared tooltip primitive to use explicit hover, focus, and dismiss state instead of
  `:focus-within`, and connected tooltips to their controls with `aria-describedby`.
- Turned the assistant drawer into a modal dialog with focus trapping, Escape-to-close behavior,
  closed-state inerting, backdrop presentation, and focus restoration back to the FAB.
- Reset drawer fullscreen state on every close path and split the composer into an explicit label,
  textarea, and bottom-right send control wrapper.
- Added responsive and reduced-motion refinements for the drawer, FAB tooltip, and loader so the
  assistant surface behaves better on narrow and short viewports.
- Added `test.todo` placeholders for the assistant UI, API route, and axe coverage that will be
  implemented in the next pass.

**Feedback Loop III Validation Notes:**

- `npm.cmd --prefix src/pulseUI run typecheck` passed.
- Focused Pulse UI assistant tests passed: 18 passing, 6 `test.todo` placeholders across 3 files.
- `npm.cmd --prefix src/pulseUI run build` passed; Vite reported the existing chunk-size warning.
- `npm.cmd test -- tests/typescript/features/taxPlanCycle/routes.test.ts` was attempted, but the
  existing route bootstrap failed before execution because the RS256 issuer configuration was not
  available in this environment.

**Test Coverage Pass Changes:**

- Replaced SCRUM-184 `test.todo` placeholders with focused assistant coverage for `AssistFAB`,
  `AssistantDrawer`, `Tooltips`, `AssitantLoader`, the `taxPlanDetailsAssistant` client helper,
  and the Pulse UI axe accessibility gate.
- Added FAB tooltip regression coverage for the post-click stale-tooltip behavior and focus restore
  path after the drawer closes.
- Added Core Case Service assistant controller coverage for the strict empty-body schema and
  temporary `Hello TaxPulse v2` stub response.
- Expanded tax-plan-cycle route coverage for `/v1/tax-plan-cycles/:caseId/assist`, including
  successful controller wiring, strict `{}` body validation, invalid case ID handling,
  missing tenant/user auth context, and client-role rejection.
- Updated the route test harness to decode generated bootstrap JWT claims locally for route-unit
  tests, keeping real RS256/JWKS verification in the dedicated JWT protected route suites.
- Added RS256 issuer configuration to the bootstrap auth helper so test token generation stays
  aligned with the current JWT service contract.
- Added a reusable RS256/JWKS test fixture for protected route and main composition tests that
  need real JWT verification without depending on an external JWKS host.
- Updated the SignIn page test harness to include `QueryClientProvider`, matching the production
  app bootstrap now that the authenticated shell mounts the assistant query mutation provider.

**Test Coverage Pass Changed Files:**

- `src/pulseUI/components/assist/AssistantDrawer.tsx`
- `src/pulseUI/components/assist/AssistFAB.tsx`
- `src/pulseUI/tests/accessibility/axeGate.test.tsx`
- `src/pulseUI/tests/assist/AssitantLoader.test.tsx`
- `src/pulseUI/tests/assist/AssistFAB.test.tsx`
- `src/pulseUI/tests/assist/AssistantDrawer.test.tsx`
- `src/pulseUI/tests/assist/Tooltips.test.tsx`
- `src/pulseUI/tests/assist/taxPlanDetailsAssistant.test.ts`
- `src/pulseUI/tests/auth/SignInPage.test.tsx`
- `tests/typescript/bootstrap/jwtTestUtils.ts`
- `tests/typescript/bootstrap/authFlow.ts`
- `tests/typescript/features/taxPlanCycle/assistantController.test.ts`
- `tests/typescript/features/taxPlanCycle/jwtProtectedRoutes.test.ts`
- `tests/typescript/features/taxPlanCycle/mainComposition.test.ts`
- `tests/typescript/features/taxPlanCycle/routes.test.ts`

**Test Coverage Pass Validation Notes:**

- `npm.cmd --prefix src/pulseUI test -- tests/assist/AssistFAB.test.tsx tests/assist/AssistantDrawer.test.tsx tests/assist/Tooltips.test.tsx tests/assist/AssitantLoader.test.tsx tests/assist/taxPlanDetailsAssistant.test.ts tests/accessibility/axeGate.test.tsx`
  passed: 37 tests across 6 files. Axe emitted jsdom pseudo-element `getComputedStyle` warnings,
  but all tested assistant states passed with zero reported violations.
- `npm.cmd --prefix src/pulseUI run typecheck` passed.
- `npm.cmd --prefix src/pulseUI run build` passed; Vite reported the existing chunk-size warning.
- `npm.cmd --prefix src/pulseUI run test` passed: 236 tests across 47 files. The run still emits
  expected jsdom warnings for unimplemented scroll, canvas, and pseudo-element APIs.
- `npm.cmd run test:vitest -- tests/typescript/features/taxPlanCycle/assistantController.test.ts tests/typescript/features/taxPlanCycle/routes.test.ts`
  passed: 27 tests across 2 files. The existing scenario-modeling failure-path test logged the
  expected local tax-engine `ECONNREFUSED 127.0.0.1:8000` error while asserting the 502 behavior.
- `npm.cmd run test:vitest -- tests/typescript/features/taxPlanCycle/jwtProtectedRoutes.test.ts tests/typescript/features/taxPlanCycle/mainComposition.test.ts`
  passed: 10 tests across 2 files.
- `npm.cmd run typecheck` passed for app, tests, and Pulse UI.
- `npm.cmd test` and a full root `npm.cmd run test:vitest -- --reporter=dot` were attempted. The
  first timed out and hit reporter `EPIPE`; the second still reported failures in docker-backed
  database/integration suites, which are outside this SCRUM-184 test pass per the instruction to
  ignore docker-based runtime failures.

**Merge Feedback Test Fix:**

- Fixed the post-merge Tax Plan Cycle integration fixture so login/MFA access tokens and protected
  transition routes share the same RS256 signing key and local JWKS endpoint.
- Preserved real JWT verification and the end-to-end login/MFA flow instead of bypassing auth in
  the integration suite.
- Updated `tests/typescript/bootstrap/authFlow.ts` and
  `tests/typescript/features/taxPlanCycle/integration.test.ts`.
- `npm.cmd --prefix src/pulseUI run test -- --reporter=dot` passed: 236 tests across 47 files.
- `npm.cmd run typecheck` passed for app, tests, and Pulse UI.
- Focused Tax Plan Cycle integration validation passed: four PATCH authorization/transition tests
  and the Brianna login/MFA bearer-auth flow.
- The complete root Vitest run passed 392 of 416 tests before the fixture fix. The five genuine JWT
  failures from that run now pass in focused reruns. The remaining 19 failures are excluded Docker
  and PostgreSQL environment failures: container port binding, database timeouts, or a PostgreSQL
  image without the `vector` extension.

**Pgvector Testcontainers Follow-up:**

- Corrected `.env.example` so `DOCKER_POSTGRES_IMAGE` uses `pgvector/pgvector:pg18` instead of a
  plain PostgreSQL image that cannot run migration `0018_mute_lila_cheney.sql`.
- Added an early pgvector capability check to the shared Testcontainers bootstrap. A custom image
  without the `vector` extension now fails with a direct configuration message before seeding.
- Moved `withDrizzleTestSchema` from the ambient `DATABASE_URL` database to one lazily shared
  pgvector Testcontainer per Vitest file, with teardown in `afterAll`.
- Updated `.env.example`, `tests/typescript/bootstrap/dockerPostgres.ts`, and
  `tests/typescript/bootstrap/migrationTestUtils.ts`.
- `npm.cmd run test:integration -- tests/typescript/assist/embeddings.integration.test.ts --reporter=dot`
  passed, validating migration, seed, HNSW index creation, and pgvector similarity retrieval.
- The deductions repository/routes and tenant login resolver suites passed together: 11 tests
  across 3 files.
- `npm.cmd run typecheck` passed for app, tests, and Pulse UI.
- The complete CaseService Vitest run passed 405 of 416 tests. Its only 11 failures were 60-second
  Docker/database contention timeouts, which remain excluded under the ticket validation scope;
  no pgvector, seed, JWT, assertion, or other deterministic failures remained.

**RAG API Integration Pass:**

- Connected the existing drawer mutation to the merged RAG request contract. Opening the drawer
  now sends recommendation context without a fabricated question, while follow-up prompts send the
  same recommendation plus the trimmed advisor question.
- Extended Plan Cycle Detail mapping with optional taxpayer identifier validation and derived the
  page-scoped recommendation from stage, owner, priority, verified taxpayer name, and provider.
  Missing or blank values use the required `...` placeholder, and route cleanup clears the context.
- Added shared 2,000-character question validation with whitespace and unsupported-control-character
  rejection. The composer exposes validation through `aria-invalid` and `aria-describedby`.
- Replaced duplicate banner and transcript failures with one structured error message. Problem
  Details title/code and message/detail fields are handled consistently across assistant failures.
- Preserved successful explanation and citation rendering, request sequencing, authenticated-fetch
  refresh behavior, responsive drawer behavior, and existing dialog accessibility.

**RAG API Integration Changed Files:**

- `src/pulseUI/components/AppShell.tsx`
- `src/pulseUI/components/assist/AssistantDrawer.tsx`
- `src/pulseUI/components/assist/AssistantDrawer.module.css`
- `src/pulseUI/components/assist/assistantPanel.tsx`
- `src/pulseUI/entities/taxPlanCycleQueries.ts`
- `src/pulseUI/entities/taxPlanDetailsAssistant.ts`
- `src/pulseUI/pages/taxPlanCycle/Details.tsx`
- `src/pulseUI/tests/accessibility/axeGate.test.tsx`
- `src/pulseUI/tests/assist/AssistantDrawer.test.tsx`
- `src/pulseUI/tests/assist/assistantPanel.test.tsx`
- `src/pulseUI/tests/assist/taxPlanDetailsAssistant.test.ts`
- `src/pulseUI/tests/taxPlanCycle/Details.test.tsx`
- `src/pulseUI/tests/taxPlanCycle/queries.test.ts`
- `planning/team/cl-ticket-journal.md`

**RAG API Integration Validation Notes:**

- `npm.cmd --prefix src/pulseUI run typecheck` passed.
- Focused assistant, details, query-mapping, and axe validation passed: 58 tests across 6 files.
- `npm.cmd --prefix src/pulseUI run test` passed: 253 tests across 48 files.
- `npm.cmd --prefix src/pulseUI run build` passed; Vite reported the existing chunk-size warning.
- The backend route and schema were not changed in this pass.

**Assistant Toolbar Refinement:**

- Removed the prompt-suggestions placeholder action and its toast behavior.
- Right-aligned the remaining expand/collapse, new-dialogue, and close controls in a compact
  three-button toolbar while preserving 44px pointer targets and accessible tooltips.
- Updated the loading skeleton to mirror the same three-button count, right alignment, square
  dimensions, spacing, and corner radius as the live toolbar.
- Hardened drawer and loader accessibility with atomic polite loading announcements, labeled
  conversation logs, toggle pressed-state semantics, hidden decorative skeletons, and retained
  focus, keyboard, tooltip, and reduced-motion behavior.
- Hardened responsive reflow with bounded resize widths, wrapping metadata and messages, fullscreen
  safe-area padding, compact short-viewport layouts, dynamic loader sizing, and matching 44px
  live/loading controls.
- Replaced the three-row responsive case-stage grid with a single keyboard-focusable horizontal
  progression below 1100px, eliminating the roughly 340px case-header expansion while keeping all
  seven backend stages available through native scrolling and scroll snapping.
- Corrected the actual desktop Case tabs height regression by preventing the main detail column and
  its tab row from stretching to match the taller Case Properties and Quick Actions sidebar.

**Final Pipeline Safety Validation:**

- `npm.cmd --prefix src/pulseUI run verify` passed: Pulse UI typecheck, 255 tests across 48 files,
  6 dedicated axe tests, and the production build. Vite reported only the existing chunk-size
  advisory.
- `npm.cmd run typecheck:core` and `npm.cmd run build` passed for Core Case Service.
- Core Case Service passed 469 tests across 107 files when run with one worker. The parallel run's
  11 failures were all exact 60-second Testcontainers/database timeouts; the same contracts passed
  serially without code changes.
- `py -3.12 -m uv run --no-sync ruff format --check src tests` reported all 42 Python files already
  formatted, and `ruff check src tests` passed.
- Locked-environment Pyright validation passed with 0 errors and 0 warnings.
- `git diff --check` passed before the final journal update.

**CI Security Gate Follow-up:**

- Reviewed the Core TypeScript, Required Gate, and Gitleaks logs from the prior PR merge SHA.
- Confirmed the five Core TypeScript failures were the JWT integration fixture failures corrected
  in commit `4d19477`; Required Gate requires no independent change because it only reflected the
  failed Core TypeScript dependency.
- Added `.gitleaksignore` entries for the two exact historical false-positive fingerprints: the
  synthetic idempotency key in `mainComposition.test.ts` and the placeholder PEM example formerly
  in `.env.example`. All scanner rules remain enabled for every other finding.
- Local Gitleaks execution was unavailable because the binary is not installed; the exact
  fingerprints were copied from the CI scan output for validation on the next workflow run.

**Trivy Runtime Image Follow-up:**

- Reproduced the Core Case container gate with Trivy 0.70.0 and identified the unsuppressed finding
  as HIGH-severity `CVE-2026-9496` in `pacote@17.0.6`, bundled with the base image's global npm.
- Removed npm and npx only from the Core Case runtime stage. The build stage retains npm for locked
  dependency installation, TypeScript compilation, and production dependency pruning.
- Added a container workflow regression test that requires the package-manager removal to happen
  before the runtime switches to the non-root `node` user and preserves direct `node` startup.
- The focused container workflow suite passed: 4 tests in 1 file.
- `npm.cmd run typecheck:core` passed.
- The rebuilt runtime retained Node.js 22.0.0 while confirming npm and npx were absent.
- A socketless Trivy 0.70.0 image-tar scan passed with 0 unsuppressed HIGH/CRITICAL findings; no
  vulnerability suppression was added.

## caleb-latimer-jira160 - SCRUM-160

**Branch:** `caleb-latimer-jira160`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-160

**Summary:** Refactor present-to-client and execute stubs to Lambda + API Gateway

**Description:** Implement SCRUM-160 as a full AWS deployment refactor for the present-to-client and execute transitions, with a new ADR at index 30 and SCRUM-138 already merged into the branch before implementation starts. SCRUM-138 is the behavioral dependency for the compensating present-to-client saga and event contract, while SCRUM-156 is only a local emulation dependency that should not shape the AWS delivery path.

**Acceptance Criteria:**

- The present-to-client and execute transitions run behind AWS Lambda handlers and API Gateway routes.
- The AWS deployment path includes the required runtime config, IAM permissions, and event-publishing wiring.
- The new ADR at index 30 records the Lambda + API Gateway architecture decision.
- Lambda is the command boundary only; the Tax Plan Cycle feature slice retains transition rules, audit writes, stage-changed emission, and present-to-client compensation.
- SCRUM-138 supplies the saga and event semantics that the Lambda path must preserve.
- SCRUM-156 is not a production prerequisite; if any legacy code still depends on it, it is scaffolded only and marked with `TODO: Implmentation needs Jira 156`.
- The code compiles and the relevant tests pass with the SCRUM-138 behavior already present.

**Code Connection:**

- `src/typescript/shared/scripts/present-to-client-lambda/runtime.ts` now composes the present-to-client Lambda around the shared transition controller, a mutable in-memory repository, and the real SNS publishers.
- `src/typescript/shared/scripts/execute-lambda/runtime.ts` now composes the execute Lambda around the shared transition controller and the real stage-changed SNS publisher.
- `src/typescript/shared/scripts/taxPlanCycleLambdaRuntime.ts` holds the Lambda-local mutable repository and no-op audit writer used by both bundles.
- `src/typescript/shared/scripts/present-to-client-lambda/index.ts` and `src/typescript/shared/scripts/execute-lambda/index.ts` remain the thin API Gateway proxy adapters for the two routes.
- `scripts/build-present-to-client-lambda.mjs` and `scripts/build-execute-lambda.mjs` build the deployable `dist/present-to-client-lambda/index.js` and `dist/execute-lambda/index.js` bundles.
- `src/typescript/features/taxPlanCycle/infrastructure/cloudEvents/actionItemCreated/SnsPublisher.ts` now handles FIFO topic publish requirements by supplying `MessageGroupId` and `MessageDeduplicationId` when the action-item topic ARN ends with `.fifo`.
- `src/typescript/shared/scripts/present-to-client-lambda/runtime.ts`, `src/typescript/features/taxPlanCycle/controllers/transitionController.ts`, and `src/typescript/features/taxPlanCycle/infrastructure/cloudEvents/presentToClientSaga/PresentToClientSaga.ts` now emit explicit telemetry markers for the Lambda entrypoint, stage-changed publish, and action-item publish boundaries.
- `src/typescript/soap.d.ts` plus `tests/typescript/bootstrap/testSetup.ts` keep the shared root exports loadable in Vitest by mocking the absent SOAP package.
- `src/typescript/features/taxPlanCycle/infrastructure/tinEinValidationSoapClient.ts` and `tests/typescript/features/taxPlanCycle/tinEinValidationSoapClient.test.ts` were adjusted so the typecheck and test harness accept the local SOAP shim.
- `adr/0030-lambda-api-gateway-integration.md` now matches the Lambda boundary and event-focused AWS cutover.
- `src/typescript/shared/scripts/cloudTap.ts` keeps the action-item and stage-changed cloud tap paths aligned with the current repository contract.

**Project Scope Connection:**

- Event-Driven Workflow & Legacy Integration
- Serverless deployment cutover for the Tax Plan Cycle workflow
- Preserves the SCRUM-138 transition behavior while moving the delivery path into AWS infrastructure
- Keeps SCRUM-156 out of the AWS path unless a temporary scaffold is still required for a leftover local-only code path

  **Changed Files:**

- `adr/0030-lambda-api-gateway-integration.md`
- `package.json`
- `scripts/build-execute-lambda.mjs`
- `scripts/build-present-to-client-lambda.mjs`
- `src/typescript/features/taxPlanCycle/infrastructure/tinEinValidationSoapClient.ts`
- `src/typescript/shared/scripts/cloudTap.ts`
- `src/typescript/shared/scripts/execute-lambda/index.ts`
- `src/typescript/shared/scripts/execute-lambda/runtime.ts`
- `src/typescript/shared/scripts/present-to-client-lambda/index.ts`
- `src/typescript/shared/scripts/present-to-client-lambda/runtime.ts`
- `src/typescript/shared/scripts/taxPlanCycleLambdaRuntime.ts`
- `src/typescript/features/taxPlanCycle/infrastructure/cloudEvents/actionItemCreated/SnsPublisher.ts`
- `src/typescript/features/taxPlanCycle/controllers/transitionController.ts`
- `src/typescript/features/taxPlanCycle/infrastructure/cloudEvents/presentToClientSaga/PresentToClientSaga.ts`
- `src/typescript/soap.d.ts`
- `tests/typescript/bootstrap/testSetup.ts`
- `tests/typescript/features/taxPlanCycle/tinEinValidationSoapClient.test.ts`
- `tests/typescript/shared/scripts/executeLambdaRuntime.test.ts`
- `tests/typescript/features/taxPlanCycle/actionItemCreatedSnsPublisher.test.ts`
- `tests/typescript/shared/scripts/presentToClientLambda.test.ts`
- `tests/typescript/shared/scripts/presentToClientLambdaRuntime.test.ts`

  **Validation Notes:**

  - `cmd /c "set PATH=C:\\nvm4w\\nodejs;%PATH% && npm.cmd run typecheck"` passed.
  - `cmd /c "set PATH=C:\\nvm4w\\nodejs;%PATH% && npm.cmd run build:present-to-client-lambda && npm.cmd run build:execute-lambda"` produced `dist/present-to-client-lambda/index.js` and `dist/execute-lambda/index.js` plus source maps.
  - `cmd /c "set PATH=C:\\nvm4w\\nodejs;%PATH% && npm.cmd run test:vitest -- tests/typescript/shared/scripts/presentToClientLambda.test.ts tests/typescript/shared/scripts/presentToClientLambdaRuntime.test.ts tests/typescript/shared/scripts/executeLambdaRuntime.test.ts tests/typescript/features/taxPlanCycle/stageChangedSnsPublisher.test.ts tests/typescript/features/taxPlanCycle/actionItemCreatedSnsPublisher.test.ts tests/typescript/features/taxPlanCycle/actionItemConsumer.test.ts tests/typescript/shared/scripts/cloudTap.test.ts tests/typescript/features/taxPlanCycle/tinEinValidationSoapClient.test.ts"` passed after the local `soap` bootstrap mock was added.
  - The FIFO action-item SNS publish path was verified by adding `MessageGroupId` and `MessageDeduplicationId` assertions to the present-to-client runtime and action-item publisher tests.
  - The present-to-client runtime and saga now emit targeted telemetry markers so CloudWatch can show entry, stage-changed publish, and action-item publish boundaries.
  - The shared test bootstrap now mocks the absent `soap` package so the root TypeScript exports can load in Vitest without adding a new runtime dependency.

## caleb-latimer-jira128 - SCRUM-128

**Branch:** `caleb-latimer-jira128`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-128

**Summary:** Add the axe accessibility gate

**Description:** As a Frontend Developer, I want an axe scan in the test suite, so that the SPA stays accessible.

**Acceptance Criteria:**

- An axe scan of the dashboard and Plan Cycle Detail reports zero critical violations.
- Form fields on the Scenario Planner carry accessible labels.
- The check fails the build if a critical violation is introduced.

**Code Connection:**

- `src/pulseUI/tests/accessibility/axeGate.test.tsx`
- `src/pulseUI/package.json`
- `src/pulseUI/vitest.setup.ts`
- `src/pulseUI/tests/components/ScenarioPlanningForm.test.tsx`
- `src/pulseUI/tests/taxPlanCycle/Details.test.tsx`
- `src/pulseUI/tests/dashboard/DashboardCharts.test.tsx`

**Project Scope Connection:**

- React SPA - Operator & Portal Experience
- Accessibility gate coverage for the dashboard, Plan Cycle Detail, and Scenario Planner component seam
- Pulls in the current branch dependencies from SCRUM-127 and SCRUM-116 without adding unrelated UI scope

**Changed Files:**

- `src/pulseUI/tests/accessibility/axeGate.test.tsx`
- `src/pulseUI/package.json`
- `planning/team/cl-ticket-journal.md`

**Validation Notes:**

- `cmd /c "set PATH=C:\\nvm4w\\nodejs;%PATH% && npm.cmd --prefix src/pulseUI run typecheck"` passed.
- `cmd /c "set PATH=C:\\nvm4w\\nodejs;%PATH% && npm.cmd --prefix src/pulseUI test -- tests/accessibility/axeGate.test.tsx tests/dashboard/DashboardCharts.test.tsx tests/taxPlanCycle/Details.test.tsx tests/components/ScenarioPlanningForm.test.tsx"` passed.
- `cmd /c "set PATH=C:\\nvm4w\\nodejs;%PATH% && npm.cmd --prefix src/pulseUI run test"` ran the new axe gate successfully, then failed later in pre-existing branch tests for `tests/deductions/DeductionsPage.test.tsx` and `tests/scenarios/ScenarioPlannerPage.test.tsx` because those route states are not merged in this branch yet.

## caleb-latimer-jira127 - SCRUM-127

**Branch:** `caleb-latimer-jira127`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-127

**Summary:** Write the advisor open-queue-to-scenario E2E test

**Description:** As a Frontend Developer, I want a Playwright test of the core advisor flow, so that it is protected against regressions.

**Acceptance Criteria:**

- The test logs in as an Advisor, opens the Plan Cycle Queue, and opens a case.
- It enters a scenario in the Scenario Planner and asserts a result row appears.
- The test runs headless and fails the build on error.

**Code Connection:**

- `src/pulseUI/e2e/advisor-open-queue-to-scenario.spec.ts`
- `src/pulseUI/playwright.config.ts`
- `src/pulseUI/app/routeTree.tsx`
- `src/pulseUI/components/ScenarioPlanningForm.tsx`
- `src/pulseUI/pages/scenarios/ScenarioPlannerPage.tsx`
- `src/pulseUI/pages/scenarios/ScenarioPlannerPage.module.css`
- `src/pulseUI/tests/scenarios/ScenarioPlannerPage.test.tsx`
- `src/pulseUI/package.json`
- `src/pulseUI/package-lock.json`
- `src/pulseUI/tsconfig.pulseUI.json`
- `.gitignore`

**Project Scope Connection:**

- React SPA - Operator & Portal Experience
- Advisor queue-to-scenario regression coverage

**Changed Files:**

- `src/pulseUI/e2e/advisor-open-queue-to-scenario.spec.ts`
- `src/pulseUI/playwright.config.ts`
- `src/pulseUI/app/routeTree.tsx`
- `src/pulseUI/components/ScenarioPlanningForm.tsx`
- `src/pulseUI/pages/scenarios/ScenarioPlannerPage.tsx`
- `src/pulseUI/pages/scenarios/ScenarioPlannerPage.module.css`
- `src/pulseUI/tests/scenarios/ScenarioPlannerPage.test.tsx`
- `src/pulseUI/package.json`
- `src/pulseUI/package-lock.json`
- `src/pulseUI/tsconfig.pulseUI.json`
- `.gitignore`
- `planning/team/cl-ticket-journal.md`

**Validation Notes:**

- `cmd /c "set PATH=C:\\nvm4w\\nodejs;%PATH% && npm.cmd --prefix src/pulseUI run typecheck"` passed.
- `cmd /c "set PATH=C:\\nvm4w\\nodejs;%PATH% && npm.cmd --prefix src/pulseUI exec playwright install chromium"` downloaded the Chromium browser binaries needed for Playwright.
- `cmd /c "set PATH=C:\\nvm4w\\nodejs;%PATH% && npm.cmd --prefix src/pulseUI run test:e2e"` passed.
- `cmd /c "set PATH=C:\\nvm4w\\nodejs;%PATH% && npm.cmd --prefix src/pulseUI test -- tests/appShell.test.tsx tests/scenarios/ScenarioPlannerPage.test.tsx tests/taxPlanCycle/Queue.test.tsx tests/taxPlanCycle/Details.test.tsx"` passed.

## caleb-latimer-jira129 - SCRUM-129

**Branch:** `caleb-latimer-jira129`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-129

**Summary:** Add the Lighthouse performance threshold

**Description:** As a Frontend Developer, I want a Lighthouse threshold, so that the SPA stays performant.

**Acceptance Criteria:**

- A Lighthouse run scores at least 90 on the dashboard route.
- The run is reproducible against the built app.
- The build fails if the score regresses below threshold.

**Code Connection:**

- `src/pulseUI/scripts/lighthouse-dashboard.mjs`
- `src/pulseUI/package.json`
- `src/pulseUI/package-lock.json`

**Project Scope Connection:**

- React SPA - Operator & Portal Experience
- Performance gating for the dashboard route against the built Pulse UI
- Uses the existing dashboard shell without changing the screen itself

**Changed Files:**

- `src/pulseUI/scripts/lighthouse-dashboard.mjs`
- `src/pulseUI/package.json`
- `src/pulseUI/package-lock.json`
- `planning/team/cl-ticket-journal.md`

**Validation Notes:**

- `cmd /c "set PATH=C:\\nvm4w\\nodejs;%PATH% && npm.cmd --prefix src/pulseUI run typecheck"` passed.
- `cmd /c "set PATH=C:\\nvm4w\\nodejs;%PATH% && npm.cmd --prefix src/pulseUI run test:lighthouse"` passed and reported a Lighthouse performance score of `100/100`.
- `cmd /c "set PATH=C:\\nvm4w\\nodejs;%PATH% && npm.cmd --prefix src/pulseUI run test"` runs the Lighthouse gate successfully, then fails later in pre-existing branch tests for `tests/deductions/DeductionsPage.test.tsx` and `tests/scenarios/ScenarioPlannerPage.test.tsx` because those route states are not merged in this branch yet.


## caleb-latimer-jira146 - SCRUM-146

**Branch:** `caleb-latimer-jira146`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-146

**Summary:** Refine the Firm Team & Users screen component from the wireframe

**Description:** As a Frontend Developer, I want a typed Team & Users screen scaffolded from the wireframe, so that the screen has a stable structure before data is wired.

**Acceptance Criteria:**

- A typed React component renders the Team & Users layout with a toolbar, KPI row, and roster table.
- The visual treatment follows the prototype's dark slate shell, indigo accent, compact spacing, and rounded card language.
- The screen exposes typed roster props so the rows can be data-driven in the next ticket.
- The screen remains UI-only and keeps the future admin/platform-admin gate as a disabled placeholder comment.

**Code Connection:**

- `src/pulseUI/pages/firm/TeamUsersPage.tsx`
- `src/pulseUI/pages/firm/TeamUsersPage.module.css`
- `src/pulseUI/app/routeTree.tsx`

## caleb-latimer-jira145 - Jira-145

**Branch:** `caleb-latimer-jira145`

**Assignee:** Caleb Latimer

**Jira Key:** Jira-145

**Summary:** Wire the cycle details action buttons and notification feedback

**Description:** Implement the cycle-details action bar behavior so Reassign and Hold show placeholder info toasts, Advance Stage advances the tax-plan cycle through the existing transition endpoint, and the page refreshes the visible stage and audit trail on success.

**Acceptance Criteria:**

- Reassign and Hold are clickable and show info toasts that implementation details are still TBD.
- Advance Stage computes the next canonical forward stage and PATCHes the existing transition endpoint.
- Successful transitions refresh the details and audit-trail query state and surface a success toast.
- Unauthorized or illegal transitions stay on the page and surface backend problem details in an error toast.
- The notification system is reusable from the app shell and auto-dismisses after the default display time.

**Code Connection:**

- `src/pulseUI/components/AppShell.tsx`
- `src/pulseUI/components/NotificationToast.tsx`
- `src/pulseUI/components/NotificationToast.module.css`
- `src/pulseUI/entities/notificationMessage.ts`
- `src/pulseUI/pages/taxPlanCycle/Details.tsx`
- `src/pulseUI/shared/caseApi.ts`
- `src/typescript/features/taxPlanCycle/routes.ts`

**Project Scope Connection:**

- React SPA - Operator & Portal Experience
- Tax-plan cycle advancement wiring and user feedback
- Preserves the existing transition permission matrix while surfacing the result in the internal case details UI

**Changed Files:**

- `src/pulseUI/components/AppShell.tsx`
- `src/pulseUI/components/NotificationToast.tsx`
- `src/pulseUI/components/NotificationToast.module.css`
- `src/pulseUI/entities/notificationMessage.ts`
- `src/pulseUI/pages/taxPlanCycle/Details.tsx`
- `src/pulseUI/pages/taxPlanCycle/Details.module.css`
- `src/pulseUI/tests/appShell.test.tsx`
- `src/pulseUI/tests/components/NotificationToast.test.tsx`
- `src/pulseUI/tests/taxPlanCycle/Details.test.tsx`
- `src/pulseUI/tests/taxPlanCycle/queries.test.ts`
- `src/pulseUI/vitest.config.ts`
- `src/pulseUI/shared/caseApi.ts`
- `src/typescript/features/taxPlanCycle/routes.ts`
- `tests/typescript/features/taxPlanCycle/integration.test.ts`
- `tests/typescript/features/taxPlanCycle/routes.test.ts`
- `planning/team/cl-ticket-journal.md`

**Validation Notes:**

- `cmd /c "set PATH=C:\\nvm4w\\nodejs;%PATH% && npm.cmd --prefix src/pulseUI test"` passed with 42 test files and 204 tests green.
- `cmd /c "set PATH=C:\\nvm4w\\nodejs;%PATH% && npm.cmd run test:vitest -- tests/typescript/features/taxPlanCycle/routes.test.ts"` passed.
- `cmd /c "set PATH=C:\\nvm4w\\nodejs;%PATH% && npm.cmd run test:vitest -- tests/typescript/features/taxPlanCycle/integration.test.ts"` passed.
- `cmd /c "set PATH=C:\\nvm4w\\nodejs;%PATH% && npm.cmd run test:vitest -- tests/typescript/auditEntryOutput.test.ts"` passed.

## caleb-latimer-jira124 - SCRUM-124

**Branch:** `caleb-latimer-jira124`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-124

**Summary:** Add loading, empty, and error states to the Client Roster screen

**Description:** As a Frontend Developer, I want the Client Roster screen to render loading, empty, and error states, so that the screen behaves predictably while data resolves.

**Acceptance Criteria:**

- A loading skeleton renders while the roster request is in flight.
- An empty state renders when the firm has no clients.
- An error state renders with a retry affordance on request failure.

**Code Connection:**

- `src/pulseUI/components/ClientRosterSkeletonLoader.tsx`
- `src/pulseUI/components/RetryToolbar.tsx`
- `src/pulseUI/entities/clientRosterQueries.ts`
- `src/pulseUI/pages/clients/ClientRosterPage.tsx`
- `src/pulseUI/pages/clients/ClientRosterPage.module.css`
- `src/pulseUI/pages/EmptyPage.tsx`
- `src/pulseUI/shared/loaderTimeoutTestingConfig.ts`
- `src/pulseUI/pages/clients/ClientRosterPage.tsx`
- `src/pulseUI/shared/loaderTimeoutUtility.ts`
- `src/pulseUI/shared/mockedClientListings.model.ts`
- `src/pulseUI/shared/pageReload.ts`
- `src/pulseUI/tests/clients/ClientRosterPage.test.tsx`

**Project Scope Connection:**

- React SPA - Operator & Portal Experience

- Firm administration UI completion

**Changed Files:**

- `src/pulseUI/pages/firm/TeamUsersPage.tsx`
- `src/pulseUI/pages/firm/TeamUsersPage.module.css`
- `src/pulseUI/app/routeTree.tsx`
- `src/pulseUI/tests/firm/TeamUsersPage.test.tsx`
- `src/pulseUI/tests/deductions/DeductionsPage.test.tsx`
- `src/pulseUI/tests/scenarios/ScenarioPlannerPage.test.tsx` (deleted)

- Client Roster request-state coverage for the advisor and firm-admin workspace
- Keeps the temporary loader harness available in shared Pulse UI code, but decoupled from the normal client roster data flow
- Completes the live roster boundary introduced by SCRUM-123 before TanStack Table rendering work in SCRUM-125

**Changed Files:**

- `src/pulseUI/components/ClientRosterSkeletonLoader.tsx`
- `src/pulseUI/components/RetryToolbar.tsx`
- `src/pulseUI/entities/clientRosterQueries.ts`
- `src/pulseUI/pages/clients/ClientRosterPage.tsx`
- `src/pulseUI/pages/clients/ClientRosterPage.module.css`
- `src/pulseUI/pages/EmptyPage.tsx`
- `src/pulseUI/shared/loaderTimeoutTestingConfig.ts`
- `src/pulseUI/pages/clients/ClientRosterPage.tsx`
- `src/pulseUI/shared/loaderTimeoutUtility.ts`
- `src/pulseUI/shared/mockedClientListings.model.ts`
- `src/pulseUI/shared/pageReload.ts`
- `src/pulseUI/tests/clients/ClientRosterPage.test.tsx`
- `planning/team/cl-ticket-journal.md`

**Validation Notes:**

- `cmd /c "set PATH=C:\nvm4w\nodejs;%PATH% && npm.cmd --prefix src/pulseUI run typecheck"` passed.
- `cmd /c "set PATH=C:\nvm4w\nodejs;%PATH% && npm.cmd --prefix src/pulseUI test"` passed with `21` test files and `73` tests green.
- `npm.cmd --prefix src/pulseUI test -- tests/clients/ClientRosterPage.test.tsx tests/clients/ClientRosterQueries.test.tsx` was previously blocked by a Windows `EPERM: operation not permitted, lstat 'C:\Users\Exia'` environment issue before Vitest could start; the roster test file has since been rewritten to use the real API path again.

## caleb-latimer-jira138 - SCRUM-138

**Branch:** `caleb-latimer-jira138`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-138

**Summary:** Compensate present-to-client on action-item failure

**Description:** As an Advisor, I want present-to-client modeled as a compensating saga, so that a partial failure leaves the case consistent.

**Acceptance Criteria:**

- A present-to-client saga helper lives in the Tax Plan Cycle CloudEvents module and the transition controller delegates the action-item branch to it.
- A failed action-item publish rolls the cycle back to `Review` and emits the compensating stage-changed event.
- The rollback is recorded through the existing repository transition path so audit history stays intact.
- The local cloud-tap script exposes both a successful present-to-client run and a compensated failure run.
- Tests cover the saga success path, the compensation path, and the cloud-tap sequence output.

**Sequence Diagram:**

```mermaid
sequenceDiagram
    participant Advisor
    participant Controller
    participant Repo
    participant StageEvent as StageChangedPublisher
    participant Saga
    participant ActionItemEvent as ActionItemPublisher
    participant Audit as Audit Trail

    Advisor->>Controller: Transition Review -> Client Approval
    Controller->>Repo: Persist forward transition
    Repo-->>Controller: Client Approval
    Controller->>StageEvent: Publish forward stage-changed event
    Controller->>Saga: Run present-to-client saga
    Saga->>ActionItemEvent: Publish action-item event
    ActionItemEvent-->>Saga: Success
    Saga-->>Controller: Complete
    Note over Repo,Audit: Forward transition is recorded in audit history

    Advisor->>Controller: Transition Review -> Client Approval
    Controller->>Repo: Persist forward transition
    Repo-->>Controller: Client Approval
    Controller->>StageEvent: Publish forward stage-changed event
    Controller->>Saga: Run present-to-client saga
    Saga->>ActionItemEvent: Publish action-item event
    ActionItemEvent-->>Saga: Failure
    Saga->>Repo: Persist compensating transition to Review
    Repo-->>Saga: Review
    Saga->>StageEvent: Publish compensating stage-changed event
    Saga-->>Controller: Rethrow original failure
    Note over Repo,Audit: Compensation transition is also recorded in audit history
```

**Code Connection:**

- `src/typescript/features/taxPlanCycle/infrastructure/cloudEvents/PresentToClientSaga.ts` owns the compensating saga orchestration.
- `src/typescript/features/taxPlanCycle/controllers/transitionController.ts` delegates the present-to-client branch to the saga helper.
- `src/typescript/shared/scripts/cloudTap.ts` adds the in-memory present-to-client success and compensation sequences.
- `tests/typescript/features/taxPlanCycle/presentToClientSaga.test.ts` covers the saga success and rollback behavior.
- `tests/typescript/shared/scripts/cloudTap.test.ts` covers the local cloud-tap compensation proof.

**Project Scope Connection:**

- Keeps the present-to-client work inside the Event-Driven Workflow & Legacy Integration epic.
- Reuses the action-item CloudEvent contract and repository transition path instead of adding a new audit writer or persistence branch.
- Preserves the controller boundary while moving the compensation logic into the CloudEvents submodule.
- Provides a deterministic local verification path without requiring Redis or AWS.

**Changed Files:**

- `src/typescript/features/taxPlanCycle/infrastructure/cloudEvents/PresentToClientSaga.ts`
- `src/typescript/features/taxPlanCycle/infrastructure/cloudEvents/index.ts`
- `src/typescript/features/taxPlanCycle/controllers/transitionController.ts`
- `src/typescript/features/taxPlanCycle/index.ts`
- `src/typescript/index.ts`
- `src/typescript/shared/scripts/cloudTap.ts`
- `tests/typescript/features/taxPlanCycle/presentToClientSaga.test.ts`
- `tests/typescript/shared/scripts/cloudTap.test.ts`
- `planning/team/cl-ticket-journal.md`

**Validation Notes:**

- `npm.cmd run test:vitest -- tests/typescript/features/taxPlanCycle/presentToClientSaga.test.ts tests/typescript/features/taxPlanCycle/transitionController.test.ts tests/typescript/shared/scripts/cloudTap.test.ts` passed.
- `npm.cmd run typecheck` was blocked by an existing Pulse UI `vitest-axe` module resolution issue in `tests/deductions/mockDeductionsPage.test.tsx`.

## caleb-latimer-jira137 - SCRUM-137

**Branch:** `caleb-latimer-jira137`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-137

**Summary:** Create the action_item table and present-to-client event

**Description:** As a Backend Developer, I want an action_item table and a present-to-client event, so that presenting a cycle can create action items.

**Acceptance Criteria:**

- A schema-backed `action_item` table exists with integer `id`, `case_id`, `description`, `deadline`, and `completed`.
- The present-to-client boundary can publish a CloudEvent for action-item creation.
- A consumer can materialize action items into the portal read model from that event.

**Code Connection:**

- `src/typescript/shared/database/schema.ts` adds the `action_item` table definition, integer primary key, and foreign key to `tax_plan_cycle`.
- `src/typescript/shared/database/drizzle-migrations/0011_action_item.sql` materializes the `action_item` table and index in the migration chain.
- `src/typescript/shared/database/seed.model.ts` adds the action-item seed model and ten stubbed rows for case `018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d12`.
- `src/typescript/shared/database/seed.ts` truncates and seeds `action_item` rows through Drizzle.
- `src/typescript/features/taxPlanCycle/actionItem.ts` defines the imposed action-item model.
- `src/typescript/features/taxPlanCycle/infrastructure/cloudEvents/actionItemCreated/model.ts` defines the CloudEvent contract and factory for action-item creation.
- `src/typescript/features/taxPlanCycle/controllers/transitionController.ts` adds the scaffolded action-item publish boundary with `TODO: Need sync with Jira 131`.
- `src/typescript/features/taxPlanCycle/repositories/actionItems.ts` provides the action-item repository for the portal read model.
- `src/typescript/features/taxPlanCycle/infrastructure/cloudEvents/actionItemCreated/Consumer.ts` consumes the action-item CloudEvent with Redis idempotency.
- `tests/typescript/features/taxPlanCycle/actionItem.test.ts`, `tests/typescript/features/taxPlanCycle/actionItemCreatedEvent.test.ts`, `tests/typescript/features/taxPlanCycle/actionItemConsumer.test.ts`, and `tests/typescript/features/taxPlanCycle/transitionController.test.ts` cover the schema, event, consumer, and transition wiring.
- `src/pulseUI/vitest.setup.ts` and `src/pulseUI/tests/deductions/mockDeductionsPage.test.tsx` were adjusted so the repo-wide suite stays green.

**ERD:**

```text
TaxPlanCycle (existing)
  1 ────< ActionItem
            case_id FK -> TaxPlanCycle.id
            description
            deadline
            completed
```

**Project Scope Connection:**

- Keeps the work inside the Event-Driven Workflow & Legacy Integration epic.
- Reuses the cloudEvents/idempotency patterns from SCRUM-136 instead of introducing a parallel event stack.
- Stages the present-to-client hook so it can be synced with SCRUM-131 before the end-to-end runtime wiring is finalized.

**Changed Files:**

- `src/typescript/shared/database/schema.ts`
- `src/typescript/shared/database/drizzle-migrations/0011_action_item.sql`
- `src/typescript/shared/database/seed.model.ts`
- `src/typescript/shared/database/seed.ts`
- `src/typescript/features/taxPlanCycle/actionItem.ts`
- `src/typescript/features/taxPlanCycle/infrastructure/cloudEvents/actionItemCreated/model.ts`
- `src/typescript/features/taxPlanCycle/controllers/transitionController.ts`
- `src/typescript/features/taxPlanCycle/repositories/actionItems.ts`
- `src/typescript/features/taxPlanCycle/infrastructure/cloudEvents/actionItemCreated/Consumer.ts`
- `src/typescript/features/taxPlanCycle/infrastructure/cloudEvents/EventDeduplicator.ts`
- `src/typescript/features/taxPlanCycle/infrastructure/cloudEvents/index.ts`
- `src/typescript/features/taxPlanCycle/infrastructure/cloudEvents/model.ts`
- `src/typescript/features/taxPlanCycle/infrastructure/cloudEvents/stageChanged/index.ts`
- `src/typescript/features/taxPlanCycle/index.ts`
- `src/pulseUI/vitest.setup.ts`
- `src/pulseUI/tests/deductions/mockDeductionsPage.test.tsx`
- `tests/typescript/features/taxPlanCycle/actionItem.test.ts`
- `tests/typescript/features/taxPlanCycle/actionItemCreatedEvent.test.ts`
- `tests/typescript/features/taxPlanCycle/actionItemConsumer.test.ts`
- `tests/typescript/features/taxPlanCycle/transitionController.test.ts`
- `tests/typescript/authNegativePaths.test.ts`
- `planning/team/cl-ticket-journal.md`

**Validation Notes:**

- `npm test` passes end to end.
- Repo-wide TypeScript typecheck passes, including Pulse UI.
- Focused Vitest coverage passed for the changed tax-plan-cycle files before the full suite run.
- Targeted TypeScript compile passed for the changed source and seed files.

## caleb-latimer-jira101 - SCRUM-101

**Branch:** `caleb-latimer-jira101`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-101

**Summary:** Build the Scenario Planner form with react-hook-form + zod

**Description:** As an Advisor, I want a Scenario Planner form, so that I can enter a scenario inside a local modal on the Pulse UI `/scenarios` page.

**Acceptance Criteria:**

- The `/scenarios` page renders the `CurrentCaseSelector` in the tool header and uses the shared case gate when no valid case is selected.
- The launcher button is `New scenario` and stays disabled until a valid case is selected.
- The modal card title is `New What-If Scenario` and the body header is `New What if Scenario Set`.
- The form uses `react-hook-form` with Zod validation, logs validation failures to the console, and enforces the 2-5 scenario limit in the UI.
- The form UI stays on CSS modules rather than Tailwind utility styling.
- Successful submission logs locally with `console.info()` and keeps the Scrum-102 handoff comment in place.
- The page table area stays deferred to Jira-102.

**Sequence Diagram:**

```mermaid
sequenceDiagram
    participant Advisor
    participant UI as Pulse UI
    participant Selector as CurrentCaseSelector
    participant Gate as Case gateway
    participant Form as react-hook-form
    participant Schema as Zod

    Advisor->>UI: Open /scenarios
    UI->>Selector: Render case selector in the header
    Selector-->>UI: Show case gate until a valid case is chosen
    Advisor->>Selector: Select accessible case ID
    Selector->>UI: Update route search with caseId
    UI->>Gate: Render launcher state for selected case
    Gate-->>UI: Enable New scenario button
    Advisor->>UI: Open modal with New scenario
    UI->>Form: mount scenario array state
    Advisor->>Form: Add 2-5 scenario cards
    Form->>Form: reset to clean defaults on reopen
    Form->>Schema: validate each scenario field and array count
    Schema-->>Form: inline field errors or valid payload
    Advisor->>Form: Click Create Scenario
    Form->>Schema: submit local scenario set
    Schema-->>Form: console.info payload or console.error validation errors
    Note over Form,Advisor: Submission work is handled in Scrum-102
```

**Code Connection:**

- `src/pulseUI/components/ScenarioForm.tsx`
- `src/pulseUI/components/CurrentCaseSelector.tsx`
- `src/pulseUI/components/scenario-form/Form.module.css`
- `src/pulseUI/components/scenario-form/Form.tsx`
- `src/pulseUI/components/scenario-form/ScenarioCard.tsx`
- `src/pulseUI/components/scenario-form/ScenarioCard.module.css`
- `src/pulseUI/components/scenario-form/StatusFooter.tsx`
- `src/pulseUI/components/scenario-form/StatusFooter.module.css`
- `src/pulseUI/components/scenario-form/constants.ts`
- `src/pulseUI/components/scenario-form/schema.ts`
- `src/pulseUI/components/PlanToolCaseGate.tsx`
- `src/pulseUI/pages/scenarios/ScenarioPlannerPage.tsx`
- `src/pulseUI/tests/scenarios/ScenarioPlannerPage.test.tsx`
- `src/pulseUI/tests/components/ScenarioForm.test.tsx`

**Project Scope Connection:**

- React SPA - Operator & Portal Experience
- Tax Plan Cycle scenario-planning UI work

**Form Structure / Validation Notes:**

- The form is a repeatable scenario array rendered inside a modal card.
- Each scenario requires name, description, income, deductions, and income type.
- The UI blocks submission until the scenario count is between 2 and 5.
- Inline errors render beside the offending field in each scenario card.
- The add-scenario control disables at 5 and the footer reflects the remaining slots.

**Income Type Mapping:**

```json
{
  "rt": "Rental",
  "cg": "Capital Gains",
  "se": "1099/Self-Employment",
  "w2": "W-2 Employment"
}
```

**Form Field Mapping:**

```json
{
  "scenarios": [
    {
      "scenarioName": "string",
      "description": "string",
      "additionalIncome": "number",
      "additionalDeductions": "number",
      "incomeType": "rt | cg | se | w2"
    }
  ]
}
```

**Changed Files:**

- `src/pulseUI/components/ScenarioForm.tsx`
- `src/pulseUI/components/CurrentCaseSelector.tsx`
- `src/pulseUI/components/scenario-form/Form.module.css`
- `src/pulseUI/components/scenario-form/Form.tsx`
- `src/pulseUI/components/scenario-form/ScenarioCard.tsx`
- `src/pulseUI/components/scenario-form/ScenarioCard.module.css`
- `src/pulseUI/components/scenario-form/StatusFooter.tsx`
- `src/pulseUI/components/scenario-form/StatusFooter.module.css`
- `src/pulseUI/components/scenario-form/constants.ts`
- `src/pulseUI/components/scenario-form/schema.ts`
- `src/pulseUI/pages/scenarios/ScenarioPlannerPage.tsx`
- `src/pulseUI/pages/scenarios/ScenarioPlannerPage.module.css`
- `src/pulseUI/tests/scenarios/ScenarioPlannerPage.test.tsx`
- `src/pulseUI/tests/components/ScenarioForm.test.tsx`
- `planning/team/cl-ticket-journal.md`

**Validation Notes:**

- Testing was intentionally deferred until implementation is complete and reviewed; typecheck is the only validation run so far.
- The updated form logs valid submissions with `console.info()` and validation failures with `console.error()`.
- The page now renders the `CurrentCaseSelector` in the tool header and shows the case gate when `caseId` is absent or invalid.
- The modal form no longer surfaces `caseId` in the UI or submission payload and starts clean on each reopen.
- Jira-102 owns the table fetch/post behavior and remains marked in the page area with a TODO comment.

**Additional Scope Impact (append-only):**

- The scenario modal styling was moved back to CSS modules after the utility-first pass, keeping the UI closer to the original component structure.
- The scenario form now renders a horizontal divider between repeated entries using the requested white-to-gray gradient treatment.
- The footer actions now read as a horizontal button group with icon affordances and primary/secondary/info emphasis.
- The form no longer receives or displays `caseId`; case injection remains reserved for Scrum-102 rollup behavior.
- Reopening the modal now starts from clean default state rather than preserving values or validation state from the previous open.
- The related page and test updates continue to reflect the case selector harness and the local-only submit flow.

## caleb-latimer-jira100 - SCRUM-100

**Branch:** `caleb-latimer-jira-100`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-100

**Summary:** Jira-100 Wire the queue and detail screens to live data and consolidate detail navigation

**Description:** Wire the Tax Plan Cycle queue and detail screens to live server state using TanStack Query so the signed-in user's authorized cycles and cycle detail can be read through the Core service, then fold the legacy detail route/navigation state into `Details` and move query helpers into the entity layer.

**Acceptance Criteria:**

- The queue fetches the tenant's cycles via a TanStack Query hook.
- The detail screen fetches a single cycle by case ID.
- A scoped Advisor sees only their assigned cases per the permission matrix.
- The detail page owns its tab, stage, and comment draft state locally after the refactor.
- The legacy detail wrapper and navigation hook are deleted after the refactor.

**Sequence Diagram:**

```mermaid
sequenceDiagram
    participant Advisor
    participant UI as Pulse UI
    participant Query as TanStack Query
    participant Core as Core Case Service
    participant Repo as Tax Plan Cycle Repository
    participant Page as Details Page State

    Advisor->>UI: Open /cycles/queue
    UI->>Query: useQuery(["taxPlanCycle","queue"])
    Query->>Core: GET /v1/tax-plan-cycles
    Core->>Repo: listQueue(tenantId)
    Repo-->>Core: queue rows
    Core-->>Query: 200 OK + queue payload
    Query-->>UI: cache queue data
    UI-->>Advisor: render queue table and KPIs

    Advisor->>UI: Open /cycles/:id
    UI->>Query: useQuery(["taxPlanCycle","details",caseId])
    Query->>Core: GET /v1/tax-plan-cycles/:id
    Core->>Repo: findByCaseId(tenantId, caseId)
    Repo-->>Core: single cycle payload
    Core-->>Query: 200 OK + detail payload
    Query-->>UI: cache cycle detail
    UI->>Page: initialize tabs, stage, and comment draft
    Advisor->>Page: Switch tabs or stage locally
    Page-->>Advisor: Update local detail view state

    Core-->>UI: 401/502 Problem Details on auth or upstream failure
```

**Code Connection:**

- `src/typescript/features/taxPlanCycle/routes.ts`
- `src/typescript/features/taxPlanCycle/taxPlanCycle.ts`
- `src/typescript/features/taxPlanCycle/repositories/repository.ts`
- `src/typescript/coreCaseOpenApi.ts`
- `src/pulseUI/app/bootstrap.tsx`
- `src/pulseUI/app/queryClient.ts`
- `src/pulseUI/shared/coreCaseApi.ts`
- `src/pulseUI/entities/taxPlanCycleQueries.ts`
- `src/pulseUI/pages/taxPlanCycle/PlanCycle.tsx`
- `src/pulseUI/pages/taxPlanCycle/Details.tsx`
- `src/pulseUI/pages/taxPlanCycle/Queue.tsx`
- `src/pulseUI/pages/taxPlanCycle/Details.module.css`
- `src/pulseUI/tests/taxPlanCycle/QueueState.test.tsx`
- `src/pulseUI/tests/taxPlanCycle/Queue.test.tsx`
- `src/pulseUI/tests/taxPlanCycle/Details.test.tsx`
- `src/pulseUI/tests/taxPlanCycle/queries.test.ts`
- `adr/0021-tanstack-query-for-pulse-ui-server-state.md`

**Project Scope Connection:**

- React SPA - Operator & Portal Experience
- Core Case Service tax plan cycle read wiring

**Changed Files:**

- `src/typescript/features/taxPlanCycle/routes.ts`
- `src/typescript/features/taxPlanCycle/taxPlanCycle.ts`
- `src/typescript/features/taxPlanCycle/repositories/repository.ts`
- `src/typescript/index.ts`
- `src/typescript/coreCaseOpenApi.ts`
- `tests/typescript/features/taxPlanCycle/mainComposition.test.ts`
- `tests/typescript/coreCaseOpenApi.test.ts`
- `tests/typescript/assist/evaluation.test.ts`
- `src/pulseUI/package.json`
- `src/pulseUI/package-lock.json`
- `src/pulseUI/app/bootstrap.tsx`
- `src/pulseUI/app/queryClient.ts`
- `src/pulseUI/shared/coreCaseApi.ts`
- `src/pulseUI/pages/taxPlanCycle/PlanCycle.tsx`
- `src/pulseUI/pages/taxPlanCycle/Details.tsx`
- `src/pulseUI/pages/taxPlanCycle/Queue.tsx`
- `src/pulseUI/pages/taxPlanCycle/Details.module.css`
- `src/pulseUI/entities/taxPlanCycleQueries.ts`
- `src/pulseUI/pages/taxPlanCycle/PlanCycleDetailRoute.tsx`
- `src/pulseUI/pages/taxPlanCycle/queries.ts`
- `src/pulseUI/pages/taxPlanCycle/usePlanCycleDetailNavigation.ts`
- `src/pulseUI/tests/appShell.test.tsx`
- `src/pulseUI/tests/taxPlanCycle/QueueState.test.tsx`
- `src/pulseUI/tests/taxPlanCycle/Queue.test.tsx`

**Validation Notes:**

- `cmd /c "set PATH=C:\nvm4w\nodejs;%PATH% && npm.cmd --prefix src/pulseUI test -- tests/taxPlanCycle/Details.test.tsx tests/taxPlanCycle/queries.test.ts tests/taxPlanCycle/Queue.test.tsx tests/taxPlanCycle/QueueState.test.tsx"` passed.
- `cmd /c "set PATH=C:\nvm4w\nodejs;%PATH% && npm.cmd run typecheck"` passed.

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-100

**Summary:** Jira-100 Wire the queue and detail screens to live data and consolidate detail navigation

**Description:** Wire the Tax Plan Cycle queue and detail screens to live server state using TanStack Query so the signed-in user's authorized cycles and cycle detail can be read through the Core service, then fold the legacy detail route/navigation state into `Details` and move query helpers into the entity layer.

**Acceptance Criteria:**

- The queue fetches the tenant's cycles via a TanStack Query hook.
- The detail screen fetches a single cycle by case ID.
- A scoped Advisor sees only their assigned cases per the permission matrix.
- The detail page owns its tab, stage, and comment draft state locally after the refactor.
- The legacy detail wrapper and navigation hook are deleted after the refactor.

**Sequence Diagram:**

```mermaid
sequenceDiagram
    participant Advisor
    participant UI as Pulse UI
    participant Query as TanStack Query
    participant Core as Core Case Service
    participant Repo as Tax Plan Cycle Repository
    participant Page as Details Page State

    Advisor->>UI: Open /cycles/queue
    UI->>Query: useQuery(["taxPlanCycle","queue"])
    Query->>Core: GET /v1/tax-plan-cycles
    Core->>Repo: listQueue(tenantId)
    Repo-->>Core: queue rows
    Core-->>Query: 200 OK + queue payload
    Query-->>UI: cache queue data
    UI-->>Advisor: render queue table and KPIs

    Advisor->>UI: Open /cycles/:id
    UI->>Query: useQuery(["taxPlanCycle","details",caseId])
    Query->>Core: GET /v1/tax-plan-cycles/:id
    Core->>Repo: findByCaseId(tenantId, caseId)
    Repo-->>Core: single cycle payload
    Core-->>Query: 200 OK + detail payload
    Query-->>UI: cache cycle detail
    UI->>Page: initialize tabs, stage, and comment draft
    Advisor->>Page: Switch tabs or stage locally
    Page-->>Advisor: Update local detail view state

    Core-->>UI: 401/502 Problem Details on auth or upstream failure
```

**Code Connection:**

- `src/typescript/features/taxPlanCycle/routes.ts`
- `src/typescript/features/taxPlanCycle/taxPlanCycle.ts`
- `src/typescript/features/taxPlanCycle/repositories/repository.ts`
- `src/typescript/coreCaseOpenApi.ts`
- `src/pulseUI/app/bootstrap.tsx`
- `src/pulseUI/app/queryClient.ts`
- `src/pulseUI/shared/coreCaseApi.ts`
- `src/pulseUI/entities/taxPlanCycleQueries.ts`
- `src/pulseUI/pages/taxPlanCycle/PlanCycle.tsx`
- `src/pulseUI/pages/taxPlanCycle/Details.tsx`
- `src/pulseUI/pages/taxPlanCycle/Queue.tsx`
- `src/pulseUI/pages/taxPlanCycle/Details.module.css`
- `src/pulseUI/tests/taxPlanCycle/QueueState.test.tsx`
- `src/pulseUI/tests/taxPlanCycle/Queue.test.tsx`
- `src/pulseUI/tests/taxPlanCycle/Details.test.tsx`
- `src/pulseUI/tests/taxPlanCycle/queries.test.ts`
- `adr/0021-tanstack-query-for-pulse-ui-server-state.md`

**Project Scope Connection:**

- React SPA - Operator & Portal Experience
- Core Case Service tax plan cycle read wiring

**Changed Files:**

- `src/typescript/features/taxPlanCycle/routes.ts`
- `src/typescript/features/taxPlanCycle/taxPlanCycle.ts`
- `src/typescript/features/taxPlanCycle/repositories/repository.ts`
- `src/typescript/index.ts`
- `src/typescript/coreCaseOpenApi.ts`
- `tests/typescript/features/taxPlanCycle/mainComposition.test.ts`
- `tests/typescript/coreCaseOpenApi.test.ts`
- `src/pulseUI/package.json`
- `src/pulseUI/package-lock.json`
- `src/pulseUI/app/bootstrap.tsx`
- `src/pulseUI/app/queryClient.ts`
- `src/pulseUI/shared/coreCaseApi.ts`
- `src/pulseUI/pages/taxPlanCycle/PlanCycle.tsx`
- `src/pulseUI/pages/taxPlanCycle/Details.tsx`
- `src/pulseUI/pages/taxPlanCycle/Queue.tsx`
- `src/pulseUI/pages/taxPlanCycle/Details.module.css`
- `src/pulseUI/entities/taxPlanCycleQueries.ts`
- `src/pulseUI/pages/taxPlanCycle/PlanCycleDetailRoute.tsx`
- `src/pulseUI/pages/taxPlanCycle/queries.ts`
- `src/pulseUI/pages/taxPlanCycle/usePlanCycleDetailNavigation.ts`
- `src/pulseUI/tests/appShell.test.tsx`
- `src/pulseUI/tests/taxPlanCycle/QueueState.test.tsx`
- `src/pulseUI/tests/taxPlanCycle/Queue.test.tsx`
- `src/pulseUI/tests/taxPlanCycle/Details.test.tsx`
- `src/pulseUI/tests/taxPlanCycle/queries.test.ts`
- `src/pulseUI/tests/planCycleDetailNavigation.test.tsx`
- `src/pulseUI/tests/planCycleDetailRoute.test.tsx`
- `adr/0021-tanstack-query-for-pulse-ui-server-state.md`
- `adr/README.md`
- `planning/team/cl-ticket-journal.md`

**Validation Notes:**

- `cmd /c "set PATH=C:\\nvm4w\\nodejs;%PATH% && npm.cmd run typecheck"` passed at the repo root.
- `cmd /c "set PATH=C:\\nvm4w\\nodejs;%PATH% && npm.cmd test"` passed in `src/pulseUI`.
- `cmd /c "set PATH=C:\\nvm4w\\nodejs;%PATH% && npm.cmd test"` at the repo root failed in the integration suite because Testcontainers could not find a working container runtime strategy in this environment.
- The queue-state test harness now uses router context so the success branch no longer emits a `useRouter must be used inside a <RouterProvider>` warning.
- `cmd /c "set PATH=C:\\nvm4w\\nodejs;%PATH% && npm.cmd --prefix src/pulseUI test -- tests/taxPlanCycle/Details.test.tsx tests/taxPlanCycle/queries.test.ts tests/taxPlanCycle/Queue.test.tsx tests/taxPlanCycle/QueueState.test.tsx"` passed.
- `cmd /c "set PATH=C:\\nvm4w\\nodejs;%PATH% && npm.cmd --prefix src/pulseUI run typecheck"` passed.

## caleb-latimer-jira93 - SCRUM-93

**Branch:** `caleb-latimer-jira93`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-93

**Summary:** Jira-93 UI Feedback Pass

**Description:** Tighten the Tax Plan Cycle queue screen so the topbar, KPI copy, table layout, document chrome, and details placeholder match the current mockup and route structure.

**Acceptance Criteria:**

- The queue renders at `/cycles/queue` with rows for case ID, client, stage, owner, priority, due date, updated date, and action.
- Cases past their due date render an Overdue badge in place of the due-date text.
- The queue KPI cards render with the updated copy and the topbar includes the grouped role selector, live calculation indicator, and settings modal trigger.
- A blank details route exists at `/cycles/:id` and the `Open` action routes there.

**Code Connection:**

- `src/pulseUI/app/bootstrap.tsx`
- `src/pulseUI/app/createPulseRouter.ts`
- `src/pulseUI/app/routeTree.tsx`
- `src/pulseUI/components/AppShell.tsx`
- `src/pulseUI/entities/taxPlanCycle.ts`
- `src/pulseUI/pages/taxPlanCycle/PlanCycle.tsx`
- `src/pulseUI/pages/taxPlanCycle/Queue.tsx`
- `src/pulseUI/pages/taxPlanCycle/Details.tsx`
- `src/pulseUI/shared/navigation.ts`
- `src/pulseUI/shared/viewTitle.ts`
- `src/pulseUI/shared/styles.css`
- `src/pulseUI/styles.css` (removed)
- `src/pulseUI/vite.config.ts`
- `src/pulseUI/index.html`
- `src/pulseUI/public/calculator-favicon.svg`
- `src/pulseUI/tests/taxPlanCycle/Queue.test.tsx`
- `src/pulseUI/tests/taxPlanCycle/Details.test.tsx`
- `src/pulseUI/main.tsx`
- `adr/0019-tailwind-styling-foundation-for-pulse-ui.md`
- `adr/0020-pulse-ui-layered-application-structure.md`

**Project Scope Connection:**

- React SPA - Operator & Portal Experience
- Tax Plan Cycle queue UI work

**Changed Files:**

- `src/pulseUI/app/bootstrap.tsx`
- `src/pulseUI/app/createPulseRouter.ts`
- `src/pulseUI/app/routeTree.tsx`
- `src/pulseUI/components/AppShell.tsx`
- `src/pulseUI/entities/taxPlanCycle.ts`
- `src/pulseUI/pages/EmptyPage.tsx`
- `src/pulseUI/pages/taxPlanCycle/PlanCycle.tsx`
- `src/pulseUI/pages/taxPlanCycle/Queue.tsx`
- `src/pulseUI/pages/taxPlanCycle/Details.tsx`
- `src/pulseUI/shared/navigation.ts`
- `src/pulseUI/shared/viewTitle.ts`
- `src/pulseUI/shared/styles.css`
- `src/pulseUI/vite.config.ts`
- `src/pulseUI/tests/appShell.test.tsx`
- `src/pulseUI/tests/taxPlanCycle/QueueState.test.tsx`
- `src/pulseUI/tests/taxPlanCycle/Queue.test.tsx`
- `src/pulseUI/tests/taxPlanCycle/Details.test.tsx`
- `src/pulseUI/main.tsx`
- `src/pulseUI/index.html`
- `src/pulseUI/package.json`
- `src/pulseUI/package-lock.json`
- `src/pulseUI/public/calculator-favicon.svg`
- `adr/0019-tailwind-styling-foundation-for-pulse-ui.md`
- `adr/0020-pulse-ui-layered-application-structure.md`
- `adr/README.md`
- `planning/team/cl-ticket-journal.md`

**Validation Notes:**

- `cmd /c "set PATH=C:\\nvm4w\\nodejs;%PATH% && npm.cmd run typecheck"` passed in `src/pulseUI`.
- `cmd /c "set PATH=C:\\nvm4w\\nodejs;%PATH% && npm.cmd test"` passed in `src/pulseUI`.
- Final manual step after tests: compare the rendered queue page against the mocked layout referenced in `AGENTS.md` and note any pixel-level gaps before closing the ticket.

## caleb-latimer-jira74 - SCRUM-74

**Branch:** `caleb-latimer-jira74`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-74

**Summary:** Project Tax Plan Cycle changes into the queue table

**Description:** As a Backend Developer, I want cycle changes projected into the DynamoDB queue, so that the read model stays consistent with the case.

**Acceptance Criteria:**

- Creating or updating a cycle upserts its queue projection item.
- The queue projection item uses the tenant/case key contract and preserves the projected case fields.
- The LocalStack-backed queue table can be created and queried in tests.
- The Python queue-projection tests pass with the repository validation flow.

**Code Connection:**

- `src/tax_liability_engine/tax_plan_cycle_queue_projection.py`
- `src/tax_liability_engine/dynamodb/plan_cycle_queue_projection.py`
- `tests/tax_liability_engine/tax_plan_cycle_queue_projection/test_service.py`
- `tests/tax_liability_engine/test_plan_cycle_queue_projection.py`

**Project Scope Connection:**

- Polyglot Backend & Contracts
- Tax Plan Cycle queue projection read-model work

**Changed Files:**

- `src/tax_liability_engine/`
- `tests/tax_liability_engine/`
- `README.md`
- `CONTRIBUTING.md`
- `setup.sh`
- `pyproject.toml`
- `adr/0013-tax-liability-engine-namespace-refactor.md`

**Validation Notes:**

- `.\.venv\Scripts\python.exe -m pytest --cache-clear`
- `.\.venv\Scripts\python.exe -m pytest --basetemp=.pytest-tmp`
- `python -m pytest --cache-clear` in PowerShell also passed after the dev environment was installed
- LocalStack integration tests are wired through testcontainers and skip when Docker is not reachable in the current shell

## caleb-latimer-jira75 - SCRUM-75

**Branch:** `caleb-latimer-jira75`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-75

**Summary:** Cache the queue read in Redis with invalidation

**Description:** As an Advisor, I want the Plan Cycle Queue cached in Redis, so that the queue loads fast without hammering the read store.

**Acceptance Criteria:**

- Queue reads check Redis first and fall back to DynamoDB on a miss.
- A cache entry is invalidated when a case's stage or due_date changes.
- A test asserts a stale entry is not served after an invalidating change.

**Code Connection:**

- `src/typescript/taxPlanCycleQueueProjection.ts`
- `src/typescript/taxPlanCycleQueueCache.ts`
- `src/typescript/taxPlanCycleQueueDynamoStore.ts`
- `src/typescript/taxPlanCycleQueueReadService.ts`
- `src/typescript/taxPlanCycleTransitionController.ts`
- `tests/typescript/bootstrap/dockerRedis.ts`
- `tests/typescript/taxPlanCycleQueueCache.test.ts`
- `tests/typescript/taxPlanCycleQueueDynamoStore.test.ts`
- `tests/typescript/taxPlanCycleQueueRead.integration.ts`

**Project Scope Connection:**

- Polyglot Backend & Contracts
- Core Case Service queue-read cache-aside work

**Changed Files:**

- `src/typescript/`
- `tests/typescript/`
- `README.md`
- `.env.example`
- `package.json`
- `adr/0014-redis-cache-aside-queue-reads.md`
- `adr/README.md`

**Validation Notes:**

- Scaffolding was completed in the sandbox, but the new npm dependencies still need to be installed locally before `npm run typecheck`, `npm test`, and `npm run test:integration` can be executed.
- New queue-cache tests were added under the Tax Plan Cycle feature slice so the Redis coverage can be run directly with Vitest after install.
## caleb-latimer-jira84 - SCRUM-84

**Branch:** `caleb-latimer-jira84`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-84

**Summary:** Expose the tax calculation via a FastAPI endpoint

**Description:** As an Advisor, I want the calculation exposed via a JWT-protected
FastAPI endpoint, so that the Core service can request real numbers.

**Acceptance Criteria:**

- A POST endpoint accepts the calculation request and returns the response model.
- The endpoint requires a valid shared JWT and is tenant-scoped.
- An httpx test asserts a sample request returns the expected liability.

**Sequence Diagram:**

```mermaid
sequenceDiagram
    participant Client
    participant API as FastAPI
    participant JWT as Shared JWT Dependency
    participant Calc as calculate_tax
    Client->>API: POST /tax-calculations
    API->>JWT: Validate bearer token
    JWT-->>API: AuthenticatedPrincipal(tenant_id)
    API->>Calc: calculate_tax(request)
    Calc-->>API: TaxCalculationResult
    API-->>Client: 200 OK + response model
```

**Code Connection:** `src/python/tax_pulse_project_team_1/app.py` now owns the FastAPI
composition root, `src/python/tax_pulse_project_team_1/api.py` keeps the compatibility
import surface, and the `/tax-calculations` route lives in the feature slice under
`src/python/tax_pulse_project_team_1/routers/tax_calculation.py`. The new HTTP test
exercises the ASGI app through `httpx` and verifies the response model and liability
output.

**Project Scope Connection:** This delivers the Polyglot Backend & Contracts ticket by
exposing the Python tax engine as the tenant-scoped service endpoint the Core service
can call without changing the calculation math contract or introducing persistence.

**Changed Files:**

- `src/python/tax_pulse_project_team_1/api.py`
- `src/python/tax_pulse_project_team_1/app.py`
- `src/python/tax_pulse_project_team_1/dependencies.py`
- `src/python/tax_pulse_project_team_1/routers/__init__.py`
- `src/python/tax_pulse_project_team_1/routers/health.py`
- `src/python/tax_pulse_project_team_1/routers/tax_calculation.py`
- `src/python/tax_pulse_project_team_1/routers/scenario_comparison.py`
- `src/python/tax_pulse_project_team_1/jwt_authentication.py`
- `src/python/tax_pulse_project_team_1/__init__.py`
- `tests/python/test_tax_calculation.py`
- `tests/python/test_tax_calculation_api.py`
- `tests/python/test_plan_cycle_queue_projection.py`
- `src/tax_liability_engine/scripts/liability_engine_on.py`
- `adr/0016-fastapi-startup-convention.md`
- `docs/postman/jira84-tax-calculation.postman_collection.json`
- `docs/postman/jira84-tax-calculation.postman_environment.json`
- `README.md`
- `pyproject.toml`

**Validation Notes:**

- `.\.venv\Scripts\python.exe -m ruff format --check src/python tests/python` passed.
- `.\.venv\Scripts\python.exe -m pyright --pythonpath .\.venv\Scripts\python.exe`
  passed.
- `.\.venv\Scripts\python.exe -m pytest tests/python/test_tax_calculation_api.py
  tests/python/test_scenario_comparison_api.py` passed: 11 tests passed.
- `python src/tax_liability_engine/scripts/liability_engine_on.py` launched the API and returned
  `{"status":"ok"}` from `GET /health`.
- `.\.venv\Scripts\python.exe -m pytest` passed: 74 tests passed, 2 skipped.

## caleb-latimer-jira87 - SCRUM-87

**Branch:** `caleb-latimer-jira87`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-87

**Summary:** Expose the scenario comparison HTTP endpoint

**Description:** As an Advisor, I want a scenario endpoint, so that scenario
comparisons can be requested over HTTP.

**Acceptance Criteria:**

- A POST endpoint accepts a baseline plus 2-5 scenarios and returns each scenario's
  total tax and delta.
- The endpoint enforces the 2-5 bound and returns 422 otherwise.
- An httpx test asserts a 3-scenario request returns three deltas.

**Sequence Diagram:**

```mermaid
sequenceDiagram
    participant Client
    participant API as FastAPI
    participant JWT as Shared JWT Dependency
    participant Compare as calculate_scenario_comparisons
    participant Calc as calculate_tax
    Client->>API: POST /scenarios/comparisons
    API->>JWT: Validate bearer token and tenant claim
    JWT-->>API: AuthenticatedPrincipal(tenant_id)
    API->>Compare: calculate_scenario_comparisons(request)
    Compare->>Calc: calculate_tax(baseline)
    Calc-->>Compare: Baseline tax result
    loop 2-5 scenarios
        Compare->>Calc: calculate_tax(scenario typed figures)
        Calc-->>Compare: Scenario tax result
    end
    Compare-->>API: ScenarioComparisonResult[]
    API-->>Client: 200 OK + response list
```

**Code Connection:** `src/python/tax_pulse_project_team_1/app.py` now composes the
FastAPI application, `src/python/tax_pulse_project_team_1/api.py` preserves the public
import surface, and the tenant-scoped `/scenarios/comparisons` route lives in
`src/python/tax_pulse_project_team_1/routers/scenario_comparison.py`. The slice
reuses the shared JWT dependency pattern from Jira-84 and delegates all math to
`calculate_scenario_comparisons` without wrapping or altering the result model.

**Project Scope Connection:** This delivers the transport layer for the scenario
comparison contract that Jira-86 introduced in the Python service. It stays within the
Polyglot Backend & Contracts workstream, does not add persistence, and preserves the
existing calculation math contract.

**Changed Files:**

- `src/python/tax_pulse_project_team_1/api.py`
- `src/python/tax_pulse_project_team_1/app.py`
- `src/python/tax_pulse_project_team_1/dependencies.py`
- `src/python/tax_pulse_project_team_1/routers/__init__.py`
- `src/python/tax_pulse_project_team_1/routers/health.py`
- `src/python/tax_pulse_project_team_1/routers/tax_calculation.py`
- `src/python/tax_pulse_project_team_1/routers/scenario_comparison.py`
- `tests/python/test_tax_calculation_api.py`
- `tests/python/test_scenario_comparison_api.py`
- `planning/team/cl-ticket-journal.md`
- `planning/prompt-journal/cl-journal.md`

**Validation Notes:**

- `.\.venv\Scripts\python.exe -m ruff format --check src/python tests/python` passed.
- `.\.venv\Scripts\python.exe -m pyright --pythonpath .\.venv\Scripts\python.exe`
  passed with 0 errors and 0 warnings.
- `.\.venv\Scripts\python.exe -m pytest tests/python/test_tax_calculation_api.py
  tests/python/test_scenario_comparison_api.py` passed: 11 tests passed.
- `.\.venv\Scripts\python.exe -m pytest` passed: 74 tests passed, 2 skipped.

## caleb-latimer-jira90 - SCRUM-90

**Branch:** `caleb-latimer-jira90`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-90

**Summary:** Call the Tax Engine from Core through the Node HTTP client and persist modeled scenario results

**Description:** As an Advisor, I want modeling on a cycle to call the Tax Engine through the Core service, so that results are persisted on the case.

**Acceptance Criteria:**

- A scenario-modeling request on a case in Modeling stage calls the engine using the Node service's native HTTP client with a per-call timeout and bounded retries, and stores the returned figures.
- The call carries the shared JWT and tenant context.
- The stored scenario results are returned on a subsequent case read.

**Sequence Diagram:**

```mermaid
sequenceDiagram
    participant Advisor
    participant Core as Core Case Service
    participant JWT as Shared JWT
    participant Engine as Liability Engine (FastAPI)
    participant Repo as Scenario Repository

    Advisor->>Core: POST /v1/tax-plan-cycles/:caseId/scenarios
    Core->>JWT: Validate bearer token + tenant claim
    JWT-->>Core: principal + tenant context
    Core->>Engine: POST /scenarios/comparisons\nHeaders: authorization, x-taxpulse-tenant-id\nBody: { baseline, scenarios[].typed_figures }
    Note right of Engine: Success 200\n[{ name, total_tax, delta_vs_baseline }]
    Note right of Engine: Errors 400 validation\n401 unauthorized\n502/504 upstream failure
    Engine-->>Core: 200 OK\n[{ name, total_tax, delta_vs_baseline }]
    Core->>Repo: createMany(caseId, tenantId, scenarios)
    Repo-->>Core: persisted scenario rows
    Core-->>Advisor: 201 Created + stored scenarios

    Advisor->>Core: GET /v1/tax-plan-cycles/:caseId
    Core->>Repo: listByCaseId(tenantId, caseId)
    Repo-->>Core: cycle + scenarios
    Core-->>Advisor: 200 OK + case with scenarios
```

**Code Connection:** `src/typescript/features/taxPlanCycle/routes.ts` now exposes the modeling POST and read-back flow, `src/typescript/features/taxPlanCycle/controllers/scenarios.ts` owns the engine call and persistence handoff, `src/typescript/features/taxPlanCycle/infrastructure/engineClient.ts` provides the native HTTP client with timeout and retry handling, `src/typescript/features/taxPlanCycle/repositories/scenarios.ts` stores and lists scenario rows, and `src/typescript/coreCaseOpenApi.ts` documents the scenario request and response shapes. `src/typescript/index.ts` wires the runtime composition and exports the feature-local scenario contracts.

**Project Scope Connection:** This sits in the Polyglot Backend & Contracts workstream and extends the Core Case Service scenario-modeling slice so the TypeScript service can broker engine calls and persist the modeled figures without changing the tax math contract itself.

**Changed Files:**

- `src/typescript/features/taxPlanCycle/routes.ts`
- `src/typescript/features/taxPlanCycle/scenarioModelingController.ts`
- `src/typescript/scenarioModeling.ts`
- `src/typescript/taxEngineClient.ts`
- `src/typescript/scenarioRepository.ts`
- `src/typescript/coreCaseOpenApi.ts`
- `src/typescript/features/taxPlanCycle/taxPlanCycle.ts`
- `src/typescript/index.ts`
- `tests/typescript/features/taxPlanCycle/routes.test.ts`
- `tests/typescript/features/taxPlanCycle/mainComposition.test.ts`
- `.env.example`
- `README.md`
- `planning/team/cl-ticket-journal.md`
- `planning/prompt-journal/cl-journal.md`

**Validation Notes:**

- `cmd /c "set PATH=C:\nvm4w\nodejs;%PATH% && npm.cmd run typecheck"` passed.
- `cmd /c "set PATH=C:\nvm4w\nodejs;%PATH% && npm.cmd test"` passed: 45 test files passed, 1 skipped; 201 tests passed, 1 skipped.

## caleb-latimer-jira91 - SCRUM-91

**Branch:** `caleb-latimer-jira91`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-91

**Summary:** Surface liability-engine failures as 502 Problem Details without mutating scenario state

**Description:** As an Advisor, I want engine failures surfaced cleanly, so that a calculation outage never corrupts a case.

**Acceptance Criteria:**

- An engine failure surfaces as a 502-class Problem Details error.
- The case's stored state is unchanged after a failed call.
- A test asserts the case is intact after an injected engine failure.

**Code Connection:** `src/typescript/features/taxPlanCycle/controllers/scenarios.ts` now translates scenario-modeling engine failures into `ProblemHttpError` 502 responses without a feature-local scenario logger, `src/typescript/features/taxPlanCycle/routes.ts` continues to delegate scenario modeling through the feature-local controller, `src/typescript/coreCaseOpenApi.ts` documents the 502 scenario failure response, and `src/typescript/index.ts` wires the tax plan cycle feature through the composition root.

**Project Scope Connection:** This extends the Core Case Service scenario-modeling slice from Jira-90 and keeps the FastAPI liability engine wire contract unchanged while tightening the Core-side failure boundary.

**Changed Files:**

- `src/typescript/features/taxPlanCycle/controllers/scenarios.ts`
- `src/typescript/coreCaseOpenApi.ts`
- `src/typescript/index.ts`
- `tests/typescript/features/taxPlanCycle/scenarios.test.ts`
- `tests/typescript/features/taxPlanCycle/routes.test.ts`
- `src/typescript/features/taxPlanCycle/repositories/repository.ts`
- `src/typescript/features/taxPlanCycle/repository/repository.ts`
- `src/typescript/features/taxPlanCycle/readService.ts`
- `src/typescript/features/taxPlanCycle/infrastructure/queueDynamoStore.ts`
- `src/typescript/features/taxPlanCycle/controllers/createController.ts`
- `src/typescript/features/taxPlanCycle/controllers/transitionController.ts`
- `src/typescript/features/taxPlanCycle/index.ts`
- `tests/typescript/features/taxPlanCycle/mainComposition.test.ts`
- `package.json`
- `vitest.config.ts`
- `planning/team/cl-ticket-journal.md`

**Validation Notes:**

- `cmd /c "set PATH=C:\nvm4w\nodejs;%PATH% && npm.cmd run typecheck"` passed.
- `cmd /c "set PATH=C:\nvm4w\nodejs;%PATH% && npm.cmd test"` passed after fixing the stale `test:express` script reference and scoping Vitest away from the React UI tree.
- Deviation from the original change set: the scenario-local logger was removed entirely because it did not improve the failure output enough to justify the added scope.
- Deviation from the original change set: the root test harness was repaired as part of the same pass so the Node test run is exclusive from the React UI tree and `npm test` is meaningful again.

## caleb-latimer-jira111 - SCRUM-111

**Branch:** `caleb-latimer-jira111`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-111

**Summary:** Scaffold the Deductions & Expenses screen component from the wireframe and refine shell navigation

**Description:** Scaffold a typed Pulse UI `/deductions` screen with a reusable tool header, KPI region, and table region, then update the shell navigation and sidebar footer copy so the layout is stable before data wiring lands.

**Acceptance Criteria:**

- The `/deductions` route renders a typed deductions screen scaffold instead of the empty page.
- The screen uses reusable shared UI where it already exists, especially `MetricCard`.
- The screen includes a local placeholder modal shell opened by the Add Deduction button.
- The screen stays fully local and inert with no data fetching or backend changes.
- The sidebar includes an Administration section plus a footer user card and Logout button.
- The deductions nav entry uses the percent icon and the title copy reads `Deductions & Expenses`.

**Code Connection:**

- `src/pulseUI/components/ToolHeader.tsx`
- `src/pulseUI/components/DataTable.tsx`
- `src/pulseUI/pages/deductions/DeductionsPage.tsx`
- `src/pulseUI/pages/deductions/DeductionsPage.module.css`
- `src/pulseUI/components/AppShell.tsx`
- `src/pulseUI/components/AppShell.module.css`
- `src/pulseUI/shared/navigation.ts`
- `src/pulseUI/app/routeTree.tsx`
- `src/pulseUI/tests/components/ToolHeader.test.tsx`
- `src/pulseUI/tests/components/DataTable.test.tsx`
- `src/pulseUI/tests/deductions/DeductionsPage.test.tsx`
- `src/pulseUI/tests/appShell.test.tsx`

**Project Scope Connection:**

- React SPA - Operator & Portal Experience
- Plan tools screen scaffolding

**Changed Files:**

- `src/pulseUI/components/ToolHeader.tsx`
- `src/pulseUI/components/ToolHeader.module.css`
- `src/pulseUI/components/DataTable.tsx`
- `src/pulseUI/components/DataTable.module.css`
- `src/pulseUI/pages/deductions/DeductionsPage.tsx`
- `src/pulseUI/pages/deductions/DeductionsPage.module.css`
- `src/pulseUI/components/AppShell.tsx`
- `src/pulseUI/components/AppShell.module.css`
- `src/pulseUI/shared/navigation.ts`
- `src/pulseUI/app/routeTree.tsx`
- `src/pulseUI/tests/components/ToolHeader.test.tsx`
- `src/pulseUI/tests/components/DataTable.test.tsx`
- `src/pulseUI/tests/deductions/DeductionsPage.test.tsx`
- `src/pulseUI/tests/appShell.test.tsx`
- `planning/team/cl-ticket-journal.md`

**Validation Notes:**

- `cmd /c "set PATH=C:\nvm4w\nodejs;%PATH% && npm.cmd run typecheck"` passed.
- `cmd /c "set PATH=C:\nvm4w\nodejs;%PATH% && npm.cmd --prefix src/pulseUI test -- tests/components/ToolHeader.test.tsx tests/components/DataTable.test.tsx tests/deductions/DeductionsPage.test.tsx"` passed.
- `cmd /c "set PATH=C:\nvm4w\nodejs;%PATH% && npm.cmd --prefix src/pulseUI test -- tests/appShell.test.tsx tests/components/ToolHeader.test.tsx tests/components/DataTable.test.tsx tests/deductions/DeductionsPage.test.tsx"` passed.


## caleb-latimer-jira116 - SCRUM-116

**Branch:** `caleb-latimer-jira116`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-116

**Summary:** Add accessibility and a component test for the Deductions screen

**Description:** As a Frontend Developer, I want the Deductions screen to pass an axe check and a component test, so that it is accessible and regression-guarded.

**Acceptance Criteria:**

- An axe accessibility check on the rendered screen reports no violations.
- A component test asserts the table renders rows and the empty state for no data.
- The form's inputs carry accessible labels and the test asserts a validation error is announced.

**Code Connection:**

- `src/pulseUI/vitest.setup.ts`
- `src/pulseUI/tests/deductions/DeductionsPage.test.tsx`
- `src/pulseUI/tests/deductions/mockDeductionsPage.tsx`
- `src/pulseUI/tests/deductions/mockDeductionsPage.test.tsx`
- `src/pulseUI/vitest.config.ts`
- `src/pulseUI/package.json`
- `adr/0027-vitest-axe-accessibility-testing.md`

**Project Scope Connection:**

- React SPA - Operator & Portal Experience
- Deductions screen accessibility and regression coverage
- Real-route axe coverage for the authenticated `/deductions` screen plus a story-only mock seam for the blocked UI edge cases

**Changed Files:**

- `src/pulseUI/tests/deductions/DeductionsPage.test.tsx`
- `src/pulseUI/vitest.setup.ts`
- `src/pulseUI/tests/deductions/mockDeductionsPage.tsx`
- `src/pulseUI/tests/deductions/mockDeductionsPage.test.tsx`
- `src/pulseUI/vitest.config.ts`
- `src/pulseUI/package.json`
- `src/pulseUI/package-lock.json`
- `adr/0027-vitest-axe-accessibility-testing.md`


## caleb-latimer-jira112 - SCRUM-112

**Branch:** `caleb-latimer-jira112`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-112

**Summary:** Add the TanStack Query hook to the deductions endpoint and wire the Deductions page to the route-driven case gate, Replace deductions GET mocks with a Postgres-backed list endpoint and align the Pulse UI query consumer to integration a TanStack Query hook to the deductions endpoint to add the TanStack Query hook to the quarterly estimates endpoint

**Description:** As a Frontend Developer, I want the Deductions screen to read tenant-scoped live data through one typed query boundary, so that the page requires a valid case ID from router state before it fetches and exposes loading, error, and data states for future loader behavior.

As a Core Case Service engineer, I want `GET /v1/cases/:caseId/deductions` to read directly from Postgres and return a JSON array of deduction rows, so that the Deductions screen can consume tenant-scoped live data through a typed query boundary instead of a synthetic aggregation payload. As a React SPA engineer, I want the shared case selector and gate to initialize the current case selection for deductions, so that the page can fetch `GET /v1/cases/:caseId/deductions` only after a valid route-backed case is selected.



**Acceptance Criteria:**

- A TanStack Query hook calls the deductions endpoint and returns typed deduction items.
- The hook exposes loading, error, and data states to callers.
- The Deductions screen reads the hook boundary instead of a static local scaffold.
- The route-driven case context from SCRUM-203 remains the case-id source for the query boundary.
- The shared selector can initialize the current case selection from the deductions page.
- Loader presentation remains deferred to SCRUM-113 and is only tracked as query state for now.
- `GET /v1/cases/:caseId/deductions` is fetched only after a valid case ID exists.
- The Deductions page exposes a query-state marker for future loader wiring without rendering loader UI.
- The Pulse UI query layer treats the response as `Deduction[]`.
- Coverage includes missing case gating, selected case fetch behavior, query-state exposure, and typed response parsing.
- `GET /v1/cases/:caseId/deductions` queries the `deduction` table directly.
- The repository filters by the authenticated tenant and requested case.
- The endpoint returns a JSON array of deduction rows with ISO date strings and numeric fields serialized for JSON transport.
- The deductions backend no longer depends on the in-memory aggregation mock, controller stub, or 404 placeholder path.
- The Pulse UI query layer treats the response as `Deduction[]`, and the Deductions page logs the parsed array with `console.table()`.
- Repository, route, and UI regression tests cover the owning tenant, cross-tenant access, empty-list cases, and the parsed response shape.
- The OpenAPI contract reflects the new list response.
**Sequence Diagram:**

```mermaid
sequenceDiagram
    participant Advisor
    participant UI as Pulse UI
    participant Selector as CurrentCaseSelector
    participant Gate as PlanToolCaseGate
    participant Query as useDeductionsQuery
    participant Router as TanStack Router
     participant API as Core Case Service
    participant Route as deductions route
    participant Repo as Deductions repository
    participant DB as Postgres deduction table
    participant API as Case API

    Advisor->>UI: Open /deductions
    UI->>Query: mount DeductionsPage with caseId
    Query->>API: GET /v1/cases/{caseId}/deductions
    API->>Route: authenticate and route request
    Route->>Repo: listByCaseId(tenantId, caseId)
    Repo->>DB: SELECT deduction rows joined through tax_plan_cycle
    DB-->>Repo: matching deduction rows
    Repo-->>Route: tenant-scoped Deduction[]
    Route-->>API: 200 OK + JSON array
    API-->>Query: parsed Deduction[]
    Query-->>UI: query data available
    UI->>UI: console.table(query.data)
    Note over UI: Main table wiring stays disabled for Scrum-115
    Note over Screen: Loader UI remains deferred to SCRUM-113
    UI->>Selector: render shared case selector
    alt case ID missing or invalid
        UI->>Gate: show case gate and block fetch
    else case ID selected
        Selector->>Router: write caseId into router search
        UI->>Query: enable deductions query with caseId
        Query->>API: GET /v1/cases/{caseId}/deductions
        API-->>Query: Deduction[]
        Query-->>UI: data, loading, error state exposure
    end
    Note over UI: Loader UI remains deferred to SCRUM-113
```

**Code Connection:**

- `src/pulseUI/entities/deductionQueries.ts`
- `src/typescript/features/deductions/repositories/repository.ts`
- `src/typescript/features/deductions/repositories/deduction.ts`
- `src/typescript/features/deductions/routes.ts`
- `src/typescript/features/deductions/controllers/deductions.ts`
- `src/typescript/features/deductions/repositories/mockAggregationDataSource.ts`
- `src/typescript/coreCaseOpenApi.ts`
- `src/typescript/index.ts`
- `src/typescript/shared/database/seed.model.ts`
- `src/pulseUI/pages/deductions/DeductionsPage.tsx`
`src/pulseUI/tests/entities/deductionQueries.test.ts`
- `src/pulseUI/tests/deductions/DeductionsPage.test.tsx`
- `tests/typescript/features/deductions/repository.test.ts`
- `tests/typescript/features/deductions/routes.test.ts`
- `tests/typescript/deductionAggregationClient.test.ts`
- `src/pulseUI/components/CurrentCaseSelector.tsx`
- `src/pulseUI/components/PlanToolCaseGate.tsx`
- `src/pulseUI/shared/usePlanToolCase.ts`
- `src/pulseUI/shared/planToolCase.ts`
- `src/pulseUI/app/routeTree.tsx`
- `src/pulseUI/tests/entities/deductionQueries.test.tsx`
- `src/pulseUI/tests/deductions/DeductionsPage.test.tsx`
- `src/pulseUI/tests/appShell.test.tsx`
- `src/typescript/features/deductions/repositories/repository.ts`
- `src/typescript/features/deductions/repositories/deduction.ts`
- `src/typescript/features/deductions/routes.ts`
- `src/typescript/features/deductions/controllers/deductions.ts`
- `src/typescript/features/deductions/repositories/mockAggregationDataSource.ts`
- `src/typescript/coreCaseOpenApi.ts`
- `src/typescript/index.ts`
- `src/typescript/shared/database/seed.model.ts`
- Route-driven case context integration
- Pulse UI deductions query boundary alignment
- Loader-state exposure deferred to the next Jira
- Shared plan-tool case selection and gating
- Case-gated deductions fetch behavior
- Core Case Service backend
- Tenant-scoped read path and API contract cleanup
- Core Case Service deductions endpoint compatibility

**Changed Files:**

- `src/pulseUI/entities/deductionQueries.ts`
- `src/pulseUI/pages/deductions/DeductionsPage.tsx`
- `src/pulseUI/app/routeTree.tsx`
- `src/pulseUI/tests/entities/deductionQueries.test.tsx`
- `src/pulseUI/tests/deductions/DeductionsPage.test.tsx`
- `src/pulseUI/tests/appShell.test.tsx`
- `src/pulseUI/components/CurrentCaseSelector.tsx`
- `src/pulseUI/components/PlanToolCaseGate.tsx`
- `src/pulseUI/shared/usePlanToolCase.ts`
- `src/pulseUI/shared/planToolCase.ts`
- `src/typescript/features/deductions/repositories/repository.ts`
- `src/typescript/features/deductions/repositories/deduction.ts`
- `src/typescript/features/deductions/routes.ts`
- `src/typescript/features/deductions/controllers/deductions.ts`
- `src/typescript/features/deductions/repositories/mockAggregationDataSource.ts`
- `src/typescript/coreCaseOpenApi.ts`
- `src/typescript/index.ts`
- `src/typescript/shared/database/seed.model.ts`
- `planning/team/cl-ticket-journal.md`

**Validation Notes:**

- Focused Pulse UI tests passed: `tests/entities/deductionQueries.test.tsx`, `tests/deductions/DeductionsPage.test.tsx`, and `tests/appShell.test.tsx`.
- Pulse UI typecheck passed: `npm.cmd run typecheck`.

## caleb-latimer-jira117 - SCRUM-117

**Branch:** `caleb-latimer-jira117`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-117

**Summary:** Scaffold the Quarterly Payments screen component from the wireframe

**Description:** As an Advisor, I want a read-only Quarterly Payments screen, so that I can review the estimated installment schedule and withholding coverage through a case-scoped quarterly-estimates read model before charting and payment actions are added later.

**Acceptance Criteria:**

- The `/quarterly-payments` route renders a typed quarterly payments screen instead of the empty page.
- The screen shows a KPI region with the second card styled green and the last card styled amber.
- The screen shows a read-only quarter timeline with four seeded estimate items.
- The screen includes a computed withholding progress card that reports total estimated, paid so far, and remaining due values.
- The screen keeps payment recording and mark-paid actions out of scope.

**Code Connection:**

- `src/pulseUI/pages/quarterlyPayments/QuarterlyPaymentsPage.tsx`
- `src/pulseUI/pages/quarterlyPayments/QuarterlyPaymentsPage.module.css`
- `src/pulseUI/components/QuarterlyTimelineItem.tsx`
- `src/pulseUI/components/QuarterlyTimelineItem.module.css`
- `src/pulseUI/components/WithholdingProgressChart.tsx`
- `src/pulseUI/entities/quarterlyEstimateQueries.ts`
- `src/typescript/features/quarterlyPayments/routes.ts`
- `src/typescript/features/quarterlyPayments/repositories/quarterlyPayments.ts`
- `src/typescript/features/quarterlyPayments/repositories/mockPayments.model.ts`
- `src/pulseUI/app/routeTree.tsx`
- `src/pulseUI/tests/quarterlyPayments/QuarterlyPaymentsPage.test.tsx`

**Project Scope Connection:**

- React SPA - Operator & Portal Experience
- Plan tools screen scaffolding

**Changed Files:**

- `src/pulseUI/components/QuarterlyTimelineItem.tsx`
- `src/pulseUI/components/QuarterlyTimelineItem.module.css`
- `src/pulseUI/components/WithholdingProgressChart.tsx`
- `src/pulseUI/pages/quarterlyPayments/QuarterlyPaymentsPage.tsx`
- `src/pulseUI/pages/quarterlyPayments/QuarterlyPaymentsPage.module.css`
- `src/pulseUI/entities/quarterlyEstimateQueries.ts`
- `src/typescript/features/quarterlyPayments/routes.ts`
- `src/typescript/features/quarterlyPayments/repositories/quarterlyPayments.ts`
- `src/typescript/features/quarterlyPayments/repositories/mockPayments.model.ts`
- `src/pulseUI/app/routeTree.tsx`
- `src/pulseUI/tests/quarterlyPayments/QuarterlyPaymentsPage.test.tsx`
- `planning/team/cl-ticket-journal.md`

**Validation Notes:**

- `cmd /c "set PATH=C:\nvm4w\nodejs;%PATH% && npx tsc --noEmit"` passed.
- `cmd /c "set PATH=C:\nvm4w\nodejs;%PATH% && npm.cmd --prefix src/pulseUI test -- tests/quarterlyPayments/QuarterlyPaymentsPage.test.tsx tests/appShell.test.tsx tests/components/ToolHeader.test.tsx tests/components/DataTable.test.tsx"` passed.
- Jira 118 was completed inside this branch as the typed quarterly-estimates query boundary for the read-only Quarterly Payments screen.
- Later quarterly-payments refinements reduced the mock to four items, shrank the quarter statuses to `Paid` and `Due`, and replaced the placeholder chart with computed coverage, paid-so-far, and remaining-due outputs.

## caleb-latimer-jira118 - SCRUM-118

**Branch:** `caleb-latimer-jira117`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-118

**Summary:** Add the TanStack Query hook to the quarterly estimates endpoint

**Description:** Jira 118 was implemented inside Jira 117 to add a typed read-only quarterly-estimates query boundary for the Quarterly Payments screen.

**Acceptance Criteria:** Implemented inside SCRUM-117.

**Code Connection:** `src/pulseUI/entities/quarterlyEstimateQueries.ts`, `src/pulseUI/pages/quarterlyPayments/QuarterlyPaymentsPage.tsx`, `src/typescript/features/quarterlyPayments/routes.ts`

**Project Scope Connection:** React SPA - Operator & Portal Experience, Core Case Service read-only quarterly estimates

**Changed Files:** See SCRUM-117 quarterly-payments changes.

**Validation Notes:** Validation was deferred per instruction; no tests were run for this ticket during implementation.
- Database generation follow-up for this quarterly payments work will be tracked in SCRUM-204.

## caleb-latimer-jira203 - SCRUM-203

**Branch:** `caleb-latimer-jira203`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-203

**Summary:** Add route-driven case selection for plan tools

**Description:** Plan tools require a Tax Plan Cycle primary key before they can fetch or change case data. This slice introduces a TanStack Router search-param case gate so Deductions, Scenarios, Quarterly Payments, and the visible Income placeholder can independently initialize and consume the selected case ID.

**Acceptance Criteria:**

- Planning tool routes accept an optional UUID-shaped `caseId` search parameter.
- Missing or invalid case IDs render a shared selector gate and prevent native page fetch/post behavior.
- Any planning tool can initialize selection through `GET /v1/tax-plan-cycles`.
- Plan-tool nav links preserve selected `caseId`; unrelated nav links do not.
- Toolbar form actions are disabled until a valid case ID exists.
- ADR-0026 records the route-driven case context decision.

**Sequence Diagram:**

```mermaid
sequenceDiagram
    participant Advisor
    participant Router as TanStack Router
    participant Selector as CurrentCaseSelector
    participant Header as ToolHeader
    participant Tool as Plan Tool
    participant API as Core Case Service

    Advisor->>Router: Open /deductions without caseId
    Router->>Tool: caseId absent from search state
    Tool->>Header: Render selector and disabled Add action
    Tool-->>Advisor: Show case-gated empty state
    Selector->>API: GET /v1/tax-plan-cycles
    API-->>Selector: Tenant-scoped case list
    Advisor->>Selector: Select case UUID
    Selector->>Router: Navigate to current route with ?caseId=...
    Router->>Tool: Provide validated caseId from search
    Tool->>API: GET /v1/cases/:caseId/deductions
    Advisor->>Router: Click Scenarios nav link
    Router->>Tool: Navigate to /scenarios?caseId=...
```

**Code Connection:**

- Pulse UI routing and sidebar navigation
- Shared plan-tool case selector and route-search helpers
- Deductions, Scenarios, Quarterly Payments, and Income plan-tool gates
- ADR and local environment configuration

**Project Scope Connection:**

- React SPA - Operator & Portal Experience
- Tenant-scoped Tax Plan Cycle workflow
- Case-bound plan tools and server-state fetching

**Changed Files:**

- `src/pulseUI/app/routeTree.tsx`
- `src/pulseUI/components/AppShell.tsx`
- `src/pulseUI/components/ToolHeader.tsx`
- `src/pulseUI/components/CurrentCaseSelector.tsx`
- `src/pulseUI/components/PlanToolCaseGate.tsx`
- `src/pulseUI/shared/planToolCase.ts`
- `src/pulseUI/shared/usePlanToolCase.ts`
- `src/pulseUI/entities/deductionQueries.ts`
- `src/pulseUI/pages/deductions/DeductionsPage.tsx`
- `src/pulseUI/pages/scenarios/ScenarioPlannerPage.tsx`
- `src/pulseUI/pages/quarterlyPayments/QuarterlyPaymentsPage.tsx`
- `src/pulseUI/pages/income/IncomePage.tsx`
- `.env.example`
- `.env`
- `adr/0026-route-driven-case-context.md`

- `adr/README.md`
- `planning/team/cl-ticket-journal.md`

**Validation Notes:**


- Dependency install completed with `npm.cmd --prefix src/pulseUI install --save-dev vitest-axe`.
- `cmd /c "set PATH=C:\nvm4w\nodejs;%PATH% && npm.cmd --prefix src/pulseUI run typecheck"` passed.
- `cmd /c "set PATH=C:\nvm4w\nodejs;%PATH% && npm.cmd --prefix src/pulseUI test -- tests/deductions/DeductionsPage.test.tsx"` passed.
- `cmd /c "set PATH=C:\nvm4w\nodejs;%PATH% && npm.cmd --prefix src/pulseUI test -- tests/deductions/mockDeductionsPage.test.tsx"` passed.

- `cmd /c "set PATH=C:\nvm4w\nodejs;%PATH% && npm.cmd run typecheck"` passed.
- Focused Pulse UI tests were not completed: the sandboxed command failed before Vitest started with the known Windows `EPERM` path issue, and no escalated rerun was performed.
- No additional tests will be run until the feature is manually verified.

**Pre-Review Update:**

- Main problem: every plan tool is independently case-gated, any plan tool can initialize the current case selection, and once selected all plan-tool nav links preserve that `caseId`.
- Design direction: rather than manage separate selected-case state, bind the case context to the domain and application flow through TanStack Router search state.
- Page behavior model: the app state is the enabled state where a valid `caseId` allows fetch/load behavior and post buttons to be interactable; the detached state is the disabled state where no case ID exists, the user must pick one, post buttons are disabled, and the disabled display/gate is shown.
- Pre-review implementation adjustment: shared case-selection infrastructure remains in place, but direct page wiring was removed from Deductions, Scenarios, and Quarterly Payments so each individual story can explicitly reconnect to the shared case-routing component.
- Route activation is intentionally commented out in `routeTree.tsx` with `TODO: Implement case ID routing component`; future story work should uncomment and attach the route contract where needed.
- AppShell no longer propagates `caseId` across plan-tool nav links while the routing component is disabled; the propagation contract remains documented in ADR-0026 and covered by helper/component tests.
- UI/UX terminology: the selected control pattern is an Input Group with an appended action, with the native select retained instead of a full Combo Box until searchable case labels or higher case volume justify typeahead.
- `CurrentCaseSelector` uses an overlapping `Case ID` label, native dropdown caret, muted placeholder state, exact select padding, and full-row stacking in the compact header layout.
- Disabled plan-tool action buttons integrate `aria-disabled` and the requested disabled styles: `opacity-50 cursor-not-allowed`.
- Environment convention was corrected for the Pulse UI case service base URL: `CASE_SERVICE_BASE_URL` is loaded from the repo root via Vite `envDir` and exposed through `envPrefix`.

**Pre-Review Changed Files:**

- `src/pulseUI/app/routeTree.tsx`
- `src/pulseUI/components/AppShell.tsx`
- `src/pulseUI/components/ToolHeader.tsx`
- `src/pulseUI/components/ToolHeader.module.css`
- `src/pulseUI/components/CurrentCaseSelector.tsx`
- `src/pulseUI/components/PlanToolCaseGate.tsx`
- `src/pulseUI/shared/planToolCase.ts`
- `src/pulseUI/shared/usePlanToolCase.ts`
- `src/pulseUI/shared/caseApi.ts`
- `src/pulseUI/vite.config.ts`
- `src/pulseUI/pages/deductions/DeductionsPage.tsx`
- `src/pulseUI/pages/scenarios/ScenarioPlannerPage.tsx`
- `src/pulseUI/pages/quarterlyPayments/QuarterlyPaymentsPage.tsx`
- `src/pulseUI/tests/components/CurrentCaseSelector.test.tsx`
- `src/pulseUI/tests/components/PlanToolCaseGate.test.tsx`
- `src/pulseUI/tests/components/ToolHeader.test.tsx`
- `src/pulseUI/tests/shared/planToolCase.test.ts`
- `src/pulseUI/tests/deductions/DeductionsPage.test.tsx`
- `src/pulseUI/tests/scenarios/ScenarioPlannerPage.test.tsx`
- `src/pulseUI/tests/quarterlyPayments/QuarterlyPaymentsPage.test.tsx`
- `src/pulseUI/tests/appShell.test.tsx`
- `.env.example`
- `adr/0026-route-driven-case-context.md`
- `adr/README.md`
- `planning/team/cl-ticket-journal.md`

**Pre-Review Validation Notes:**

- `npm.cmd test` in `src/pulseUI` passed: 16 test files passed, 57 tests passed.
- `npm.cmd test` at the repository root passed: TypeScript typecheck passed, 49 Vitest files passed, 232 tests passed, 1 skipped.
- `git diff --check` passed with no whitespace errors; Git reported only CRLF normalization warnings.

## caleb-latimer-jira136 - SCRUM-136

**Branch:** `caleb-latimer-jira136`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-136

**Summary:** Build the CloudEvents delta-only queue projection consumer with Redis idempotency

**Description:** Reuse the merged stage-changed CloudEvent contract from SCRUM-130, add the transition publisher boundary needed by SCRUM-131, and add Redis-backed idempotency around the SCRUM-132 queue-projection consumer without introducing a second event model.

**Acceptance Criteria:**

- The consumer reuses `stageChangedEvent.ts` as the canonical CloudEvent contract.
- The transition flow exposes a stage-changed publisher port and passes the prior stage into the boundary.
- Duplicate CloudEvent deliveries are skipped through Redis-backed idempotency.
- Redis failures fail closed so the event is retried rather than processed without protection.
- A local cloud-tap script verifies the consumer against a synthetic stage-changed event without AWS.

**Code Connection:**

- `src/typescript/features/taxPlanCycle/stageChangedEvent.ts` now exports the canonical V1 stage-changed CloudEvent schema plus the event factory and publisher input types.
- `src/typescript/features/taxPlanCycle/controllers/transitionController.ts` adds the stage-changed publisher port and forwards the prior stage into the boundary.
- `src/typescript/features/taxPlanCycle/routes.ts` passes the pre-transition stage into the controller.
- `src/typescript/features/taxPlanCycle/infrastructure/cloudEvents/Consumer.ts` parses the canonical CloudEvent, claims idempotency in Redis, and writes the queue projection once.
- `src/typescript/features/taxPlanCycle/infrastructure/cloudEvents/EventDeduplicator.ts` owns the Redis claim/complete/release semantics for processed-event markers.
- `src/typescript/features/taxPlanCycle/infrastructure/cloudEvents/Writer.ts` keeps the DynamoDB upsert adapter separate from the consumer logic.
- `src/typescript/shared/scripts/cloudTap.ts` provides a local synthetic-event tap for manual verification.
- `tests/typescript/features/taxPlanCycle/queueProjectionConsumer.test.ts` covers first delivery, duplicate delivery, and Redis-unavailable behavior.
- `tests/typescript/features/taxPlanCycle/transitionController.test.ts` covers the publisher boundary.
- `tests/typescript/features/taxPlanCycle/stageChangedEvent.test.ts` and `tests/typescript/shared/scripts/cloudTap.test.ts` pin the canonical CloudEvent schema and fixture.

**Project Scope Connection:**

This ticket keeps ADR-0014 cache-aside behavior separate from the idempotency ledger. Redis remains disposable operational state, not the source of truth, and the queue projection itself stays a DynamoDB read model upsert.

**Changed Files:**

- `src/typescript/features/taxPlanCycle/stageChangedEvent.ts`
- `src/typescript/features/taxPlanCycle/controllers/transitionController.ts`
- `src/typescript/features/taxPlanCycle/routes.ts`
- `src/typescript/features/taxPlanCycle/index.ts`
- `src/typescript/index.ts`
- `src/typescript/features/taxPlanCycle/infrastructure/cloudEvents/Consumer.ts`
- `src/typescript/features/taxPlanCycle/infrastructure/cloudEvents/EventDeduplicator.ts`
- `src/typescript/features/taxPlanCycle/infrastructure/cloudEvents/Writer.ts`
- `src/typescript/features/taxPlanCycle/infrastructure/cloudEvents/index.ts`
- `src/typescript/features/taxPlanCycle/infrastructure/cloudEvents/model.ts`
- `src/typescript/shared/scripts/cloudTap.ts`
- `package.json`
- `tests/typescript/features/taxPlanCycle/queueProjectionConsumer.test.ts`
- `tests/typescript/features/taxPlanCycle/transitionController.test.ts`
- `tests/typescript/features/taxPlanCycle/stageChangedEvent.test.ts`
- `tests/typescript/shared/scripts/cloudTap.test.ts`
- `planning/team/cl-ticket-journal.md`

**Validation Notes:**

- Validation has not been run yet after the final cleanup.
- The new `cloud-tap` script is intended to run locally with synthetic events and can optionally use `TAXPULSE_REDIS_URL` if Redis is available.

## caleb-latimer-jira185 - SCRUM-185

**Branch:** `caleb-latimer-jira185`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-185

**Summary:** Draw the TaxPulse data-flow diagram

**Description:** As a Security Engineer, I want a data-flow diagram of TaxPulse, so that the threat model has a clear system picture. This branch adds the detailed architecture markdown for the full TaxPulse data flow and keeps it aligned with the existing ADR-style documentation pattern.

**Acceptance Criteria:**

- A detailed TaxPulse data-flow document exists under `docs/`.
- The document uses Mermaid heavily enough to show the full system flow, not just a single overview graphic.
- The document covers authentication, the Core Case Service, the Tax Engine, the portal, storage, and event-driven side effects.
- Trust boundaries between tenants and between internal and external users are visible in the diagram set.
- The document name follows the `taxPulse_dataFlow.md` naming convention.

**Code Connection:**

- `docs/taxPulse_dataFlow.md`
- `adr/0011-versioned-tax-plan-cycle-api.md`
- `adr/0014-redis-cache-aside-queue-reads.md`
- `adr/0016-fastapi-startup-convention.md`
- `adr/0020-pulse-ui-layered-application-structure.md`
- `adr/0022-tenant-login-hostname-resolution.md`
- `adr/0023-tanstack-query-for-pulse-ui-server-state.md`
- `adr/0026-route-driven-case-context.md`
- `adr/0028-stage-changed-cloudevents-schema.md`
- `docs/stride-threat-model.md`
- `docs/storage-decision-matrix.md`

**Project Scope Connection:**

- Security architecture and threat-model support
- Core Case Service and Tax Engine boundary documentation
- Tenant isolation and trust-boundary documentation
- ADR-aligned design documentation under `docs/`

**Changed Files:**

- `docs/taxPulse_dataFlow.md`
- `planning/team/cl-ticket-journal.md`

**Validation Notes:**

- The document uses Mermaid flowcharts, sequence diagrams, and an ER diagram to cover the full flow.
- The scope sections explicitly call out conditional routing and trust boundaries.
- The naming convention matches the requested `taxPulse_dataFlow.md` form.

## caleb-latimer-jira199 - SCRUM-199

**Branch:** `caleb-latimer-jira199`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-199

**Summary:** Persist Plan Cycle Detail comments and audit trail data

**Description:** As an Advisor, I want Comments and Audit Trail data to load from backend persistence, so that case discussion and history survive refreshes and reflect the real case record.

**Acceptance Criteria:**

- Persist comments keyed to `tax_plan_cycle.case_id` and `tenant_id`.
- Provide tenant-scoped `POST` and `GET` endpoints for case comments.
- Store non-empty trimmed body text with actor, role/context, author display snapshot, and created timestamp.
- Load and submit Plan Cycle Detail Comments through the backend with loading, empty, and error states.
- Keep the Plan Cycle Detail Audit Trail backed by persistence and read-only.
- Redact income and deduction dollar figures before audit entries render.
- Cover persistence, tenant isolation, frontend submission, empty states, and audit redaction with tests.

**Code Connection:** `tax_plan_cycle_comment` was added through a Drizzle-generated migration and schema definition, the tax plan cycle router now exposes append-only comment read/create endpoints, and comment creation writes a `comment_created` audit row in the same database transaction. PulseUI comment queries now use the authenticated case API, the detail Comments tab submits via React Query mutation, and OpenAPI documents both comments and case audit-entry reads.

**Project Scope Connection:** This preserves TaxPulse tenant isolation and append-only case history while moving user-facing case collaboration out of local mock state and into Core Case Service persistence.

**Changed Files:**

- `src/typescript/shared/database/schema.ts`
- `src/typescript/shared/database/drizzle-migrations/0021_military_shiva.sql`
- `src/typescript/shared/database/drizzle-migrations/meta/0021_snapshot.json`
- `src/typescript/shared/database/drizzle-migrations/meta/_journal.json`
- `src/typescript/features/taxPlanCycle/comments.ts`
- `src/typescript/features/taxPlanCycle/repositories/comments.ts`
- `src/typescript/features/taxPlanCycle/routes.ts`
- `src/typescript/features/taxPlanCycle/index.ts`
- `src/typescript/shared/database/seed.model.ts`
- `src/typescript/shared/database/seed.ts`
- `src/typescript/coreCaseOpenApi.ts`
- `src/typescript/index.ts`
- `src/pulseUI/entities/taxPlanCycleQueries.ts`
- `src/pulseUI/pages/taxPlanCycle/Details.tsx`
- `tests/typescript/features/taxPlanCycle/commentsMigration.test.ts`
- `tests/typescript/features/taxPlanCycle/repositories/comments.test.ts`
- `tests/typescript/features/taxPlanCycle/routes.test.ts`
- `tests/typescript/features/taxPlanCycle/mainComposition.test.ts`
- `tests/typescript/coreCaseOpenApi.test.ts`
- `src/pulseUI/tests/taxPlanCycle/queries.test.ts`
- `src/pulseUI/tests/taxPlanCycle/Details.test.tsx`
- `planning/team/cl-ticket-journal.md`

**Validation Notes:**

- The comments migration was regenerated after merging development and now follows development migrations 0019 and 0020 as migration 0021.
- `npm run db:check` passed with no Drizzle journal or snapshot consistency errors.
- `npm run typecheck:core` passed.
- Focused backend regression coverage passed: 92 tests across comments persistence/migration, Tax Plan Cycle routes and integration, OpenAPI, and application composition.
- Focused PulseUI regression coverage passed: 34 tests across Plan Cycle Detail comments, the existing hold UI, and Tax Plan Cycle queries.
- The merge result was compared with development; the remaining delta is limited to the SCRUM-199 files listed above, and existing development behavior in the shared conflict files remains covered.

## caleb-latimer-jira218 - SCRUM-218

**Branch:** `caleb-latimer-jira218`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-218

**Summary:** Persist income events and replace mock Income table data

**Description:** Add the Core Case Service `income_event` table, generated Drizzle
migration, tenant-scoped repository/service boundary, persisted read and create routes,
synthetic seed data, and Pulse UI create mutation so the Income table no longer depends
on deterministic backend mocks.

**Acceptance Criteria:**

- A generated Drizzle migration creates `income_event` with UUID identity, Tax Plan Cycle
  ownership, event date, source, known type, amount, and withholding columns.
- Database checks reject blank sources and negative monetary values, and an index supports
  case-and-date reads.
- GET returns persisted tenant-scoped rows while preserving empty and not-found semantics.
- POST validates source, type, amount, and withholding, assigns the current UTC date, and
  returns the persisted row.
- Deterministic synthetic seed rows replace the removed mock generator.
- The existing Add Income form persists through an authenticated mutation and refreshes
  the case-scoped Income query.
- OpenAPI and automated tests cover the read/create contract and database boundary.

**Code Connection:**

- Added the canonical income-event enum and table to the shared Drizzle schema and
  generated `0019_create_income_event` with Drizzle Kit.
- Added an income-event repository that verifies tenant ownership through
  `tax_plan_cycle`, plus a service that owns UTC date assignment through an injectable
  clock.
- Replaced the mocked Express GET implementation and added the matching POST operation.
- Added three checked-in synthetic rows to the canonical seed flow.
- Added the Pulse UI create client and TanStack mutation, invalidating the selected case's
  income-event query after successful persistence.

**Project Scope Connection:**

This work lives in the TypeScript Core Case Service persistence boundary, with a narrow
Pulse UI integration for the existing Income form and table. It builds on SCRUM-31,
SCRUM-106, SCRUM-108, and SCRUM-109; supersedes SCRUM-172's table intent and the
income-event portion of SCRUM-174; and enables SCRUM-175 and SCRUM-176. The Python Tax
Engine, update/delete operations, and SQL-side KPI aggregation remain out of scope.

**Changed Files:**

- `src/typescript/shared/database/schema.ts`
- `src/typescript/shared/database/drizzle-migrations/0019_create_income_event.sql`
- `src/typescript/shared/database/drizzle-migrations/meta/0019_snapshot.json`
- `src/typescript/shared/database/drizzle-migrations/meta/_journal.json`
- `src/typescript/shared/database/seed.model.ts`
- `src/typescript/shared/database/seed.ts`
- `src/typescript/features/incomeEvents/incomeEvents.ts`
- `src/typescript/features/incomeEvents/repository.ts`
- `src/typescript/features/incomeEvents/service.ts`
- `src/typescript/features/incomeEvents/routes.ts`
- `src/typescript/features/incomeEvents/index.ts`
- `src/typescript/shared/scripts/typecheck.mjs`
- `src/typescript/features/incomeEvents/mockIncomeEvents.model.ts` (removed)
- `src/typescript/coreCaseOpenApi.ts`
- `src/typescript/index.ts`
- `src/pulseUI/entities/incomeQueries.ts`
- `src/pulseUI/pages/income/IncomeEntryForm.tsx`
- `src/pulseUI/pages/income/incomeEntrySchema.ts`
- `src/pulseUI/pages/income/IncomePage.tsx`
- `src/pulseUI/tests/components/IncomeEntryForm.test.tsx`
- `src/pulseUI/tests/entities/incomeQueries.test.tsx`
- `src/pulseUI/tests/income/IncomePage.test.tsx`
- `tests/typescript/coreCaseOpenApi.test.ts`
- `tests/typescript/features/incomeEvents/migration.test.ts`
- `tests/typescript/features/incomeEvents/repository.test.ts`
- `tests/typescript/features/incomeEvents/routes.test.ts`
- `tests/typescript/features/incomeEvents/schema.test.ts`
- `tests/typescript/features/incomeEvents/service.test.ts`
- `tests/typescript/features/taxPlanCycle/mainComposition.test.ts`
- `tests/typescript/bootstrap/migrationTestUtils.ts`
- `tests/typescript/features/incomeEvents/mockIncomeEvents.model.test.ts` (removed)
- `package.json`
- `package-lock.json`
- `src/pulseUI/package-lock.json`
- `osv-scanner.toml`
- `planning/team/cl-ticket-journal.md`

**Validation Notes:**

- `npm run typecheck`, `npm run build`, and `npm run db:check` passed.
- The focused Jira 218 backend suite passed 8 files and 41 tests, including migration,
  database repository, schema, service, authenticated route, application composition,
  OpenAPI, and evaluation-contract coverage.
- Full Pulse UI verification passed 49 files and 264 tests, the 6-test accessibility
  gate, and the Vite production build. The focused Income UI suite passed 15 tests.
- The composition test now covers JWT tenant propagation through middleware, router, and
  service to the repository port for both persisted GET and POST operations.
- The exact Semgrep pipeline command passed with zero ERROR findings after fixing the
  dynamic child-process executable pattern in the shared typecheck runner.
- The exact Bandit high-severity pipeline command passed with zero high findings.
- Patch-level dependency fixes update Undici, Nano ID, PostCSS, and brace expansion.
  Narrow OSV exceptions document the remaining development-only esbuild, Lighthouse
  OpenTelemetry, and extract-zip advisories whose fixed majors require a newer Node
  runtime than the repository's pinned Node 22.0.0.
- A full root Vitest run exposed and corrected the income seed assertion; unrelated
  concurrent database tests later timed out under shared Testcontainers contention and
  are excluded as requested. The Jira 218 database tests pass reliably in isolation.
- `git diff --check` passed with only line-ending normalization warnings.
