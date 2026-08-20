---
document_id: syn-tc-4210
document_type: tax_code
synthetic: true
fictional_issuer: Northstar Synthetic Tax Planning Authority
invented_rates_and_limits: true
tenant:
  tenant_id: tenant-shared
  tenant_visibility: shared-training
  audience: advisor
  content_label: synthetic-training
---

# SYN-TC-4210 Charitable Contribution Percentage-Limit Provisions

This document is synthetic training content from the fictional Northstar Synthetic Tax Planning Authority. All rates, thresholds, dates, and limits in this document are invented and must not be treated as real tax law.

## SYN-TC-4210-a Invented 48 percent contribution limit

For synthetic cash contribution planning, the maximum current-year contribution used in the retrieval corpus is 48 percent of invented adjusted planning income. This rule is deliberately similar to SYN-TC-4210-b and differs in contribution limit only.

The 48 percent limit is intended to be easy to confuse with the 52 percent limit. Both sections refer to cash contribution planning, invented adjusted planning income, and substantiation review. The contribution percentage is the only material detail that should separate the two.

| contribution type | invented percentage limit | invented minimum substantiation amount |
| --- | ---: | ---: |
| cash contribution | 48% | 500 |

### SYN-TC-4210-c Substantiation reminder

The advisor should retain a synthetic support note when projected cash contributions exceed the invented substantiation amount. The support note is training material and is not a real documentation standard.

The support note should identify the source of the projected gift, the expected payment date, and whether the household is also near an itemized deduction cap. It should not invent a real charitable contribution rule.

## SYN-TC-4210-b Invented 52 percent contribution limit

For synthetic cash contribution planning, the maximum current-year contribution used in the retrieval corpus is 52 percent of invented adjusted planning income. This rule is deliberately similar to SYN-TC-4210-a and differs in contribution limit only.

The 52 percent limit should retrieve only when the query names that limit or describes the alternate contribution-limit scenario. A generic charitable contribution query may retrieve both near duplicates, so downstream reranking work can later decide which section fits best.

| contribution type | invented percentage limit | invented minimum substantiation amount |
| --- | ---: | ---: |
| cash contribution | 52% | 500 |

### SYN-TC-4210-d Excess contribution treatment

Projected contributions above the invented current-year limit should be routed to advisor review rather than automatically removed from a recommendation.

The advisor review should compare the current-year recommendation, bunching options, and whether any client explanation needs to mention that the threshold is synthetic training content.
