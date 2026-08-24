# SCRUM-171 Disposition Log Template

## Summary
This artifact is the planning and evidence template for the triage disposition log
work in SCRUM-171. It is documentation-only, and its sample entry is written against
the observability shape introduced for SCRUM-170:

- `TaxPulse` CloudWatch metrics emitted from logs
- correlated request IDs and trace IDs
- a scenario-modeling trace path from Core Case Service to Tax Engine

## Disposition Template

Use one row per triaged issue.

| Field | Required Content |
| --- | --- |
| Identifier | A stable disposition ID, case ID, or incident number |
| Timestamp | UTC date/time of the triage decision |
| Environment | Sandbox, staging, or production |
| Owner | Person or team responsible for the disposition |
| Service | Primary service boundary involved |
| Symptom | What was observed |
| Evidence | Metric name, trace ID, log group, or permalink |
| Root Cause | Observable cause, affected boundary, and supporting evidence |
| Immediate Action | Containment taken now |
| Permanent Action | Follow-up fix or backlog item |
| Status | Open, monitoring, mitigated, resolved, or closed |
| Validation Result | How the disposition was verified |
| Related Ticket | Jira key for the issue or follow-up work |

## Evidence Linking

Use both CloudWatch and X-Ray coordinates when possible.

### CloudWatch Metric Permalink

Capture the following fields:

- Region
- Namespace: `TaxPulse`
- Metric name
- Dimensions: `service`, `operation`, `outcome`
- Statistic and time window

Example coordinate shape:

```text
Region: us-east-1
Namespace: TaxPulse
Metric: tax_plan_cycle.scenario_modeling.duration_ms
Dimensions: service=core-case-service, operation=scenario_modeling, outcome=success
Window: 2026-08-24T14:00:00Z to 2026-08-24T14:15:00Z
Statistic: Sum
```

### X-Ray Trace Permalink

Capture the following fields:

- Region
- Trace ID
- Validation window
- Request ID used during the scenario

Example coordinate shape:

```text
Region: us-east-1
Trace ID: 4bf92f3577b34da6a3ce929d0e0e4736
Request ID: req-scenario-001
Window: 2026-08-24T14:00:00Z to 2026-08-24T14:15:00Z
```

## Sample Entry

The sample below is synthetic but uses the same structure that a live SCRUM-170
validation should produce.

| Identifier | Timestamp | Environment | Owner | Service | Symptom | Evidence | Root Cause | Immediate Action | Permanent Action | Status | Validation Result | Related Ticket |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DISP-171-001 | 2026-08-24T14:12:00Z | sandbox | Platform Engineering | core-case-service / tax-engine | Scenario modeling completed with cross-service telemetry and a correlated request ID | CloudWatch `TaxPulse/tax_plan_cycle.scenario_modeling.duration_ms` and X-Ray trace `4bf92f3577b34da6a3ce929d0e0e4736` | Observable cause: Tax Engine returned a retryable 500 on the first attempt, but the second attempt completed successfully. Affected boundary: Core Case Service to Tax Engine HTTP call. Evidence: the metric was emitted with `service=core-case-service`, `operation=scenario_modeling`, `outcome=success`, and the trace contained both services. | Immediate containment: recorded the request ID and trace ID for review. | Permanent action: keep the request/trace correlation fields in the disposition log and retain the Terraform-defined observability path for future triage. | closed | Verified by metric coordinates and the shared trace ID across both services | SCRUM-170, SCRUM-171 |

## Root Cause Format

Use this order when writing the root-cause field:

1. Observable cause
2. Affected boundary
3. Evidence supporting the conclusion

## Action Format

Use this order when writing action fields:

1. Immediate containment
2. Permanent follow-up
3. Owner
4. Verification condition

## Ticket Scope

- SCRUM-171 stays documentation-only.
- SCRUM-170 supplies the live metric and trace identifiers that the disposition log
  references.
- No workflow, stage, tax-calculation, persistence, or UI behavior is introduced by
  this artifact.
