# TaxPulse Incident Runbook

## Purpose and scope

This runbook gives the on-call responder a small, evidence-first procedure for the
two SLO-backed degradation modes covered by SCRUM-187. It is documentation only:
the procedures do not authorize live fault injection, irreversible changes, or
unreviewed production remediation.

The procedures apply to the TaxPulse ECS services behind the shared application
load balancer:

1. Tax Engine calculation latency degradation.
2. Core Case API availability degradation.

These are the only failure modes covered here. Redis, RDS, queues, authentication,
and other dependencies may appear as evidence during triage, but they are not
additional runbook modes.

## Service boundaries and prerequisites

- Core Case Service receives `/v1/*` traffic on port 3000 and calls the Tax Engine
  for `/tax-calculations` and `/scenarios/comparisons`.
- Tax Engine receives calculation traffic on port 8000 and exposes `GET /health`.
- The Core Case target group is health-checked at `GET /health`; ECS replaces tasks
  that fail health checks. Both services write application and collector logs to
  CloudWatch Logs.
- Use the applicable [SCRUM-187 SLO and alarm documentation](service-level-objectives.md)
  for thresholds, metric definitions, dimensions, and alarm relationships.
- Use the [SCRUM-171 disposition-log template](../planning/scrum-171-disposition-log-template.md)
  for one evidence record per incident or triaged issue.
- Confirm the AWS region, environment, incident owner, CloudWatch access, ECS
  read access, and access to the approved deployment/change record before starting.

## Start the incident record

At acknowledgment, create or locate the incident record and capture the UTC time,
environment, responder, notification source, affected service, and customer-visible
symptom. Copy the alarm state and alarm history into the disposition record before
changing anything. Use synthetic identifiers in drills and never paste credentials,
tokens, or taxpayer data into the record.

Alarm names below use the environment-derived form
`${name_prefix}-${environment}-...`. With the current Terraform defaults
`name_prefix=taxpulse` and `environment=dev`, the documented names are the
`taxpulse-dev-...` values shown in each table.

## 1. Tax Engine calculation latency degradation

### Signal and decision boundary

The latency SLO covers successful tax-engine-backed requests from Core Case. The
alarm is raised when p95 of `TaxPulse` EMF observations for
`tax_plan_cycle.tax_engine_request.duration_ms`, with
`service=core-case-service`, exceeds 2000 ms for the configured evaluation
window. A slow successful request is this mode; a failed request belongs in the
availability path when it becomes a target-side 5xx signal.

### Numbered triage

Every row is a required entry in the disposition record. The alarm link is the
applicable section of the [SLO/alarm reference](service-level-objectives.md#slo-1-calculation-latency).

| Step | Action | Alarm | Disposition record | Expected decision/output |
| ---: | --- | --- | --- | --- |
| 1 | Acknowledge the page, record the UTC start time and environment, and review the alarm state and recent state transitions. | [Latency SLO alarm](service-level-objectives.md#slo-1-calculation-latency): `taxpulse-dev-slo-tax-engine-latency-risk` (pattern `${name_prefix}-${environment}-slo-tax-engine-latency-risk`) | [SCRUM-171 template](../planning/scrum-171-disposition-log-template.md) | Confirm this is a latency alarm, assign an owner, and preserve the initial alarm evidence. |
| 2 | In CloudWatch, confirm the p95 metric and its `service=core-case-service` dimension over the alarm window. Record the `TaxPulse` namespace, metric, dimensions, statistic, period, and observed values. | [Latency SLO alarm](service-level-objectives.md#slo-1-calculation-latency): `taxpulse-dev-slo-tax-engine-latency-risk` | [SCRUM-171 template](../planning/scrum-171-disposition-log-template.md) | Decide whether the breach is sustained and whether traffic volume is sufficient; do not infer a cause from a single sample. |
| 3 | Correlate slow observations with Core Case and Tax Engine CloudWatch log events using the request ID, trace ID, route, timestamp, and duration. Inspect the Tax Engine call and any retries or timeout evidence. | [Latency SLO alarm](service-level-objectives.md#slo-1-calculation-latency): `taxpulse-dev-slo-tax-engine-latency-risk` | [SCRUM-171 template](../planning/scrum-171-disposition-log-template.md) | Identify whether delay is in Core Case orchestration, the inter-service call, Tax Engine processing, or an observable dependency; record correlation IDs. |
| 4 | Inspect ECS service events, running task counts, task restarts, deployment state, and recent task-definition or image changes for both services. Compare timestamps with the metric breach. | [Latency SLO alarm](service-level-objectives.md#slo-1-calculation-latency): `taxpulse-dev-slo-tax-engine-latency-risk` | [SCRUM-171 template](../planning/scrum-171-disposition-log-template.md) | Determine whether a deployment, task replacement, capacity change, or stable workload change is the strongest supported contributing factor. |
| 5 | Contain only with an approved, reversible operational action: pause a suspect rollout or route the incident to the service owner for an approved rollback/scale decision. Do not edit alarms, terminate tasks, or change live infrastructure from this runbook. | [Latency SLO alarm](service-level-objectives.md#slo-1-calculation-latency): `taxpulse-dev-slo-tax-engine-latency-risk` | [SCRUM-171 template](../planning/scrum-171-disposition-log-template.md) | Record the approval, action, timestamp, expected effect, and owner. Escalate to Platform/Tax Engine owners if impact persists, worsens, or lacks a safe reversible action. |
| 6 | Verify recovery by watching the same p95 metric through at least one complete alarm evaluation window, checking alarm history for `OK`, and exercising an approved synthetic or non-sensitive request if available. Recheck logs for normal completion and correlated IDs. | [Latency SLO alarm](service-level-objectives.md#slo-1-calculation-latency): `taxpulse-dev-slo-tax-engine-latency-risk` | [SCRUM-171 template](../planning/scrum-171-disposition-log-template.md) | Mark monitoring only when p95 is below the SLO threshold with normal service evidence; close only after the owner confirms customer impact has ended and follow-up work is recorded. |

### Containment, escalation, and recovery

Keep the incident in monitoring if the alarm returns to `OK` but the cause is not
known. Escalate immediately when the latency breach coincides with target 5xxs,
unhealthy targets, broad customer impact, or an unsafe deployment state; use the
availability procedure below when the Core Case availability alarm also fires.

## 2. Core Case API availability degradation

### Signal and decision boundary

The Core Case availability SLO covers ALB-forwarded `/v1/*` requests. The
composite alarm enters `ALARM` when either target-side 5xx error-budget burn or
zero healthy Core Case targets is alarming. Fixed ALB 404s and client 4xxs are
not target-side 5xx failures. The responder must distinguish these two child
signals before selecting containment.

### Numbered triage

Every row is a required entry in the disposition record. The alarm links point to
the applicable [SCRUM-187 availability sections](service-level-objectives.md#slo-2-case-api-availability).

| Step | Action | Alarm | Disposition record | Expected decision/output |
| ---: | --- | --- | --- | --- |
| 1 | Acknowledge the page, record the UTC start time and environment, and inspect the composite alarm history and its child alarm states. | [Availability composite](service-level-objectives.md#slo-2-case-api-availability): `taxpulse-dev-slo-core-case-availability-risk` (pattern `${name_prefix}-${environment}-slo-core-case-availability-risk`) | [SCRUM-171 template](../planning/scrum-171-disposition-log-template.md) | Confirm whether the incident is driven by target 5xx error-budget burn, unhealthy hosts, or both; assign an owner. |
| 2 | If error-budget burn is alarming, compare ALB `RequestCount` with `HTTPCode_Target_5XX_Count` for the Core Case target group and record the metric-math result, period, and window. | [Availability error-budget alarm](service-level-objectives.md#slo-2-case-api-availability): `taxpulse-dev-slo-core-case-availability-error-budget-burn` (pattern `${name_prefix}-${environment}-slo-core-case-availability-error-budget-burn`) | [SCRUM-171 template](../planning/scrum-171-disposition-log-template.md) | Determine whether target-side 5xxs exceed 0.1% of forwarded requests; exclude fixed 404s and client 4xxs from the conclusion. |
| 3 | Correlate target 5xx responses with Core Case logs, request IDs, trace IDs, route paths, timestamps, and recent ECS task events. Check whether the Tax Engine call or another dependency is visible in the failing traces. | [Availability error-budget alarm](service-level-objectives.md#slo-2-case-api-availability): `taxpulse-dev-slo-core-case-availability-error-budget-burn` | [SCRUM-171 template](../planning/scrum-171-disposition-log-template.md) | Identify the affected endpoint and supported failure boundary; preserve representative evidence without sensitive request contents. |
| 4 | If unhealthy-hosts is alarming, inspect the Core Case ECS service desired/running counts, task health and events, ALB target-group health reasons, deployment state, and `GET /health` failures. | [Unhealthy-hosts alarm](service-level-objectives.md#slo-2-case-api-availability): `taxpulse-dev-slo-core-case-unhealthy-hosts` (pattern `${name_prefix}-${environment}-slo-core-case-unhealthy-hosts`) | [SCRUM-171 template](../planning/scrum-171-disposition-log-template.md) | Decide whether there are no healthy ECS targets, a failing health check, task startup failure, or a load-balancer/network placement issue. |
| 5 | Inspect recent deployment and configuration changes. Apply only an approved reversible containment action, such as pausing a rollout or escalating an approved rollback/scale decision; do not manually delete tasks or edit live infrastructure. | [Availability composite](service-level-objectives.md#slo-2-case-api-availability): `taxpulse-dev-slo-core-case-availability-risk` | [SCRUM-171 template](../planning/scrum-171-disposition-log-template.md) | Escalate to Core Case and Platform owners immediately for zero healthy targets, rising 5xxs, sustained customer impact, or no safe containment. |
| 6 | Verify recovery separately for the active child signal: confirm healthy target count is at least 1 when health was the issue, and confirm target-side 5xx ratio is below 0.1% when error-budget burn was the issue. Confirm the composite and child alarms return to `OK` and logs show successful requests. | [Availability composite](service-level-objectives.md#slo-2-case-api-availability): `taxpulse-dev-slo-core-case-availability-risk`; child alarms: `taxpulse-dev-slo-core-case-availability-error-budget-burn` and `taxpulse-dev-slo-core-case-unhealthy-hosts` | [SCRUM-171 template](../planning/scrum-171-disposition-log-template.md) | Keep monitoring until the relevant evaluation windows complete. Close only when target health, request outcomes, alarm state, and owner validation agree. |

### Containment, escalation, and recovery

Do not treat an `OK` composite alone as proof of recovery: record which child
signal cleared and why. If target-side 5xxs continue, follow the error-budget
evidence path and escalate to the Core Case owner. If healthy targets remain at
zero, prioritize service/task/target-health evidence and Platform escalation.
Customer impact, simultaneous latency and availability alarms, or uncertainty
about a safe reversible action warrants incident-command escalation.

## Evidence and closeout standard

The disposition entry should include the incident identifier, UTC timestamps,
environment, owner, service boundary, symptom, metric coordinates, alarm names,
request/trace correlation, relevant log groups, ECS or target-health evidence,
root-cause confidence, immediate containment, permanent follow-up, status, and
validation result. Record unknowns as unknowns. A runbook walkthrough or incident
is complete only after the responder has documented the recovery signal and the
owner has accepted any follow-up ticket.

## Synthetic tabletop review

This tabletop was conducted on 2026-08-28 using synthetic identifiers only. No
CloudWatch, ECS, ALB, or other live infrastructure was queried or changed.

**Review metadata**

- Incident identifier: `SYN-188-TABLETOP-001`
- Environment: `sandbox-tabletop`
- Reviewer role: Platform on-call documentation reviewer
- Review date: 2026-08-28
- Outcome: **PASS with documented follow-up**

### Inject A — Tax Engine calculation latency

At 14:00 UTC, the synthetic alarm
`taxpulse-dev-slo-tax-engine-latency-risk` enters `ALARM`. Synthetic p95 for
`tax_plan_cycle.tax_engine_request.duration_ms` is 2,450 ms for successful
requests with `service=core-case-service`.

| Review point | Expected tabletop response |
| --- | --- |
| Alarm and action | Acknowledge the alarm, assign the incident owner, and record the state transition and UTC time in `SYN-188-TABLETOP-001`. |
| Evidence in disposition format | Record the `TaxPulse` namespace, metric and dimensions, p95 window, synthetic request ID `req-syn-188-latency-001`, trace ID `trace-syn-188-latency-001`, Core Case and Tax Engine log coordinates, ECS events, and recent deployment evidence in the [SCRUM-171 disposition format](../planning/scrum-171-disposition-log-template.md). |
| Decision and escalation | Correlate the request and trace IDs, then decide whether the delay is in Core Case, the inter-service call, Tax Engine, or a visible dependency. Escalate to Platform and Tax Engine owners if the breach persists or no approved reversible containment exists. |
| Recovery criterion | Keep monitoring until the same p95 signal is below 2,000 ms through a complete evaluation window, the alarm is `OK`, and synthetic successful-request logs show normal completion. |

### Inject B — Core Case API availability

At 14:08 UTC, while Inject A is under investigation, the synthetic composite
alarm `taxpulse-dev-slo-core-case-availability-risk` enters `ALARM`. The
responder must inspect both child alarms. The tabletop first presents target-side
5xx error-budget burn, then presents zero healthy targets as a separate branch.

| Review point | Expected tabletop response |
| --- | --- |
| Alarm and action | Acknowledge the composite, record its state and child states, and preserve the synthetic timeline in `SYN-188-TABLETOP-001`. |
| 5xx branch evidence | For `taxpulse-dev-slo-core-case-availability-error-budget-burn`, record synthetic ALB `RequestCount`, `HTTPCode_Target_5XX_Count`, the calculated ratio, Core Case request/trace IDs `req-syn-188-api-001` and `trace-syn-188-api-001`, route, log coordinates, and ECS events in the [SCRUM-171 disposition format](../planning/scrum-171-disposition-log-template.md). Exclude fixed 404s and client 4xxs. |
| 5xx branch decision | Treat the branch as target-side availability degradation when the ratio exceeds 0.1%; escalate to the Core Case owner for sustained customer impact or rising errors. |
| Unhealthy-target branch evidence | For `taxpulse-dev-slo-core-case-unhealthy-hosts`, record synthetic desired/running task counts, target health reasons, ECS task events, deployment state, and `GET /health` results in the [SCRUM-171 disposition format](../planning/scrum-171-disposition-log-template.md). |
| Unhealthy-target branch decision | Treat zero healthy targets as a distinct health/deployment boundary. Escalate to Core Case and Platform owners and use only an approved reversible rollout or rollback/scale decision. |
| Recovery criterion | Confirm the relevant child alarm clears: target-side 5xx ratio is below 0.1% or healthy target count is at least 1, respectively. Then confirm both child and composite alarms are `OK`, successful request evidence exists, and the owner accepts the closeout. |

### Tabletop gaps and review result

The walkthrough identified one clarity gap: a responder could initially treat the
availability composite as a single cause and miss the distinction between target
5xxs and zero healthy targets. The runbook correction is the explicit child-alarm
branch in the availability triage table, including separate evidence and recovery
criteria. The latency procedure was also checked for request/trace correlation,
deployment evidence, and a complete-window recovery signal. Both failure-mode
paths were executable from the documented procedure, so the review outcome is
**PASS with follow-up to repeat the tabletop after SCRUM-187 alarm deployment**.
