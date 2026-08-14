# Stage-Changed Event Contract

TaxPulse Platform emits the stage-changed event when a Tax Plan Cycle changes workflow
stage. SCRUM-130 defines the versioned schema and validator only; event publication is
implemented by SCRUM-131 as a plain service method that publishes valid events to SNS
after successful stage transitions. SCRUM-132 consumes the default SNS-to-SQS
notification envelope and validates the nested CloudEvent before logging it.

## Version
- CloudEvents spec version: `1.0`
- Event type: `com.taxpulse.tax_plan_cycle.stage_changed.v1`
- Event source: `taxpulse.platform.tax-plan-cycle`
- Data schema URI: `taxpulse://schemas/platform/stage-changed/v1`
- Content type: `application/json`

## Required Data Fields
- `case_id`: Tax Plan Cycle UUID.
- `tenant_id`: tenant UUID that scopes the case.
- `from_stage`: previous Tax Plan Cycle stage.
- `to_stage`: new Tax Plan Cycle stage.
- `actor`: non-empty identifier for the principal that requested the transition.

`from_stage` and `to_stage` use the same stage enum as the Tax Plan Cycle domain model:
`Intake`, `Data Aggregation`, `Modeling`, `Review`, `Client Approval`, `Executed`, and
`Archived`.

## Example

```json
{
  "specversion": "1.0",
  "id": "stage-transition-018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d34",
  "source": "taxpulse.platform.tax-plan-cycle",
  "type": "com.taxpulse.tax_plan_cycle.stage_changed.v1",
  "time": "2026-07-01T14:00:00.000Z",
  "datacontenttype": "application/json",
  "dataschema": "taxpulse://schemas/platform/stage-changed/v1",
  "data": {
    "case_id": "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d33",
    "tenant_id": "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d11",
    "from_stage": "Intake",
    "to_stage": "Data Aggregation",
    "actor": "advisor-001"
  }
}
```

## Compatibility
Consumers should validate events with `stageChangedCloudEventSchemaV1` before
processing. Breaking changes require a new event type and data schema URI version.

## Publication
SCRUM-131 publishes this exact CloudEvent JSON as the SNS message body for successful
Tax Plan Cycle stage transitions. The publisher validates the CloudEvent with
`stageChangedCloudEventSchemaV1` before sending it. Publish failures are best-effort
after the committed database transition, so they do not turn a successful stage change
into a failed client response.

Runtime configuration:

- `TAXPULSE_STAGE_CHANGED_TOPIC_ARN`: SNS topic ARN for stage-changed events.
- `AWS_REGION`: AWS region, defaulting to `us-east-1`.
- `TAXPULSE_SNS_ENDPOINT_URL`: optional LocalStack/custom SNS endpoint.

Publication is part of the plain TypeScript transition service composition in this
sprint. It is not a Lambda/cloud runtime, does not add an outbox table, and does not
change the v1 event shape established by SCRUM-130 and ADR-0028.

## SQS Consumption
SCRUM-132 adds a plain TypeScript SQS consumer for subscribers receiving the SNS
notification through SQS. The consumer parses the SQS body as the default SNS
notification envelope, parses the envelope `Message` as the CloudEvent JSON published
by SCRUM-131, validates it with `stageChangedCloudEventSchemaV1`, logs the transition,
and deletes the SQS message only after successful validation and logging.

Runtime configuration:

- `TAXPULSE_STAGE_CHANGED_QUEUE_URL`: SQS queue URL for stage-changed events.
- `TAXPULSE_SQS_ENDPOINT_URL`: optional LocalStack/custom SQS endpoint.

The consumer is not a Lambda/cloud runtime in this sprint and does not mutate Tax Plan
Cycle state or add durable projection behavior.

## Action-item completion projection

SCRUM-144 publishes `com.taxpulse.tax_plan_cycle.action_item_completed.v1` after a client
completes an action item. The Action Item Tracking subscriber uses
`TAXPULSE_ACTION_ITEM_COMPLETED_QUEUE_URL` for its SNS-to-SQS subscription, validates the
CloudEvent, and idempotently marks the matching case-scoped action item completed. It deletes
the SQS message only after the projection succeeds; malformed messages remain available for
retry/DLQ handling.
