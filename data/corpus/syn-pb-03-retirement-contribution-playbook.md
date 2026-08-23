---
document_id: syn-pb-03
document_type: playbook
synthetic: true
fictional_issuer: Northstar Synthetic Tax Planning Authority
invented_rates_and_limits: true
tenant:
  tenant_id: tenant-beta
  tenant_visibility: single-tenant
  audience: advisor
  content_label: synthetic-training
---

# SYN-PB-03 Playbook for Retirement Contribution Planning

This document is synthetic training content from the fictional Northstar Synthetic Tax Planning Authority. All rates, thresholds, dates, and limits in this document are invented and must not be treated as real tax law.

## SYN-PB-03-a Retirement planning intake

Ask whether the client has cash flow available for a retirement contribution, whether the contribution is already scheduled, and whether projected income falls inside a synthetic phase-out range. Record the answer before generating an action item.

This intake step keeps cash-flow recommendations separate from credit eligibility recommendations. A client may have capacity to contribute even when the invented credit is phased out, and a client may qualify for a credit but lack cash flow for the contribution.

### SYN-PB-03-b Retirement planning contribution limit checklist

Use this invented checklist table before recommending a contribution amount.

| planning profile | invented contribution review limit | related rule citation |
| --- | ---: | --- |
| starter household | 7000 | SYN-TC-4300-a |
| established household | 11500 | SYN-TC-4300-a |
| replacement-credit review | 14000 | SYN-TC-4310-b |

The checklist is meant to direct the advisor to the correct source, not to calculate the contribution. If the recommendation is about the phase-out range, cite SYN-TC-4300-a. If the recommendation is about the current maximum credit after 2026-01-01, cite SYN-TC-4310-b.

## SYN-PB-03-c Phase-out interpretation

If projected income falls below the phase-out start, the recommendation may focus on contribution timing. If projected income falls inside the phase-out range, the recommendation should explain that the invented credit may be reduced.

If projected income is above the phase-out end, the advisor may still recommend a contribution for non-credit planning reasons, but the explanation should not suggest that the synthetic credit remains available.

### SYN-PB-03-d Reviewer note for credit changes

If the recommendation date is after 2026-01-01, cite SYN-TC-4310-b for the replacement credit amount. Do not cite the superseded rule unless the scenario date falls before the replacement effective date.

Reviewer comments should call out mismatched dates explicitly. Date-sensitive citation behavior is one of the retrieval properties this corpus is designed to test.
