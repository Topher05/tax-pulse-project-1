# SCRUM-171 Disposition Log Template

## Summary
Create a planning-only artifact for the triage disposition log template and a sample
completed entry. This ticket depends on the observability work from SCRUM-170, so the
template should point at an existing CloudWatch metric or trace context rather than
introducing new runtime behavior.

## What Needs To Exist

### Disposition Log Template
Each triage entry should capture:

- Ticket or incident identifier
- Date and owner
- Related CloudWatch metric name
- Related trace context or X-Ray trace identifier
- Symptom observed
- Root cause
- Follow-up action
- Status or disposition

### Sample Completed Entry
Provide one synthetic example that shows:

- A real metric name already emitted by the code path, such as
  `tax_plan_cycle.stage_changed_publish.count`
- A trace reference, such as a request `trace_id` or `x_amzn_trace_id`
- A short root-cause statement
- A concrete follow-up action
- A closed-loop disposition label

## Source Code Impact

No product runtime code is expected to change for SCRUM-171.

If the template needs a concrete link target, reuse the observability fields already in
the codebase:

- `metric_name`
- `metric_value`
- `trace_id`
- `trace_parent`
- `x_amzn_trace_id`

If a future follow-up decides the sample entry needs a new signal name, that should be
added in the observability-producing code first, not in this planning artifact.

## Test Plan

- Review the markdown structure manually.
- Confirm the template section and sample entry are both present.
- Confirm the example uses an existing metric or trace shape from SCRUM-170.
- Confirm the root-cause and action fields are explicit and synthetic.
- No unit, integration, or UI tests are expected unless executable code changes later.

## IaC / AWS

No new IaC or AWS resources are required for this ticket.

The only AWS dependency is that SCRUM-170 already produces a metric or trace that this
template can reference. If observability signals are still missing, SCRUM-170 must be
finished before the sample entry can be finalized.

## Acceptance Criteria

- A new planning artifact exists under `planning/`.
- The artifact defines a disposition log template.
- The artifact includes one sample completed entry.
- The sample entry references an existing observability signal shape from SCRUM-170.
- The artifact clearly states that no runtime code, tests, or IaC changes are required
  for this ticket.
