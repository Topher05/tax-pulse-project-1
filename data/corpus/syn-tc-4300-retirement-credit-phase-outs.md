---
document_id: syn-tc-4300
document_type: tax_code
synthetic: true
fictional_issuer: Northstar Synthetic Tax Planning Authority
invented_rates_and_limits: true
tenant:
  tenant_id: tenant-beta
  tenant_visibility: single-tenant
  audience: reviewer
  content_label: synthetic-training
---

# SYN-TC-4300 Retirement Contribution Credit Phase-Out Provisions

This document is synthetic training content from the fictional Northstar Synthetic Tax Planning Authority. All rates, thresholds, dates, and limits in this document are invented and must not be treated as real tax law.

## SYN-TC-4300-a Invented retirement credit phase-out range

The synthetic retirement contribution credit begins to phase out when invented adjusted planning income reaches the lower bound shown below. It is fully phased out at the upper bound.

This phase-out provision should be retrieved when a recommendation asks whether income level changes the value of a retirement contribution. It should not be treated as the source for the maximum credit amount after 2026-01-01; that amount is controlled by SYN-TC-4310-b.

| filing profile | invented phase-out start | invented phase-out end | invented maximum credit |
| --- | ---: | ---: | ---: |
| starter household | 42000 | 57000 | 1600 |
| established household | 76000 | 98000 | 2400 |

### SYN-TC-4300-b Phase-out calculation note

Within the phase-out range, the advisor should model the credit as gradually reduced. The exact reduction method is outside this corpus and should not be inferred from real tax formulas.

The model should record whether the household is below, inside, or above the invented range. That classification is enough for the corpus and prevents downstream logic from hallucinating a formula not present in the source.

## SYN-TC-4300-c Contribution eligibility boundary

A household outside the phase-out range may still need contribution planning if cash flow or withholding changes. Eligibility review and contribution timing review are separate synthetic concepts.

For example, a household below the phase-out range may still choose to delay a contribution because cash flow is uncertain. That recommendation should cite the playbook for workflow and this provision only if the phase-out status matters.

### SYN-TC-4300-d Reviewer citation note

Reviewer comments should cite this section when approving or rejecting a recommendation based on phase-out range placement.

The reviewer should cite SYN-TC-4310-b instead when approving a recommendation based on the replacement maximum credit amount.
