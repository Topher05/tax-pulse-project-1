# TaxPulse Terraform fresh-apply smoke

Run the unified smoke command after applying an isolated Terraform state:

```bash
npm run aws:fresh-apply-smoke
```

The command requires explicit, synthetic-environment inputs:

- `TAXPULSE_ALB_BASE_URL` — deployed ALB base URL.
- `TAXPULSE_TRANSITION_API_URL` — deployed transition HTTP API URL.
- `TAXPULSE_SMOKE_BEARER_TOKEN` — valid JWT for the smoke tenant and user.
- `TAXPULSE_SMOKE_TENANT_ID` — synthetic tenant UUID.
- `TAXPULSE_SMOKE_CASE_ID` — synthetic case UUID already present in the environment.
- `TAXPULSE_PROJECTION_TABLE_NAME` — DynamoDB projection table name.
- `AWS_REGION` — optional AWS region, defaulting to `us-east-1`.

The command performs one authenticated ALB tax calculation, one authorized
present-to-client transition, and bounded DynamoDB polling until the projection reaches
`Client Approval`. It exits non-zero and identifies the failed phase if any operation
does not succeed.
