# Martins Okorie Ticket Journal

**Owner:** Martins Okorie  
**Branch prefix:** `martins-okorie-`

Add new ticket entries below using this template.

## martins-okorie-jira209 - SCRUM-209

**Branch:** `martins-okorie-jira209`

**Assignee:** Martins Okorie

**Jira Key:** SCRUM-209

**Summary:** Case ID harness refinement: adjust to user name

**Description:** Case ID harness currently allowed advisors to select a
client's case by UUID because that was the only identifier available when the
selector was implemented. With friendly client naming now available from the
cycle payload or client roster, the selector should show a human-readable client
case label while preserving UUID mapping under the hood.

**Acceptance Criteria:**

- The current case selector renders a user-friendly client case label instead
  of exposing the full UUID as the primary option text.
- The selector still submits and routes with the full UUID value.
- Duplicate-name disambiguation is preserved with a short case identifier.

**Code Connection:** Refines the `CurrentCaseSelector` used by plan tools such
as Income, Deductions, Scenarios, and Quarterly Payments. The selector now
formats options as `Client Name (last4)` when a name is present, consults the
client roster as an under-the-hood ID-to-name mapping, and keeps the full case
UUID as the option value for existing route/query behavior.

**Project Scope Connection:** Supports the React SPA operator experience by
making case selection easier for advisors without weakening scoped access,
tenant isolation, or the Tax Plan Cycle UUID contract used by backend APIs.

**Changed Files:**

- `src/pulseUI/components/CurrentCaseSelector.tsx`
- `src/pulseUI/entities/taxPlanCycle.ts`
- `src/pulseUI/entities/taxPlanCycleQueries.ts`
- `src/pulseUI/tests/components/CurrentCaseSelector.test.tsx`
- `src/pulseUI/tests/deductions/DeductionsPage.test.tsx`
- `src/pulseUI/tests/income/IncomePage.test.tsx`
- `src/pulseUI/tests/quarterlyPayments/QuarterlyPaymentsPage.test.tsx`
- `src/pulseUI/tests/scenarios/ScenarioPlannerPage.test.tsx`
- `src/pulseUI/tests/taxPlanCycle/Queue.test.tsx`
- `src/typescript/features/taxPlanCycle/repositories/repository.ts`
- `src/typescript/features/taxPlanCycle/taxPlanCycle.ts`
- `src/typescript/shared/scripts/cloudTap.ts`
- `tests/typescript/features/taxPlanCycle/integration.test.ts`
- `tests/typescript/features/taxPlanCycle/mainComposition.test.ts`
- `tests/typescript/features/taxPlanCycle/taxPlanCycle.test.model.ts`
- `tests/typescript/shared/scripts/presentToClientLambda.test.ts`
- `planning/team/mm-ticket-journal.md`

**Validation Notes:**

- `npm run typecheck:core` passed.
- `npm --prefix src/pulseUI run verify` passed, including type checks, unit and
  component tests, accessibility tests, and a production build.
- `npm run test:vitest -- tests/typescript/features/taxPlanCycle/mainComposition.test.ts`
  passed, including the queue response assertion for `client_name`.
- `npm run test:vitest -- tests/typescript/features/taxPlanCycle/integration.test.ts -t "lists a tenant's queue by due date and flags overdue cycles"`
  passed, including the repository queue assertion for roster-backed `client_name`.

## martins-okorie-jira167 - SCRUM-167

**Branch:** `martins-okorie-jira167`
**Assignee:** Martins Okorie
**Jira Key:** SCRUM-167
**Summary:** Scan images and produce SBOMs with Trivy and Syft

**Description:** As a Security Engineer, I want Trivy and Syft in the release
pipeline, so that images are scanned and have a machine-readable bill of
materials. This ticket adds a GitHub Actions workflow that builds the two
project container images (`taxpulse-core-case` and `taxpulse-tax-engine`),
runs Trivy vulnerability scanning against each, generates SPDX-JSON SBOMs
with Syft, and publishes all reports as build artifacts.

**Acceptance Criteria:**
- Trivy scans the container images and fails on a high-severity vulnerability.
- Syft produces an SBOM per image.
- The reports are published as build artifacts.

**Code Connection:** Builds on the existing container image definitions in
`Dockerfile` (Core Case Service) and `Dockerfile.tax-engine` (Tax Engine)
already validated by the `container-validation` job in
`build-test-quality.yml`. Follows the Blacksmith runner and workflow
conventions established by SCRUM-163 (Terraform security gate), SCRUM-165
(SAST gate), and SCRUM-166 (dependency/secret gate). Uses the same image
tags (`taxpulse-core-case`, `taxpulse-tax-engine`) pinned to `$GITHUB_SHA`.

**Project Scope Connection:** Part of the Sprint 5 IaC, Secure Pipeline &
Observability epic (SCRUM-20). Sits between SCRUM-166 (OSV/Gitleaks) and
SCRUM-168 (Cosign signing) in the security gate chain. Provides the SBOM
contract that SCRUM-168 can reference for provenance verification.

**Changed Files:**
- `.github/workflows/container-scan-sbom.yml` — **[NEW]** release-pipeline
  workflow that builds both container images, runs Trivy scans (table + JSON
  reports, exit-code 1 on HIGH/CRITICAL), generates SPDX-JSON SBOMs via
  Syft, and uploads all outputs as build artifacts with 90-day retention.
- `planning/team/mm-ticket-journal.md` — added this journal entry.

**Validation Notes:**
- Workflow YAML passes `actionlint` or manual syntax review.
- Trivy step uses `exit-code: "1"` to gate the pipeline on HIGH/CRITICAL
  vulnerabilities, satisfying AC-1.
- Syft generates one SBOM per image in SPDX-JSON format, satisfying AC-2.
- Both Trivy reports and SBOMs are uploaded via `actions/upload-artifact@v4`
  with 90-day retention, satisfying AC-3.
- `if: always()` ensures JSON report, SBOM, and upload steps run even when
  Trivy fails the build, so artifacts are always available for triage.


## martins-okorie-jira164 - SCRUM-164

**Branch:** `martins-okorie-jira164`

**Assignee:** Martins Okorie

**Jira Key:** SCRUM-164

**Summary:** Modularize ECS, Lambda, and SPA delivery in Terraform

**Description:** As a Platform Engineer, I want reusable Terraform modules, so
that the whole stack provisions from one root configuration.

**Acceptance Criteria:**

- Separate modules exist for the ECS services, the Lambda consumers, and the SPA
  delivery.
- A root configuration wires the modules and outputs the public URLs.
- Module inputs are documented with required variables.

**Code Connection:** Re-homed the SCRUM-164 delivery modules into the active
SCRUM-163-scanned `terraform/` root after merging `development`. The ECS module
translates the SCRUM-157/158 JSON contracts into ECR repositories, IAM roles,
CloudWatch log groups, an internet-facing ALB, target groups, listener rules,
task definitions, and Fargate services while reusing the SCRUM-162 VPC, private
subnets, public subnets, and ECS service security group. The Lambda module
translates the SCRUM-159/160 contracts into transition Lambdas, API Gateway
routes, shared IAM runtime permissions, and an optional SQS event-source mapping
for the stage-changed consumer. The SPA module translates the SCRUM-161 contract
into a private KMS-encrypted S3 origin, CloudFront Origin Access Control,
CloudFront distribution, SPA route fallback rewrites, scoped KMS decrypt/data-key
permissions for the CloudFront distribution, and deploy outputs.

**Project Scope Connection:** This closes the handoff from placeholder deployment
JSON to reusable infrastructure-as-code while preserving the already-merged
SCRUM-163 Terraform security gate and SCRUM-165 SAST gate. The JSON files remain
source contracts with `SCRUM-164_*` placeholders, while Terraform now owns the
concrete AWS resources and exposes the public API, transition API, SPA bucket,
and CloudFront outputs needed by later pipeline, security, and observability
tickets.

**Changed Files:**

- `.gitignore`
- `terraform/README.md`
- `terraform/delivery.tf`
- `terraform/outputs.tf`
- `terraform/variables.tf`
- `terraform/modules/ecs_services/README.md`
- `terraform/modules/ecs_services/main.tf`
- `terraform/modules/ecs_services/outputs.tf`
- `terraform/modules/ecs_services/variables.tf`
- `terraform/modules/lambda_consumers/README.md`
- `terraform/modules/lambda_consumers/main.tf`
- `terraform/modules/lambda_consumers/outputs.tf`
- `terraform/modules/lambda_consumers/variables.tf`
- `terraform/modules/spa_delivery/README.md`
- `terraform/modules/spa_delivery/main.tf`
- `terraform/modules/spa_delivery/outputs.tf`
- `terraform/modules/spa_delivery/variables.tf`
- `terraform/vpc.tf`
- `tests/typescript/workflows/terraformDeliveryModules.test.ts`
- `planning/team/mm-ticket-journal.md`

**Validation Notes:**

- Merged `development` into `martins-okorie-jira164` and preserved the
  development-owned SCRUM-163/165 workflows and Terraform provider/backend root.
- `terraform -chdir=terraform fmt -check -recursive` passed.
- `terraform -chdir=terraform init -backend=false` passed.
- `terraform -chdir=terraform validate` passed.
- `npm run test:vitest -- tests/typescript/workflows/terraformSecurityGate.test.ts
  tests/typescript/workflows/sastSecurityGate.test.ts` passed.
- `npm run typecheck` passed after refreshing local dependencies from the merged
  lockfile.
- `checkov -d terraform --framework terraform --hard-fail-on HIGH --compact
  --quiet` completed with exit code `0`; Checkov reported non-blocking lower
  severity findings already outside the hard-fail threshold.
- `docker run --rm -v "$PWD:/src" aquasec/tfsec-ci tfsec /src/terraform
  --minimum-severity HIGH --no-color` passed with no problems detected.
- Did not run `terraform apply` against the sandbox because manually-created
  SCRUM-157/158 resources already exist and should be imported into state before
  Terraform manages those exact names.
- Follow-up correctness pass aligned the Lambda action-item-created topic
  environment variable with the runtime, added Cloud Map private DNS so the Core
  Case `LIABILITY_ENGINE_BASE` points at a Terraform-managed Tax Engine service
  name, made the optional stage-changed consumer SQS ARN optional unless that
  consumer is enabled, and reshaped the NAT gateway prerequisite to use an EIP
  plus public subnet.
- Follow-up review pass added a scoped SPA KMS key policy that grants
  `cloudfront.amazonaws.com` `kms:Decrypt` and `kms:GenerateDataKey` only when
  `AWS:SourceArn` matches the Terraform-managed CloudFront distribution ARN, and
  clarified that `stage_changed_queue_arn` is required only when the optional
  stage-changed consumer Lambda is enabled.
- Added `tests/typescript/workflows/terraformDeliveryModules.test.ts` to guard
  the SCRUM-164 Terraform wiring for Lambda env names, service discovery,
  optional SQS permissions, and NAT gateway shape.
- Follow-up `terraform -chdir=terraform fmt -check -recursive` passed.
- Follow-up `npm test --
  tests/typescript/workflows/terraformDeliveryModules.test.ts
  tests/typescript/spaDeliveryDefinitions.test.ts
  tests/typescript/ecsTaskDefinitions.test.ts
  tests/typescript/albJsonDefinitions.test.ts` passed.
- Follow-up `terraform -chdir=terraform init -backend=false` passed without
  applying changes or initializing the remote backend, but `terraform
  -chdir=terraform validate` is currently blocked by the local cached AWS
  provider failing its plugin schema handshake.
- Review-fix `terraform fmt -recursive terraform` passed.
- Review-fix `terraform -chdir=terraform fmt -check -recursive` passed.
- Review-fix `npm test -- tests/typescript/workflows/terraformDeliveryModules.test.ts`
  passed after TypeScript typecheck and 5 Vitest assertions.
- Review-fix `terraform -chdir=terraform validate` remains blocked by the local
  cached AWS provider schema handshake failure for
  `.terraform/providers/registry.terraform.io/hashicorp/aws/6.61.0/darwin_arm64/terraform-provider-aws_v6.61.0_x5`.

## martins-okorie-jira161 - SCRUM-161

**Branch:** `martins-okorie-jira161`

**Assignee:** Martins Okorie

**Jira Key:** SCRUM-161

**Summary:** Serve the SPA from S3 behind CloudFront

**Description:** As a Platform Engineer, I want the SPA served from S3 via
CloudFront, so that users load the app from an edge-cached CDN.

**Acceptance Criteria:**

- The built SPA is synced to a private S3 bucket served only through CloudFront.
- SPA client-side routes resolve to index.html via the CloudFront error/rewrite
  config.
- A deploy invalidates the CloudFront cache for changed assets.

**Code Connection:** Added a `deployment/spa/` production handoff contract for
the TaxPulse SPA delivery layer. The contract defines a private S3 origin bucket,
public-access blocking, CloudFront Origin Access Control, a CloudFront
distribution with HTTPS redirects, `index.html` as the default root object, and
403/404 rewrites back to `/index.html` for client-side routes. Added deploy
configuration that records how `src/pulseUI/dist` should sync to S3 with
cache-aware headers and create a CloudFront invalidation for `/*` once
SCRUM-164 or the release pipeline supplies real resources.

**Project Scope Connection:** This completes the SCRUM-19 SPA delivery contract
that sits after the SCRUM-158 ALB/API layer. It gives SCRUM-164 a concrete
Terraform target for the static frontend module while preserving the separation
between build artifacts, private S3 origin access, and public CloudFront edge
delivery.

**Changed Files:**

- `deployment/spa/README.md`
- `deployment/spa/bucket.json`
- `deployment/spa/bucket-policy.json`
- `deployment/spa/cloudfront-distribution.json`
- `deployment/spa/deploy-config.json`
- `deployment/spa/origin-access-control.json`
- `tests/typescript/spaDeliveryDefinitions.test.ts`
- `package.json`
- `planning/team/mm-ticket-journal.md`

**Validation Notes:**

- The SPA delivery JSON uses `SCRUM-164_*` placeholders for Terraform-owned S3
  bucket, CloudFront distribution, Origin Access Control, cache policy, and
  distribution identifiers.
- The bucket contract blocks public access; the bucket policy allows read access
  only from the CloudFront service principal scoped to the distribution ARN.
- The CloudFront contract rewrites 403 and 404 responses to `/index.html` with a
  `200` response so SPA client-side routes survive direct navigation and refresh.
- The deploy contract syncs hashed assets with immutable cache headers, uploads
  `index.html` with no-cache headers, and invalidates `/*`; executable deploy
  automation is left to SCRUM-164 or the release pipeline.
- `npm run test:vitest -- tests/typescript/spaDeliveryDefinitions.test.ts`
  passed.
- `npm run typecheck` passed.

## martins-okorie-jira158 - SCRUM-158

**Branch:** `martins-okorie-jira158`

**Assignee:** Martins Okorie

**Jira Key:** SCRUM-158

**Summary:** Route ALB traffic and auto-replace unhealthy tasks

**Description:** As a Platform Engineer, I want an ALB routing to the services
with health-based replacement, so that the APIs are reachable and self-healing.

**Acceptance Criteria:**

- The ALB routes `/v1` case traffic and calculation traffic to the correct
  service.
- A task that fails its health check is replaced automatically.
- A smoke request through the ALB reaches each service.

**Code Connection:** Added AWS CLI input JSON for the SCRUM-158 ALB layer around
the SCRUM-157 task definitions and created the backing AWS resources. The ALB
JSON defines an internet-facing Application Load Balancer in the discovered
public subnets, Fargate-compatible `ip` target groups for the Core Case Service
and Tax Engine, an HTTP listener, and path routing for `/v1/*`,
`/tax-calculations`, and `/scenarios/comparisons`. Created dedicated security
groups so the ALB is internet-facing on port `80`, while service traffic on
ports `3000` and `8000` is allowed only from the ALB security group. Added ECS
cluster and service JSON that attaches each Fargate service to its target group
with desired count, health check grace period, and rolling replacement settings.
The ALB and service JSON is production-shaped for the later Terraform work: the
ALB is intended for SCRUM-162 public subnets, tasks are intended for SCRUM-162
private subnets with public IP assignment disabled, service ingress comes only
from the ALB security group, and RDS PostgreSQL plus ElastiCache Redis remain
external managed dependencies.

**Project Scope Connection:** This builds directly on SCRUM-157 by taking the
registered task definitions and defining how the long-lived API tasks become
reachable, health-checked ECS services behind an ALB in the team AWS account.

**Changed Files:**

- `deployment/ecs/README.md`
- `deployment/alb/load-balancer.json`
- `deployment/alb/security-groups.json`
- `deployment/alb/core-case-target-group.json`
- `deployment/alb/tax-engine-target-group.json`
- `deployment/alb/listener.json`
- `deployment/alb/core-case-listener-rule.json`
- `deployment/alb/tax-engine-listener-rule.json`
- `tests/typescript/albJsonDefinitions.test.ts`
- `deployment/ecs/cluster.json`
- `deployment/ecs/core-case-service.json`
- `deployment/ecs/tax-engine-service.json`
- `src/typescript/shared/scripts/albSmoke.ts`
- `package.json`
- `planning/team/mm-ticket-journal.md`

**Validation Notes:**

- Created ALB security group `sg-018ec94c7599d219c`.
- Created ECS service security group `sg-0820ddfb63117696a`.
- Created ALB `taxpulse-api-alb`:
  `arn:aws:elasticloadbalancing:us-east-1:814650854375:loadbalancer/app/taxpulse-api-alb/962b5650b94eda05`.
- Created target groups:
  `arn:aws:elasticloadbalancing:us-east-1:814650854375:targetgroup/taxpulse-core-case/05b4e6ffa119fc42`
  and
  `arn:aws:elasticloadbalancing:us-east-1:814650854375:targetgroup/taxpulse-tax-engine/306b27944c5a636a`.
- Created listener:
  `arn:aws:elasticloadbalancing:us-east-1:814650854375:listener/app/taxpulse-api-alb/962b5650b94eda05/40b773b1fa8f01e8`.
- Created listener rules for `/v1/*`, `/tax-calculations`, and
  `/scenarios/comparisons`.
- Created ECS cluster:
  `arn:aws:ecs:us-east-1:814650854375:cluster/taxpulse-api`.
- Registered task definitions:
  `arn:aws:ecs:us-east-1:814650854375:task-definition/taxpulse-core-case-service:1`
  and
  `arn:aws:ecs:us-east-1:814650854375:task-definition/taxpulse-tax-engine:1`.
- Created ECS services:
  `arn:aws:ecs:us-east-1:814650854375:service/taxpulse-api/core-case-service`
  and
  `arn:aws:ecs:us-east-1:814650854375:service/taxpulse-api/tax-engine`.
- Tax Engine reached steady state behind the ALB target group with one healthy
  Fargate task.
- Core Case Service was created and ECS auto-replaced failed tasks, but the
  container exits with `connect ECONNREFUSED 127.0.0.1:5432`; the shared
  `DATABASE_URL` secret needs to point at a reachable database before the Core
  Case smoke request can pass.
- The 157/158 JSON files now preserve the production handoff contract for
  SCRUM-162/164: ECR app images, Secrets Manager database credentials, managed
  Redis endpoint placeholder, public ALB subnet placeholders, private ECS subnet
  placeholders, Terraform-owned listener/target-group ARN placeholders, and
  ALB-only service ingress.
- Added `npm run aws:alb-smoke` to verify the ALB routes
  `GET /v1/tax-plan-cycles` to Core Case and `POST /tax-calculations` to the Tax
  Engine with a bearer token.
- `npm run typecheck` passed.
- `npm run test:vitest -- tests/typescript/ecsTaskDefinitions.test.ts
  tests/typescript/albJsonDefinitions.test.ts` passed.

## martins-okorie-jira157 - SCRUM-157

**Branch:** `martins-okorie-jira157`

**Assignee:** Martins Okorie

**Jira Key:** SCRUM-157

**Summary:** Define ECS Fargate task definitions for the services

**Description:** As a Platform Engineer, I want ECS Fargate task definitions, so
that the long-lived APIs have a managed runtime.

**Acceptance Criteria:**

- Task definitions exist for the Core Case Service and the Tax Engine images.
- Each task specifies CPU, memory, env, and a container healthcheck.
- The tasks pull from the image registry and register with the cluster.

**Code Connection:** Added ECS Fargate task definition JSON for the Core Case
Service and Tax Engine containers, translating the SCRUM-155 Compose contracts
into AWS task runtime settings. The task definitions declare ECR image references
that must be replaced with immutable pushed image tags, Fargate `awsvpc`
networking, CPU and memory, container ports, environment values, Secrets Manager
references, `/health` container health checks, and CloudWatch Logs
configuration. The discovered account ID, SNS topic, SQS queue, shared Secrets
Manager ARN, and existing log groups are wired into the definitions; missing ECR
repositories and ECS IAM roles remain explicit placeholders.

**Project Scope Connection:** This advances the Containers, Serverless &
Deployment workstream by defining the managed runtime contract for TaxPulse's
long-lived APIs while leaving ECS services, ALB routing, and health-based
replacement to SCRUM-158.

**Changed Files:**

- `deployment/ecs/core-case-service.task-definition.json`
- `deployment/ecs/tax-engine.task-definition.json`
- `deployment/ecs/README.md`
- `tests/typescript/ecsTaskDefinitions.test.ts`
- `planning/team/mm-ticket-journal.md`

**Validation Notes:**

- `npm run test:vitest -- tests/typescript/ecsTaskDefinitions.test.ts` passed.
- `node -e "JSON.parse(...)"` smoke-parsed both ECS task definition JSON files.
- `AWS_DEFAULT_REGION=us-east-1 aws ecs register-task-definition --cli-input-json
  file://deployment/ecs/core-case-service.task-definition.json
  --generate-cli-skeleton output` passed.
- `AWS_DEFAULT_REGION=us-east-1 aws ecs register-task-definition --cli-input-json
  file://deployment/ecs/tax-engine.task-definition.json
  --generate-cli-skeleton output` passed.
- `npm run typecheck` was attempted but is currently blocked by a pre-existing
  case-only path conflict between `CloudEvents` and `cloudEvents` imports under
  `src/typescript/features/taxPlanCycle/infrastructure`.

## martins-okorie-jira126 - SCRUM-126

**Branch:** `martins-okorie-jira126`

**Assignee:** Christopher Martus

**Jira Key:** SCRUM-126

**Summary:** Add accessibility and component tests for the Client Roster screen

**Description:** As a Frontend Developer, I want accessibility and component tests
for the Client Roster screen, so that the roster is usable and stable.

**Acceptance Criteria:**

- An axe accessibility check runs against the rendered Client Roster screen and
  reports no violations.
- Component coverage verifies the roster table renders mocked `/v1/clients` rows.
- Component coverage verifies the empty state and client column sorting behavior.

**Code Connection:** The Client Roster page test suite now includes an axe check
that reuses the mocked `caseApiGetJson` `/v1/clients` data path, waits for the
accessible roster table, and asserts zero violations. The existing component tests
continue to cover table rendering, empty state behavior, TanStack column sorting,
nullable quarterly status sorting, loading, retry, and error states.

**Project Scope Connection:** This protects the Client Roster workspace in the
advisor-facing React app, where tenant-scoped client records are listed, scanned,
and sorted before advisors open deeper tax planning workflows.

**Changed Files:**

- `src/pulseUI/pages/clients/ClientRosterPage.tsx`
- `src/pulseUI/pages/clients/ClientRosterPage.module.css`
- `src/pulseUI/tests/clients/ClientRosterPage.test.tsx`
- `planning/team/mm-ticket-journal.md`

**Validation Notes:**

- `npm --prefix src/pulseUI run test:vitest -- tests/clients/ClientRosterPage.test.tsx tests/clients/ClientRosterQueries.test.tsx`
  passed.
- `npm --prefix src/pulseUI run typecheck` passed.

## martins-okorie-jira148 - SCRUM-148

**Branch:** `martins-okorie-jira148`

**Assignee:** Chimaobi Martins Okorie

**Jira Key:** SCRUM-148

**Summary:** Add loading, empty, and error states to the Team & Users screen

**Description:** As a Frontend Developer, I want the Team & Users screen to render
loading, empty, and error states, so that the screen behaves predictably while data
resolves.

**Acceptance Criteria:**

- A loading skeleton renders while the users request is in flight.
- An empty state renders when the firm users endpoint returns no tenant users;
  admin-only rosters remain visible so Firm Admins can see one another.
- An error state renders with a retry affordance on request failure.

**Code Connection:** The Team & Users page now consumes the SCRUM-147
`useFirmUsersQuery` request state directly, keeps the existing Team & Users shell
mounted, and switches the roster region between a table skeleton, an empty state for
tenants with zero returned users, a retryable error state, and the existing data
table. A review follow-up removed the `hasUsersBeyondAdmin` guard so multiple Firm
Admins render in the roster instead of producing an empty table area.

**Project Scope Connection:** This completes the Team & Users request-state behavior
for the firm administration workspace while preserving tenant-scoped user data access
through the existing TanStack Query hook boundary.

**Changed Files:**

- `src/pulseUI/pages/firm/TeamUsersPage.tsx`
- `src/pulseUI/pages/firm/TeamUsersPage.module.css`
- `src/pulseUI/tests/firm/TeamUsersPage.test.tsx`
- `planning/team/mm-ticket-journal.md`

**Validation Notes:**

- `npm test -- TeamUsersPage FirmUserQueries` passed.
- `npm run typecheck` passed from `src/pulseUI`.
- `npm --prefix src/pulseUI run test:vitest -- tests/firm/TeamUsersPage.test.tsx`
  passed after adding the admin-only roster regression case.

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
callers. Added the matching tenant-scoped Express endpoint with deterministic synthetic
income rows so local runtime behavior matches the hook contract until persisted income
events land.

**Project Scope Connection:** This completes the frontend data-fetching contract for
the Income screen and adds a read-only Core Case service endpoint for the queried income
events. The endpoint validates auth context and tenant-scoped case ownership through
the Tax Plan Cycle repository; durable income-event persistence remains tracked
separately by later income-backend work such as SCRUM-172. The mocked response test
keeps SCRUM-106 usable as a typed handoff for SCRUM-107, SCRUM-108, and SCRUM-109.

**Changed Files:**

- `src/pulseUI/entities/incomeQueries.ts`
- `src/pulseUI/tests/entities/incomeQueries.test.tsx`
- `src/typescript/features/incomeEvents/incomeEvents.ts`
- `src/typescript/features/incomeEvents/index.ts`
- `src/typescript/features/incomeEvents/mockIncomeEvents.model.ts`
- `src/typescript/features/incomeEvents/routes.ts`
- `src/typescript/index.ts`
- `tests/typescript/features/incomeEvents/mockIncomeEvents.model.test.ts`
- `tests/typescript/features/incomeEvents/routes.test.ts`
- `planning/team/mm-ticket-journal.md`

**Validation Notes:**

- `npm --prefix src/pulseUI run typecheck` passed.
- `npm --prefix src/pulseUI run test -- incomeQueries.test.tsx` passed with 1 file and
  3 tests.
- `npm run test:vitest -- tests/typescript/features/incomeEvents/mockIncomeEvents.model.test.ts tests/typescript/features/incomeEvents/routes.test.ts`
  passed with 2 files and 4 tests.
- `npm run typecheck` passed.
- Refreshed `src/pulseUI` dependencies with `npm --prefix src/pulseUI install` because
  the latest development branch references `@playwright/test` types and the local
  dependency tree was missing them. npm reported the existing Node engine mismatch
  (`22.0.0` required, `24.17.0` used), 23 audit findings, and pending install-script
  approvals.

## martins-okorie-jira107 - SCRUM-107

**Branch:** `martins-okorie-jira107`

**Assignee:** Dylan Harle

**Jira Key:** SCRUM-107

**Summary:** Add loading, empty, and error states to the Income screen

**Description:** As a Frontend Developer, I want the Income screen to render loading,
empty, and error states, so that the screen behaves predictably while data resolves.

**Acceptance Criteria:**

- A loading skeleton renders while the income request is in flight.
- An empty state renders when the client has no income events.
- An error state renders with a retry affordance on request failure.

**Code Connection:** Wired the Income route into the shared plan-tool case search flow
and connected the screen to the SCRUM-106 `useIncomeEventsQuery` hook. The Income
screen now renders an accessible skeleton while the request is pending, shows the
existing empty-state affordance only after a successful empty response, and displays a
retryable error state when the request fails.

**Project Scope Connection:** This moves the Income screen from an inert scaffold to a
query-aware plan tool while preserving tenant-scoped case selection. Add-income
persistence remains out of scope until the backend income endpoint and table exist.

**Changed Files:**

- `src/pulseUI/app/routeTree.tsx`
- `src/pulseUI/pages/income/IncomePage.tsx`
- `src/pulseUI/pages/income/IncomePage.module.css`
- `src/pulseUI/tests/appShell.test.tsx`
- `src/pulseUI/tests/income/IncomePage.test.tsx`
- `planning/team/mm-ticket-journal.md`

**Validation Notes:**

- `npm --prefix src/pulseUI run typecheck` passed.
- `npm --prefix src/pulseUI run test -- IncomePage.test.tsx incomeQueries.test.tsx appShell.test.tsx`
  passed with 3 files and 27 tests.
- `npm --prefix src/pulseUI run test` passed with 33 files and 141 tests. The run
  printed existing stderr from intentional scenario error-path coverage and jsdom's
  missing canvas implementation during axe checks, but all tests passed.

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

## martins-okorie-jira139 - SCRUM-139

**Branch:** `martins-okorie-jira139`

**Assignee:** Chimaobi Martins Okorie

**Jira Key:** SCRUM-139

**Summary:** Generate the SOAP TIN/EIN client from the WSDL

**Description:** As a Backend Developer, I want a node-soap client for the TIN/EIN
service, so that Intake can validate a client's tax identifier.

**Acceptance Criteria:**

- A node-soap client consumes the WSDL and exposes the TIN/EIN validation operation.
- A call against a stub SOAP service returns a raw validation response.
- A test asserts the operation is callable with a sample TIN/EIN.

**Code Connection:** Added a raw `node-soap` TIVS client under the Tax Plan Cycle
infrastructure layer. The client loads the WSDL, overrides the legacy WSDL endpoint
with the configured endpoint URL, attaches WS-Security UsernameToken credentials, and
exposes raw `VerifyTaxpayer` and `GetTaxpayerStatus` operations without mapping SOAP
values into domain types.

**Project Scope Connection:** This creates the brownfield TIVS integration adapter
needed by Intake while keeping legacy SOAP shapes isolated to infrastructure code. The
domain-facing anti-corruption layer, match-code translation, date conversion, and typed
fault handling remain scoped to SCRUM-140 and SCRUM-141.

**Changed Files:**

- `package.json`
- `package-lock.json`
- `.env.example`
- `src/typescript/features/taxPlanCycle/infrastructure/tinEinValidationSoapClient.ts`
- `src/typescript/features/taxPlanCycle/index.ts`
- `src/typescript/index.ts`
- `tests/typescript/features/taxPlanCycle/fixtures/README.md`
- `tests/typescript/features/taxPlanCycle/fixtures/tinEinValidation.wsdl`
- `tests/typescript/features/taxPlanCycle/tinEinValidationSoapClient.test.ts`
- `planning/team/mm-ticket-journal.md`

**Validation Notes:**

- `npm install soap` completed after granting registry network access. npm reported the
  existing Node engine mismatch (`22.0.0` required, `24.17.0` used) and 14 audit
  findings.
- `npm run typecheck` passed.
- `npm run test:vitest -- tests/typescript/features/taxPlanCycle/tinEinValidationSoapClient.test.ts`
  passed with 1 file and 2 tests after granting localhost socket access for the stub
  SOAP service.
- `npm test` was rerun with elevated localhost/Docker permissions. Typecheck passed
  and the new SOAP test passed inside the full suite, but the full Vitest run still
  failed because Docker/Testcontainers suites could not find a working container runtime
  strategy. `docker info --format '{{.ServerVersion}}'` confirmed Docker was not
  reachable in this environment.

## martins-okorie-jira140 - SCRUM-140

**Branch:** `martins-okorie-jira140`

**Assignee:** Chimaobi Martins Okorie

**Jira Key:** SCRUM-140

**Summary:** Map the SOAP response through an anti-corruption layer

**Description:** As an Advisor, I want the SOAP response mapped through an ACL, so that
the legacy contract never leaks into the domain.

**Acceptance Criteria:**

- An anti-corruption layer maps the SOAP response into a clean internal validation
  result type.
- The TIN/EIN validation runs at the Intake stage and records the result on the case.
- A test asserts the domain type contains no SOAP-specific fields.

**Code Connection:** Added a TaxPulse-facing taxpayer identifier validation model and
an ACL that translates raw TIVS `MatchCode` responses into clean results such as
`match`, `tin_not_found`, and `name_mismatch`. The create-cycle controller runs the
TIVS validator first when Intake create input includes a taxpayer identifier, and then passes
the validated result to `repository.create()`. The repository inserts the case, initial stage transition,
audit log, and taxpayer identifier validation records within its internal atomic database
transaction. If SOAP validation fails, no DB transaction is initiated; if DB persistence fails, all
rows roll back cleanly. Case reads include the clean validation result without exposing SOAP field
names or raw identifiers.

**Project Scope Connection:** SCRUM-140 builds on SCRUM-139's raw SOAP client by
putting a clean boundary between TIVS and TaxPulse. The new
`taxpayer_identifier_validation` table records the Intake validation result on the case
without storing the submitted TIN/EIN. SOAP fault translation and typed error recording
remain scoped to SCRUM-141.

**Changed Files:**

- `src/typescript/features/taxPlanCycle/controllers/createController.ts`
- `src/typescript/features/taxPlanCycle/infrastructure/tinEinValidationAcl.ts`
- `src/typescript/features/taxPlanCycle/index.ts`
- `src/typescript/features/taxPlanCycle/repositories/repository.ts`
- `src/typescript/features/taxPlanCycle/repositories/taxpayerIdentifierValidation.ts`
- `src/typescript/features/taxPlanCycle/taxpayerIdentifierValidation.ts`
- `src/typescript/features/taxPlanCycle/taxPlanCycle.ts`
- `src/typescript/index.ts`
- `src/typescript/shared/database/drizzle-migrations/0015_taxpayer_identifier_validation.sql`
- `src/typescript/shared/database/drizzle-migrations/meta/0015_snapshot.json`
- `src/typescript/shared/database/drizzle-migrations/meta/_journal.json`
- `src/typescript/shared/database/schema.ts`
- `src/typescript/shared/database/seed.ts`
- `tests/typescript/features/taxPlanCycle/createIdempotency.test.ts`
- `tests/typescript/features/taxPlanCycle/integration.test.ts`
- `tests/typescript/features/taxPlanCycle/mainComposition.test.ts`
- `tests/typescript/features/taxPlanCycle/taxpayerIdentifierValidation.typecheck.ts`
- `tests/typescript/features/taxPlanCycle/tinEinValidationAcl.test.ts`
- `planning/team/mm-ticket-journal.md`

**Validation Notes:**

- `npm run db:gen -- --name taxpayer_identifier_validation` generated the Drizzle
  migration.
- `npm run db:check` passed.
- `npm run typecheck` passed cleanly across app, tests, and pulseUI.
- `npx vitest run tests/typescript/features/taxPlanCycle/createIdempotency.test.ts tests/typescript/features/taxPlanCycle/mainComposition.test.ts tests/typescript/features/taxPlanCycle/transitionController.test.ts tests/typescript/features/taxPlanCycle/tinEinValidationAcl.test.ts tests/typescript/features/taxPlanCycle/schema.test.ts tests/typescript/features/taxPlanCycle/routes.test.ts` passed (6 files, 41 tests).

## martins-okorie-jira141 - SCRUM-141

**Branch:** `martins-okorie-jira141`

**Assignee:** Chimaobi Martins Okorie

**Jira Key:** SCRUM-141

**Summary:** Translate SOAP faults to typed domain errors

**Description:** As a Backend Developer, I want SOAP faults translated to domain errors,
so that legacy failures are handled cleanly.

**Acceptance Criteria:**

- A SOAP fault is translated into a typed domain error.
- The error is recorded on the case rather than crashing Intake.
- A test asserts an injected SOAP fault produces the typed domain error.

**Code Connection:** Defined the `TaxpayerIdentifierSoapFaultError` domain error type and
implemented `translateSoapFault()` in the TIVS Anti-Corruption Layer (ACL). The ACL catches
SOAP faults (and remote service failures) thrown during `verifyTaxpayer` and normalizes them
into typed `TaxpayerIdentifierSoapFaultError` instances containing structured fields (`faultCode`,
`faultReason`, `detail`, `provider: "tivs"`). In `createController.create()`, when taxpayer
identifier validation fails with a SOAP fault during Intake, the error is handled cleanly by
recording `validationResult: "soap_fault"` rather than throwing an uncaught exception or
crashing the Intake stage. The case is created with its initial stage transition and validation
audit record within the atomic database transaction, and the generated Drizzle migration
`0016_taxpayer_identifier_validation_soap_fault.sql` updates the check constraint accordingly.

**Project Scope Connection:** SCRUM-141 completes the TIVS integration sequence (SCRUM-139,
SCRUM-140, SCRUM-141) by establishing resilient fault tolerance at the Anti-Corruption Layer
boundary. Legacy external SOAP failures never crash internal Tax Plan Cycle creation, nor do
raw XML/SOAP structures leak into the core domain.

**Changed Files:**

- `src/typescript/features/taxPlanCycle/controllers/createController.ts`
- `src/typescript/features/taxPlanCycle/infrastructure/tinEinValidationAcl.ts`
- `src/typescript/features/taxPlanCycle/taxpayerIdentifierValidation.ts`
- `src/typescript/features/taxPlanCycle/index.ts`
- `src/typescript/index.ts`
- `src/typescript/shared/database/drizzle-migrations/0016_taxpayer_identifier_validation_soap_fault.sql`
- `src/typescript/shared/database/drizzle-migrations/meta/0016_snapshot.json`
- `src/typescript/shared/database/drizzle-migrations/meta/_journal.json`
- `src/typescript/shared/scripts/awsStageChangedSmoke.ts`
- `tests/typescript/features/taxPlanCycle/createIdempotency.test.ts`
- `tests/typescript/features/taxPlanCycle/taxpayerIdentifierValidation.typecheck.ts`
- `tests/typescript/features/taxPlanCycle/tinEinValidationAcl.test.ts`
- `planning/team/mm-ticket-journal.md`

**Validation Notes:**

- `npm run db:gen -- --name taxpayer_identifier_validation_soap_fault` generated the Drizzle migration.
- `npm run db:check` passed cleanly.
- `npm run typecheck` passed cleanly across app, tests, and pulseUI.
- `npx vitest run tests/typescript/features/taxPlanCycle/tinEinValidationAcl.test.ts tests/typescript/features/taxPlanCycle/createIdempotency.test.ts tests/typescript/features/taxPlanCycle/tinEinValidationSoapClient.test.ts tests/typescript/features/taxPlanCycle/mainComposition.test.ts tests/typescript/features/taxPlanCycle/transitionController.test.ts tests/typescript/features/taxPlanCycle/schema.test.ts tests/typescript/features/taxPlanCycle/routes.test.ts` passed (7 files, 48 tests).
- `.venv/bin/python -m pyright --pythonpath .venv/bin/python` passed with 0 errors.
- `.venv/bin/python -m pytest` passed 93 tests.
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
