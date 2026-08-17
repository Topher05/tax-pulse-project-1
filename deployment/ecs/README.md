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

Resources still needed before registering the SCRUM-157 task definitions:

- ECR repositories/images for both services.
- ECS task execution role.
- Service-specific ECS task roles.

SCRUM-158 adds `alb-services.template.yaml` to define the ECS cluster, services,
target groups, listener rules, and ALB security group wiring around the registered
task definitions.

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

## Deploy ALB and ECS Services

After the SCRUM-157 task definitions are registered, deploy the SCRUM-158 ALB and ECS
service stack:

```bash
aws cloudformation deploy \
  --stack-name taxpulse-ecs-alb-services \
  --template-file deployment/ecs/alb-services.template.yaml \
  --parameter-overrides \
    CoreCaseTaskDefinition=taxpulse-core-case-service \
    TaxEngineTaskDefinition=taxpulse-tax-engine
```

The template routes:

- `/v1/*` to the Core Case Service target group on port `3000`.
- `/tax-calculations` and `/scenarios/comparisons` to the Tax Engine target group on
  port `8000`.

Both target groups check `GET /health`. ECS services are attached to the target groups
with a health check grace period and rolling deployment settings, so ECS replaces tasks
that fail the target group health check.

## Smoke Through the ALB

Get the ALB DNS name:

```bash
aws cloudformation describe-stacks \
  --stack-name taxpulse-ecs-alb-services \
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDnsName`].OutputValue' \
  --output text
```

Then send smoke requests through the ALB DNS name. Use a valid bearer token for protected
routes.

```bash
ALB_DNS_NAME="<load-balancer-dns-name>"

curl -i "http://${ALB_DNS_NAME}/v1/tax-plan-cycles" \
  -H "Authorization: Bearer <access-token>"

curl -i "http://${ALB_DNS_NAME}/tax-calculations" \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"filing_status":"single","state":"CA","income":100000,"deductions":12950,"credits":0,"withholding":0}'
```
