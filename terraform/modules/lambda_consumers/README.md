# Lambda Consumers Module

Creates the SCRUM-160 transition Lambdas and HTTP API routes:

- `POST /v1/tax-plan-cycles/{caseId}/present-to-client`
- `POST /v1/tax-plan-cycles/{caseId}/execute`

It can also create the SCRUM-159 SQS-triggered stage-changed consumer Lambda once
that deployable bundle exists. Set `enable_stage_changed_consumer_lambda = true`
and provide `stage_changed_consumer_lambda_zip_path`.

Required inputs are Lambda zip artifact paths, SNS topic ARNs, the stage-changed
SQS queue ARN, the shared runtime secret ARN, and environment-specific runtime
variables such as database connectivity.
