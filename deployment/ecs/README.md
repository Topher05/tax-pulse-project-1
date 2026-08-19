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
names and ECR image tags remain placeholders because those resources were not present
in the account during discovery.

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

The Core Case Service task mirrors the SCRUM-155 Compose contract:

- `PORT=3000`
- `DATABASE_URL` loaded from Secrets Manager
- `JWT_SIGNING_SECRET` loaded from Secrets Manager
- `LIABILITY_ENGINE_BASE` points at the internal Tax Engine endpoint
- `TAXPULSE_REDIS_URL` points at the managed Redis endpoint
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

Resources still needed before deployment:

- ECR repositories/images for both services.
- ECS task execution role.
- Service-specific ECS task roles.
- ECS cluster and service definitions.

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
