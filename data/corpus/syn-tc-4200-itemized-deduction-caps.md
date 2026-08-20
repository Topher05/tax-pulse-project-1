---
document_id: syn-tc-4200
document_type: tax_code
synthetic: true
fictional_issuer: Northstar Synthetic Tax Planning Authority
invented_rates_and_limits: true
tenant:
  tenant_id: tenant-alpha
  tenant_visibility: single-tenant
  audience: reviewer
  content_label: synthetic-training
---

# SYN-TC-4200 Itemized Deduction Cap Provisions

This document is synthetic training content from the fictional Northstar Synthetic Tax Planning Authority. All rates, thresholds, dates, and limits in this document are invented and must not be treated as real tax law.

## SYN-TC-4200-a Invented 2026 itemized deduction cap

For the 2026 synthetic planning year, a household must compare projected itemized deductions to the cap shown below before recommending deduction bunching. This rule is deliberately similar to SYN-TC-4200-b and differs in tax year only.

This section is built as a near duplicate of the 2027 section. The cap and phase-out numbers intentionally remain the same so the only material retrieval distinction is the tax year. A query that says 2026 should retrieve this section before the 2027 section.

| tax year | invented filing group | invented deduction cap | invented phase-out start |
| --- | --- | ---: | ---: |
| 2026 | all training households | 36500 | 240000 |

### SYN-TC-4200-c Cap application order

The 2026 cap applies after classifying deductions but before applying any synthetic charitable contribution percentage limit. Advisors must keep the ordering visible in the recommendation note.

If a recommendation includes charitable contributions, the advisor should cite this cap section first for total itemized deduction review, then cite SYN-TC-4210-a or SYN-TC-4210-b for the contribution percentage limit.

## SYN-TC-4200-b Invented 2027 itemized deduction cap

For the 2027 synthetic planning year, a household must compare projected itemized deductions to the cap shown below before recommending deduction bunching. This rule is deliberately similar to SYN-TC-4200-a and differs in tax year only.

This section is intentionally close to the 2026 section to expose weak retrieval behavior. If the retriever ignores year references, it may rank both sections similarly; downstream tests should confirm the year-specific chunk can still be selected.

| tax year | invented filing group | invented deduction cap | invented phase-out start |
| --- | --- | ---: | ---: |
| 2027 | all training households | 36500 | 240000 |

### SYN-TC-4200-d Cap carryforward note

The 2027 rule does not create a deduction carryforward. If a playbook entry proposes a carryforward workflow, it must cite an advisory playbook section rather than this rule provision.

For client-facing explanations, the advisor should say that the cap is an invented training limit and that the year controls which synthetic provision is being applied.
