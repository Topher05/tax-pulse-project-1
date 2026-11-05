# Lambda Consumers Module

Creates the SCRUM-160 transition Lambdas and HTTP API routes:

- `POST /v1/tax-plan-cycles/{caseId}/present-to-client`
- `POST /v1/tax-plan-cycles/{caseId}/execute`

It can also create the SCRUM-159 SQS-triggered stage-changed consumer Lambda once
that deployable bundle exists. Set `enable_stage_changed_consumer_lambda = true`
and provide both `stage_changed_consumer_lambda_zip_path` and
`stage_changed_queue_arn`.

Required inputs are the present-to-client and execute Lambda zip artifact paths,
SNS topic ARNs, the shared runtime secret ARN, and environment-specific runtime
variables such as database connectivity. `stage_changed_queue_arn` is optional
unless `enable_stage_changed_consumer_lambda` is true, because the SQS event
source mapping and queue permissions are only created with that feature flag.
