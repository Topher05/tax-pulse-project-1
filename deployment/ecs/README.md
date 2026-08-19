# ECS Fargate Task Definitions

SCRUM-157 defines the ECS Fargate task definitions for the long-lived TaxPulse API
containers:

- Core Case Service, built from the root `Dockerfile` and exposed on port `3000`.
- Tax Engine, built from `Dockerfile.tax-engine` and exposed on port `8000`.

The JSON files in this folder are intentionally limited to task definitions. ECS
service creation, load balancer target groups, listener rules, and health-based task
replacement are left to SCRUM-158.

In ECS terms, these task definitions are the container recipes: which image to run,
which port to expose, which environment values and secrets to inject, how to check
readiness, and where logs should go. The ECS service "manager" resources that keep
copies running are outside SCRUM-157.

## Before Registration

The task definitions use the discovered AWS account ID, region, SNS topic, SQS queue,
CloudWatch log groups, and Secrets Manager ARN from the team account. The IAM role
names, service-discovery names, data-store endpoints, and ECR image tags are the
production contract that SCRUM-162 and SCRUM-164 should preserve when they codify the
stack in Terraform.

The task definitions expect these container images to exist in Amazon ECR. Replace
`replace-with-immutable-image-tag` with the pushed image tag from the build pipeline,
such as a Git commit SHA. Do not use `latest` for registered task definitions because
ECS should run a specific reviewed image version.

```bash
814650854375.dkr.ecr.us-east-1.amazonaws.com/taxpulse/core-case-service:replace-with-immutable-image-tag
814650854375.dkr.ecr.us-east-1.amazonaws.com/taxpulse/tax-engine:replace-with-immutable-image-tag
```

If the repositories do not already exist, create them before pushing images:

```bash
aws ecr create-repository --repository-name taxpulse/core-case-service --region us-east-1
aws ecr create-repository --repository-name taxpulse/tax-engine --region us-east-1
```

Build, tag, and push with an immutable tag:

```bash
IMAGE_TAG="$(git rev-parse --short HEAD)"
ECR_REGISTRY="814650854375.dkr.ecr.us-east-1.amazonaws.com"

aws ecr get-login-password --region us-east-1 \
  | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

docker build -f Dockerfile -t "taxpulse/core-case-service:${IMAGE_TAG}" .
docker tag "taxpulse/core-case-service:${IMAGE_TAG}" \
  "${ECR_REGISTRY}/taxpulse/core-case-service:${IMAGE_TAG}"
docker push "${ECR_REGISTRY}/taxpulse/core-case-service:${IMAGE_TAG}"

docker build -f Dockerfile.tax-engine -t "taxpulse/tax-engine:${IMAGE_TAG}" .
docker tag "taxpulse/tax-engine:${IMAGE_TAG}" \
  "${ECR_REGISTRY}/taxpulse/tax-engine:${IMAGE_TAG}"
docker push "${ECR_REGISTRY}/taxpulse/tax-engine:${IMAGE_TAG}"
```

## Runtime Wiring

The Core Case Service task mirrors the SCRUM-155 Compose contract, but with
production AWS dependencies instead of local Compose containers:

- `PORT=3000`
- `DATABASE_URL` loaded from Secrets Manager
- `JWT_SIGNING_SECRET` loaded from Secrets Manager
- `LIABILITY_ENGINE_BASE` points at the internal Tax Engine service-discovery name
- `TAXPULSE_REDIS_URL` points at the managed Redis/ElastiCache endpoint
- SNS/SQS identifiers are supplied as environment values

The Tax Engine task mirrors the Python service container contract:

- `PORT=8000`
- `JWT_ISSUER` supplied as an environment value
- `JWT_SIGNING_SECRET` loaded from Secrets Manager

Both containers define health checks against `GET /health` and send logs to CloudWatch
Logs through the `awslogs` driver.

## Discovered AWS Values

- Account ID: `814650854375`
- Region: `us-east-1`
- VPC: `vpc-0f2c3b110a05c423a`
- Stage changed SNS topic:
  `arn:aws:sns:us-east-1:814650854375:stage-changed`
- Stage changed SQS queue:
  `https://sqs.us-east-1.amazonaws.com/814650854375/taxpulse-stage-changed`
- Shared config secret:
  `arn:aws:secretsmanager:us-east-1:814650854375:secret:TAX_PULSE_CONFIG-q9DNrQ`
- Core log group: `Case-Service`
- Tax Engine log group: `Tax-Engine`

Resources still needed before registering the SCRUM-157 task definitions:

- ECR repositories/images for both services.
- ECS task execution role.
- Service-specific ECS task roles.
- SCRUM-162-owned PostgreSQL and Redis endpoints for the runtime values.

PostgreSQL and Redis are intentionally not represented as ECS task containers. Docker
Compose uses `postgres` and `redis` images for local development, but the production
contract expects `DATABASE_URL` to point at RDS PostgreSQL and `TAXPULSE_REDIS_URL` to
point at ElastiCache Redis/Valkey after SCRUM-162 creates those resources.

SCRUM-158 should add the ECS service and ALB layer around the registered task
definitions. That work should define an ECS cluster, one service per task
definition, target groups for each service, listener rules for case and
calculation traffic, service security groups, and health-based replacement.
The ALB input files currently live under `deployment/alb/`.
The ALB and service security group IDs are SCRUM-162 placeholders:
`SCRUM-162_ALB_SECURITY_GROUP_ID` and
`SCRUM-162_ECS_SERVICE_SECURITY_GROUP_ID`.
The ECS cluster and service input files live under `deployment/ecs/`:
`cluster.json`, `core-case-service.json`, and `tax-engine-service.json`.
Those ECS service files use `SCRUM-162_PRIVATE_SUBNET_*` placeholders and
`assignPublicIp=DISABLED` to capture the intended production placement. Terraform
should replace those placeholders with private subnet IDs from the VPC module.
The ALB input files under `deployment/alb/` use `SCRUM-162_PUBLIC_SUBNET_*`,
`SCRUM-162_VPC_ID`, and `SCRUM-164_*_ARN` placeholders for the public load
balancer, target groups, listener, and listener rules.

## Register

After replacing `replace-with-immutable-image-tag` and the IAM role placeholders,
register the task definitions from the repository root:

```bash
aws ecs register-task-definition \
  --cli-input-json file://deployment/ecs/core-case-service.task-definition.json

aws ecs register-task-definition \
  --cli-input-json file://deployment/ecs/tax-engine.task-definition.json
```

Validate a registered task definition with:

```bash
aws ecs describe-task-definition \
  --task-definition taxpulse-core-case-service

aws ecs describe-task-definition \
  --task-definition taxpulse-tax-engine
```

## Create ECS Cluster and Services

After the task definitions are registered, create the ECS cluster and services:

```bash
aws ecs create-cluster \
  --cli-input-json file://deployment/ecs/cluster.json

aws ecs create-service \
  --cli-input-json file://deployment/ecs/core-case-service.json

aws ecs create-service \
  --cli-input-json file://deployment/ecs/tax-engine-service.json
```

Current AWS services:

- Core Case Service:
  `arn:aws:ecs:us-east-1:814650854375:service/taxpulse-api/core-case-service`.
- Tax Engine:
  `arn:aws:ecs:us-east-1:814650854375:service/taxpulse-api/tax-engine`.

The Tax Engine service reached steady state with one healthy Fargate task. The
Core Case Service was created, but its container currently exits during startup
because the current `DATABASE_URL` secret resolves to `127.0.0.1:5432` inside
Fargate. That means it is looking for Postgres inside its own container. Point the
shared `TAX_PULSE_CONFIG` secret's `DATABASE_URL` value at a reachable database
before expecting the `/v1/*` ALB smoke check to pass.

For AWS, that database should be a reachable PostgreSQL database, normally the RDS
PostgreSQL instance owned by SCRUM-162. The secret value should look like:

```text
postgresql://<username>:<password>@<rds-postgres-endpoint>:5432/<database-name>
```

Do not use `localhost` or `127.0.0.1` in Fargate. Inside a Fargate task,
`localhost` means "inside this same container," not the team database.

The Redis value follows the same rule. SCRUM-157 records the production-shaped value
as:

```text
redis://taxpulse-redis.cache.taxpulse.internal:6379
```

SCRUM-162 should replace that placeholder with the real ElastiCache/Valkey endpoint
or a private DNS name that resolves to it.

## SCRUM-158 ALB and ECS Service Scope

After the SCRUM-157 task definitions are registered, SCRUM-158 should create the
long-running ECS service layer and route traffic through an Application Load
Balancer.

The routing should send:

- `/v1/*` to the Core Case Service target group on port `3000`.
- `/tax-calculations` and `/scenarios/comparisons` to the Tax Engine target group on
  port `8000`.

Both target groups should check `GET /health`. ECS services should be attached to
those target groups with a health check grace period and rolling deployment
settings, so ECS replaces tasks that fail health checks.

The SCRUM-158 ALB and ECS service JSON is a production contract for the later
Terraform module. It intentionally places the internet-facing ALB in public subnets,
places ECS tasks in private subnets with public IP assignment disabled, and allows
service ingress only from the ALB security group. The placeholder subnet IDs, security
group IDs, listener ARN, and target group ARNs should become Terraform module outputs
or references during SCRUM-164.

## Smoke Through the ALB

After SCRUM-158 creates the ALB, run the smoke script through the ALB DNS name.
Use a valid bearer token for protected routes.

```bash
TAXPULSE_ALB_BASE_URL="http://taxpulse-api-alb-350585859.us-east-1.elb.amazonaws.com" \
TAXPULSE_SMOKE_BEARER_TOKEN="<access-token>" \
npm run aws:alb-smoke
```

The script checks both routed paths:

- `GET /v1/tax-plan-cycles` reaches the Core Case Service target group.
- `POST /tax-calculations` reaches the Tax Engine target group.
