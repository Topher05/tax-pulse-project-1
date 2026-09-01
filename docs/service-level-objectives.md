# Service Level Objectives

This document captures SCRUM-187's service level objectives, error budgets, and
the CloudWatch alarms that warn on-call when the objectives are at risk.

## Scope

- Window: rolling 28 days.
- Platform services covered here: Tax Engine calculation latency and Core Case
  API availability behind the ECS application load balancer.
- Alarm transport: KMS-encrypted SNS topic `taxpulse-dev-slo-alarms` under the
  current Terraform root defaults of `name_prefix=taxpulse` and
  `environment=dev`.

## SLO 1: Calculation Latency

- SLI: p95 of successful `tax_plan_cycle.tax_engine_request.duration_ms`
  observations for `service=core-case-service`.
- Objective: 95% of successful tax-engine backed calculation requests complete
  within 2000 milliseconds over 28 days.
- Error budget: 5% of successful requests may exceed 2000 milliseconds inside
  the rolling window.
- Included traffic: successful Core Case requests from the tax-engine client to
  `/tax-calculations` and `/scenarios/comparisons`.
- Excluded traffic: retries that do not complete successfully and periods with
  no request traffic.

CloudWatch implementation:

- Metric source: Embedded Metric Format records emitted by the Core Case
  tax-engine client into namespace `TaxPulse`.
- Alarm: `taxpulse-dev-slo-tax-engine-latency-risk`.
- Alarm rule: metric alarm on `tax_plan_cycle.tax_engine_request.duration_ms`
  with `service=core-case-service`, statistic `p95`, period 5 minutes,
  threshold `> 2000`, alarming on 3 of 5 datapoints.
- Missing data handling: `notBreaching`.
- Low sample handling: percentile evaluation ignores low sample counts.

## SLO 2: Case API Availability

- SLI: `1 - (target 5xx requests / total forwarded requests)` for the Core Case
  `/v1/*` target group over 28 days.
- Objective: 99.9% availability for Core Case API requests over 28 days.
- Error budget: 0.1% of forwarded requests may return target-side 5xx errors
  inside the rolling window.
- Included traffic: ALB forwarded requests to the Core Case target group.
- Excluded traffic: ALB fixed 404s before target selection, client 4xx errors,
  and no-traffic periods.

CloudWatch implementation:

- Metrics: `AWS/ApplicationELB` `RequestCount` and
  `HTTPCode_Target_5XX_Count` for the Core Case target group on the shared ALB.
- Alarm: `taxpulse-dev-slo-core-case-availability-error-budget-burn`.
- Alarm rule: metric math expression `IF(requests > 0, errors / requests, 0)`
  with threshold `> 0.001`, period 5 minutes, alarming on 3 of 5 datapoints.
- Missing data handling: `notBreaching`.

Supporting health alarm:

- Alarm: `taxpulse-dev-slo-core-case-unhealthy-hosts`.
- Rule: `HealthyHostCount < 1` for 2 consecutive 1-minute datapoints.
- Missing data handling: `breaching`.

Composite operator alarm:

- Alarm: `taxpulse-dev-slo-core-case-availability-risk`.
- Rule: enters alarm if either the error-budget burn alarm or the unhealthy host
  alarm is in `ALARM`.

## Notification And Runbook Notes

- Terraform manages the SNS topic, its customer-managed KMS key, and the
  CloudWatch publishing policies.
- CloudWatch publishes both `ALARM` and `OK` transitions to that topic.
- Topic subscriptions are intentionally managed outside this repository so each
  environment can attach its own pager or chat destinations.
- SCRUM-171's documentation template remains the place to extend incident
  response workflow details if the team wants a deeper operator runbook.

## Verification

- TypeScript tests assert the corrected EMF dimensions and the rollup metric
  shape used by the latency SLO.
- Terraform tests assert the SLO alarms, composite alarm, SNS topic policy, and
  exported outputs are all wired into the ECS services module.
- Terraform validation should be run after importing or creating the SNS topic
  in the target AWS account.
