# ADR-0010: Python DynamoDB Queue Projection with LocalStack

## Context
TaxPulse Advisory needs the Plan Cycle Queue to move toward a denormalized read model
instead of reading only from the transactional Tax Plan Cycle tables. SCRUM-73 defines
the DynamoDB table foundation for that queue projection.

The repository is polyglot. TypeScript currently owns much of the Core Case Service
PostgreSQL path, while the Python package already uses Pydantic for typed service
boundaries. The DynamoDB queue projection table is owned by the Python side so its
item contract can be expressed as a Pydantic model and tested through Python pytest.

The project is not ready to use paid AWS for local development or tests. It still needs
AWS-compatible client calls and table definitions so the eventual move to managed AWS
DynamoDB is a configuration change rather than a rewrite.

## Decision
Define the Plan Cycle Queue projection table contract in the Python package under
`tax_pulse_project_team_1.dynamodb`.

Use Pydantic for the denormalized item shape. Each projection item carries:

- `tenant_id`,
- `case_id`,
- `client`,
- `stage`,
- `owner`,
- `priority`,
- `due_date`,
- `is_overdue`.

Create the DynamoDB table with `tenant_id` as the partition key and `case_id` as the
sort key. Use pay-per-request billing for the table definition so local tests and a
future managed AWS table share the same simple capacity mode.

Use boto3 as the Python DynamoDB SDK. The client factory points to
`TAXPULSE_DYNAMODB_ENDPOINT_URL` or an injected endpoint when running against
LocalStack. When no endpoint is configured, boto3 uses its normal AWS region and
credential provider chain, which keeps the code path compatible with future paid AWS
without committing credentials or cloud-specific values.

Use Python Testcontainers to start LocalStack for DynamoDB integration tests. Tests
create the table against LocalStack, verify the key schema, and write/query synthetic
tenant-scoped projection items. The fixture defaults to `localstack/localstack:stable`
and passes `LOCALSTACK_AUTH_TOKEN` through the environment so the local setup matches
the licensed image used by the new bootstrap flow.

## Consequences
The DynamoDB queue projection contract now lives in the Python package and can evolve
with Python/Pydantic service boundaries.

Local tests exercise real AWS-shaped DynamoDB APIs through boto3 and LocalStack without
using paid AWS. Docker is required for the LocalStack-backed pytest coverage.

The repository also includes a small Python bootstrap entrypoint and Compose file so a
developer can bring up LocalStack and create the queue table manually without adding a
full migration framework.

The application has a clear configuration path:

- local tests and development use a LocalStack endpoint and fake local credentials,
- future AWS deployments omit the local endpoint and rely on managed AWS credentials.

The table definition establishes tenant-scoped storage and case-keyed items, but it
does not project PostgreSQL Tax Plan Cycle changes into DynamoDB. That behavior remains
future work for SCRUM-74.

The base table sorts by `case_id`, not `due_date`. If the DynamoDB queue read path later
needs due-date ordering directly from DynamoDB, a separate decision can add an index
such as a tenant-partitioned due-date sort key.

## Alternatives considered
- Put the DynamoDB table contract in TypeScript.
- Use paid AWS DynamoDB for tests.
- Use moto or an in-memory fake instead of LocalStack.
- Require a shared LocalStack auth token for the project.
- Add a due-date global secondary index in SCRUM-73.
