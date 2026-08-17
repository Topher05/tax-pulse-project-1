# ECS Fargate Task Definitions

SCRUM-157 defines the ECS Fargate task definitions for the long-lived TaxPulse API
containers:

- Core Case Service, built from the root `Dockerfile` and exposed on port `3000`.
- Tax Engine, built from `Dockerfile.tax-engine` and exposed on port `8000`.

The JSON files in this folder are intentionally limited to task definitions. ECS
service creation, load balancer target groups, listener rules, and health-based task
replacement are left to SCRUM-158.

## Before Registration

The task definitions use the discovered AWS account ID, region, SNS topic, SQS queue,
CloudWatch log groups, and Secrets Manager ARN from the team account. The IAM role
names and ECR image tags remain placeholders because those resources were not present
in the account during discovery.

The task definitions expect these container images to exist in a registry such as ECR:

```bash
814650854375.dkr.ecr.us-east-1.amazonaws.com/taxpulse/core-case-service:replace-with-image-tag
814650854375.dkr.ecr.us-east-1.amazonaws.com/taxpulse/tax-engine:replace-with-image-tag
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

After replacing placeholders, register the task definitions from the repository root:

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
