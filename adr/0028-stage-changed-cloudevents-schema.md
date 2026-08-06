# ADR-0028: Define the stage-changed CloudEvents schema

## Context
Tax Plan Cycle stage transitions are durable workflow changes that downstream
consumers will need to observe without polling the Core Case Service. SCRUM-130
establishes the event contract before SCRUM-131 adds the publisher and before later
consumer work processes the event asynchronously.

The contract must preserve tenant isolation, keep workflow state in the existing stage
field, and give consumers a stable versioned shape they can validate.

## Decision
Represent stage changes as CloudEvents 1.0 JSON events with a versioned TaxPulse event
type:

`com.taxpulse.tax_plan_cycle.stage_changed.v1`

Use `taxpulse.platform.tax-plan-cycle` as the event source and
`taxpulse://schemas/platform/stage-changed/v1` as the data schema URI. The event data
contains the minimum transition facts consumers need: `case_id`, `tenant_id`,
`from_stage`, `to_stage`, and `actor`.

Implement the contract as a Zod validator in the TypeScript Tax Plan Cycle feature
slice, reusing the existing Tax Plan Cycle stage enum so the event cannot drift from
the workflow model. Export the schema and inferred type for publishers and consumers.

## Consequences
Consumers can parse and reject malformed events before processing them, and future
publishers have a single source of truth for the event payload shape.

The schema version is explicit in both the CloudEvents `type` and `dataschema` fields.
Breaking event-shape changes require a new version instead of changing v1 in place.

This decision does not introduce SNS publishing, SQS consumption, database changes, or
a separate case status. Those behaviors remain owned by later event-driven workflow
tickets.

SCRUM-131 later implements the first publisher against this contract as a plain
TypeScript service method that validates the CloudEvent with
`stageChangedCloudEventSchemaV1` before publishing the JSON body to SNS. That follow-on
work uses the same v1 event shape and does not revise this schema decision. Publish
failures are treated as best-effort after the database transition commits.

SCRUM-132 adds the first SQS subscriber as another plain TypeScript service method. It
parses the default SNS notification envelope from SQS, validates the nested CloudEvent
with the same `stageChangedCloudEventSchemaV1`, logs the transition, and deletes only
successfully processed SQS messages. This keeps the consumer aligned to the v1 contract
without introducing Lambda runtime behavior, database writes, or schema changes.

## Alternatives considered
- Publish an unversioned custom JSON object, which would be smaller but weaker for
  consumer compatibility.
- Add a separate schema version field inside `data`, which duplicates versioning already
  carried by the CloudEvents event type and data schema URI.
- Model `actor` as a nested principal object, which is deferred until a ticket requires
  richer actor metadata than the current stage-transition and audit conventions use.
