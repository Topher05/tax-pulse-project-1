# AWS Development Scale-Down and Restore Runbook

## Scope and safety boundary

This runbook applies to the TaxPulse development stack in account
`814650854375`, region `us-east-1`. It is an operator procedure, not an
authorization to change live infrastructure. Obtain an approved change record,
confirm the account and region, and capture the current status before using any
mutating command. Never delete resources, rotate secrets, or expose secret
values as part of this procedure.

The goal is to stop the two continuously running ECS tasks and the RDS compute
instance while retaining the configuration and data needed to restore the stack.

## Resource inventory and preservation

The current Terraform-managed development resources are:

| Resource | Current identifier/state | Treatment while scaled down |
| --- | --- | --- |
| ECS cluster | `taxpulse-api` | Retain cluster, services, task definitions, roles, and logs; set `core-case-service` and `tax-engine` desired counts to `0`. |
| RDS PostgreSQL | `taxpulse-dev-db`, available, `db.t4g.micro` | Create a manual snapshot, then stop the instance. Stopping preserves its storage and endpoint configuration. |
| ElastiCache Redis | `taxpulse-dev-redis`, two nodes, Multi-AZ | Retain. ElastiCache has no safe stop operation; it remains an application dependency and cost. |
| ALB/VPC | `taxpulse-dev-api-alb` and its managed VPC | Retain. An ALB cannot be stopped without deleting/recreating configuration. |
| SPA delivery | S3 `taxpulse-dev-814650854375-spa`, CloudFront `E37QAT10EYL56N` | Retain so the UI and ZAP target remain available. S3 versioning, KMS, and CloudFront configuration remain intact. |
| State and application data | S3 `taxpulse-terraform-state`, DynamoDB `taxpulse_plan_cycle_queue_projection` | Retain. Terraform state is encrypted; DynamoDB uses on-demand billing and point-in-time recovery. |
| Configuration and artifacts | Secrets Manager `taxpulse-dev-runtime-config`, ECR repositories, Lambda functions, API Gateway, SNS/SQS, CloudWatch logs | Retain; these are needed for restoration and have no continuously running ECS compute cost. |

Before mutating anything, record the account, region, service counts/task
definitions, RDS status/endpoint, Redis status, and Terraform state object:

```powershell
$ExpectedAccount = "your account number"
$Region = "us-east-1"
$Account = (aws sts get-caller-identity --query Account --output text).Trim()
if ($Account -ne $ExpectedAccount) { throw "Wrong AWS account: $Account" }
$env:AWS_DEFAULT_REGION = $Region

aws ecs describe-services --cluster taxpulse-api --services core-case-service tax-engine `
  --query 'services[].{service:serviceName,desired:desiredCount,running:runningCount,taskDefinition:taskDefinition}'
aws rds describe-db-instances --db-instance-identifier taxpulse-dev-db `
  --query 'DBInstances[].{status:DBInstanceStatus,endpoint:Endpoint.Address,class:DBInstanceClass}'
aws elasticache describe-replication-groups --replication-group-id taxpulse-dev-redis `
  --query 'ReplicationGroups[].{status:Status,nodes:MemberClusters,multiAz:MultiAZ}'
aws s3api head-object --bucket taxpulse-terraform-state --key dev/terraform.tfstate
```

## Scale down

1. Create and wait for a manual RDS snapshot. Keep its identifier in the change
   record; it is a recovery fallback and is not a substitute for the live RDS
   storage retained by `stop-db-instance`.

```powershell
$SnapshotId = "taxpulse-dev-pre-scale-down-$(Get-Date -Format yyyyMMddHHmmss)"
aws rds create-db-snapshot --db-instance-identifier taxpulse-dev-db `
  --db-snapshot-identifier $SnapshotId
aws rds wait db-snapshot-available --db-snapshot-identifier $SnapshotId
```

2. Stop application compute and wait until both ECS services have no desired
   tasks:

```powershell
aws ecs update-service --cluster taxpulse-api --service core-case-service --desired-count 0
aws ecs update-service --cluster taxpulse-api --service tax-engine --desired-count 0
aws ecs wait services-stable --cluster taxpulse-api `
  --services core-case-service tax-engine
```

3. Stop RDS and wait for the stopped state:

```powershell
aws rds stop-db-instance --db-instance-identifier taxpulse-dev-db
aws rds wait db-instance-stopped --db-instance-identifier taxpulse-dev-db
```

4. Re-run the inventory commands. Confirm ECS desired/running counts are zero,
   RDS is `stopped`, the snapshot is `available`, and no retained resource was
   deleted. CloudFront should still return the SPA, but API calls will be
   unavailable while ECS and RDS are stopped.

## Restore

1. Confirm the same account/region guard and start RDS. Normally use the
   retained instance; restore from the snapshot only if the instance is damaged
   or an approved recovery requires it.

```powershell
aws rds start-db-instance --db-instance-identifier taxpulse-dev-db
aws rds wait db-instance-available --db-instance-identifier taxpulse-dev-db
```

2. Restore one task for each ECS service and wait for stable deployments:

```powershell
aws ecs update-service --cluster taxpulse-api --service core-case-service --desired-count 1
aws ecs update-service --cluster taxpulse-api --service tax-engine --desired-count 1
aws ecs wait services-stable --cluster taxpulse-api `
  --services core-case-service tax-engine
```

3. Verify the ALB health endpoint, the Terraform-resolved SPA URL, and the
   authenticated synthetic smoke path. Use the commands in
   [`terraform/README.md`](../terraform/README.md) for the JWT-protected smoke;
   never record the bearer token or taxpayer data.

```powershell
$SpaUrl = (terraform -chdir=terraform output -raw spa_url).TrimEnd('/')
$ApiUrl = (terraform -chdir=terraform output -raw api_base_url).TrimEnd('/')
Invoke-WebRequest "$SpaUrl/?restore=$(Get-Date -Format yyyyMMddHHmmss)" -UseBasicParsing
Invoke-WebRequest "$ApiUrl/health" -UseBasicParsing
```

4. Confirm both ECS services have one running task, target health is healthy,
   RDS is `available`, and the application smoke reports successful HTTP status
   codes. If ECS fails to stabilize, inspect service events and stopped-task
   reasons before changing desired counts again.

## Limitations and operational notes

- RDS instances stopped for seven consecutive days can be automatically started
  by AWS; re-check status periodically if the environment must remain down.
- The Terraform ECS resources declare `desired_count = 1`. Do not run a normal
  Terraform apply while intentionally scaled down unless the resulting plan is
  reviewed; it can restore ECS tasks or otherwise reconcile the manual capacity
  change.
- Redis, ALB, CloudFront, S3, and other retained resources continue to incur
  charges. Reducing Redis replicas or deleting networking/delivery resources is
  outside this runbook because it changes durability or requires reconstruction.
- A normal release can publish the static UI while ECS is down, but API-backed
  UI functions and ZAP coverage that depends on the API will not be healthy until
  restoration completes.
- The GitHub Actions release-role SPA permissions from SCRUM-231 require an
  approved Terraform apply before the updated release workflow can publish UI
  artifacts.
