---
document_id: syn-tc-4100
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

# SYN-TC-4100 Estimated Payment Trigger Rules for Non-Withheld Income

This document is synthetic training content from the fictional Northstar Synthetic Tax Planning Authority. All rates, thresholds, dates, and limits in this document are invented and must not be treated as real tax law.

## SYN-TC-4100-a General trigger for non-withheld income

A covered planning household enters estimated-payment review when it expects material income that is not collected through wage withholding. Non-withheld income includes synthetic dividends, interest, self-employment receipts, consulting fees, concentrated equity proceeds, and similar inflows that are not already covered by scheduled payroll withholding.

The advisor must treat this rule as a planning trigger rather than as an automatic payment command. A trigger means the household needs projection review, source classification, and payment-timing analysis before a recommendation is recorded.

The trigger is intentionally broad so retrieval can distinguish income-source analysis from payment-threshold analysis. A recommendation that asks whether non-withheld income exists should retrieve this provision before it retrieves the safe-harbor table in SYN-TC-4110. A recommendation that already knows the filing status and payment target should retrieve the safe-harbor provision instead.

The triggering facts should be recorded as plain planning facts: income type, expected amount, expected quarter, and whether withholding already covers that source. The provision does not require the advisor to calculate a final payment amount.

### SYN-TC-4100-b Materiality threshold for review

The synthetic review threshold is met when projected non-withheld income exceeds 9,500 for the current planning year or when projected tax due from that income exceeds 1,250 after available credits. Both values are invented training limits.

If both values are below threshold, the advisor may document that estimated-payment review was considered and deferred. If either value is above threshold, the advisor should compare quarterly payment options before the next payment window.

For retrieval testing, this subsection is the expected source when the query mentions material non-withheld income but does not mention a filing status. The invented numbers are deliberately different from the filing-status thresholds in SYN-TC-4110-a and SYN-TC-4110-b so a retriever must attend to context.

## SYN-TC-4100-c Exclusions from the trigger

Income already covered by verified wage withholding does not count toward the non-withheld trigger. One-time reimbursements, corrected payroll deposits, and previously accrued synthetic refunds are excluded unless the advisor documents that they changed the tax projection.

An excluded item may still appear in the case narrative, but it should not drive the estimated-payment trigger by itself. If a client receives both excluded reimbursements and non-withheld consulting income, only the consulting income should be counted for this provision.

### SYN-TC-4100-d Citation and documentation requirement

Every recommendation citing this provision must cite the section identifier and document title. The citation must retain the synthetic label and may not rewrite this section as an actual legal authority.

The citation should be used alongside a playbook citation when the advisor is explaining workflow. For example, SYN-TC-4100-a explains why review is triggered, while SYN-PB-01-a explains which intake questions the advisor asks.
