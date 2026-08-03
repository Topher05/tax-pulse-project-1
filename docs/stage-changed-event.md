# Stage-Changed Event Contract

TaxPulse Platform emits the stage-changed event when a Tax Plan Cycle changes workflow
stage. SCRUM-130 defines the versioned schema and validator only; event publication is
implemented separately.

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
