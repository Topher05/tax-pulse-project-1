# ADR-0030: Lambda + API Gateway integration for SCRUM-160

## Context
SCRUM-160 refactors the Tax Plan Cycle present-to-client and execute transitions away from the long-lived Express delivery path and into AWS Lambda behind API Gateway.

The acceptance criteria for this ticket split into two tracks:

- delivery cutover: expose present-to-client and execute through AWS Lambda and API Gateway,
- behavior preservation: keep the existing stage transition rules, audit trail, role gate, and present-to-client compensation semantics unchanged.

The blocking work maps to those tracks as follows:

- SCRUM-138 is the behavior dependency. It defines the compensating present-to-client saga and the action-item event contract that the Lambda path must preserve.
- SCRUM-156 is the local emulation dependency. It only matters if a legacy code path still reaches for LocalStack-style SNS/SQS wiring; it is not part of the AWS delivery shape.

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

Boundary clarification:

- Lambda is the command handler for present-to-client and execute. It owns request transport, bearer-token verification, response shaping, and AWS runtime wiring.
- The Tax Plan Cycle feature slice owns the workflow semantics: transition rules, audit writes, stage-changed emission, and present-to-client compensation.
- SNS publishers are infrastructure adapters that publish validated events; they do not decide whether a transition is legal.
- SQS consumers remain downstream reactions and stay outside this ticket.
- The local Express route remains the non-AWS development path.
- Any SCRUM-156-dependent behavior is only a temporary scaffold for a stray legacy path and must not become the AWS delivery strategy.

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
- the present-to-client endpoint now depends on the action-item event publisher being available in production,
- SCRUM-156 is intentionally not a production prerequisite; if it appears at all, it should remain a narrow scaffold only.

## Alternatives considered

- Keep the Express route as the production delivery surface and only document Lambda migration later.
- Use LocalStack as the primary implementation target for this ticket.
- Move the workflow logic into the handler layer instead of reusing the existing feature-slice controller.

