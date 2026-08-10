# ADR-0030: Lambda + API Gateway integration for SCRUM-160

## Context
SCRUM-160 refactors the Tax Plan Cycle present-to-client and execute transitions away from the long-lived Express delivery path and into AWS Lambda behind API Gateway.

The business behavior already exists in the Tax Plan Cycle feature slice:

- present-to-client transitions a cycle from `Review` => `Client Approval`,
- execute transitions a cycle from `Client Approval` => `Executed`,
- stage changes remain controlled by the existing transition rules and audit history,
- present-to-client also emits the action-item CloudEvent required by the SCRUM-138 saga path.

The delivery boundary needs to change without changing the domain behavior. The AWS runtime must also be able to reach the database and publish workflow events without relying on emulator-only wiring.

## Decision
Expose the two workflow transitions as AWS Lambda handlers fronted by API Gateway:

- `POST /v1/tax-plan-cycles/{caseId}/present-to-client`
- `POST /v1/tax-plan-cycles/{caseId}/execute`

The handlers will:

- authenticate requests with the existing JWT claims contract,
- reuse the Tax Plan Cycle transition controller and repository layer,
- preserve the existing audit and validation behavior,
- publish stage-changed events through SNS,
- publish action-item-created events for present-to-client,
- run in AWS with explicit environment variables and IAM permissions.

The implementation will not use LocalStack as the delivery strategy for this ticket. If the code needs a stub for a dependency that is not yet available, that stub must stay explicit and isolated rather than reintroducing emulator-based behavior.

## Consequences
Benefits:

- the delivery path can scale independently of the old Express server,
- the workflow behavior remains anchored to the existing Tax Plan Cycle domain model,
- the Lambda entrypoints become the production deployment surface for SCRUM-160,
- the architecture boundary is visible in both code and deployment config.

Tradeoffs:

- the deployment shape is now AWS-specific and requires IAM, SNS, database connectivity, and API Gateway configuration,
- Lambda handlers need explicit bootstrap code for database, auth, and event publishing,
- the present-to-client endpoint now depends on the action-item event publisher being available in production.

## Alternatives considered

- Keep the Express route as the production delivery surface and only document Lambda migration later.
- Use LocalStack as the primary implementation target for this ticket.
- Move the workflow logic into the handler layer instead of reusing the existing feature-slice controller.

