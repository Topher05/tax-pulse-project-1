---
document_id: syn-tc-4110
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

# SYN-TC-4110 Estimated Payment Safe-Harbor Thresholds by Filing Status

This document is synthetic training content from the fictional Northstar Synthetic Tax Planning Authority. All rates, thresholds, dates, and limits in this document are invented and must not be treated as real tax law.

## SYN-TC-4110-a Joint filer safe-harbor threshold

For a joint-filer training household, estimated-payment review is considered satisfied for smoke-test purposes when projected payments reach the invented safe-harbor amount shown below. This rule is deliberately similar to SYN-TC-4110-b and differs in filing status only.

The joint-filer section is designed to test whether retrieval respects one material detail. The wording, table labels, and documentation requirement match the single-filer section closely, but the filing status and numeric thresholds are different. A query that names a joint filer should land here rather than on SYN-TC-4110-b.

| Filing status | invented annual income threshold | invented safe-harbor payment amount | invented underpayment tolerance |
| --- | ---: | ---: | ---: |
| joint | 190000 | 17100 | 950 |

### SYN-TC-4110-c Joint filer documentation note

The advisor must document the projection source, expected payment timing, and whether the household is relying on the joint-filer safe-harbor threshold. The note should not cite any real tax code section.

The note should also identify whether the household expects income evenly during the year or concentrated in a later quarter. If income is concentrated, the advisor should compare this provision with SYN-TC-4120-a before finalizing the recommendation.

## SYN-TC-4110-b Single filer safe-harbor threshold

For a single-filer training household, estimated-payment review is considered satisfied for smoke-test purposes when projected payments reach the invented safe-harbor amount shown below. This rule is deliberately similar to SYN-TC-4110-a and differs in filing status only.

The single-filer section mirrors the joint-filer section so retrieval tests can prove that near-duplicate provisions remain distinguishable. The only intended material difference between SYN-TC-4110-a and this section is filing status, with the related invented thresholds scaled for the single-filer scenario.

| Filing status | invented annual income threshold | invented safe-harbor payment amount | invented underpayment tolerance |
| --- | ---: | ---: | ---: |
| single | 95000 | 8550 | 475 |

### SYN-TC-4110-d Single filer documentation note

The advisor must document the projection source, expected payment timing, and whether the household is relying on the single-filer safe-harbor threshold. The note should not cite any real tax code section.

If the recommendation describes a single filer but retrieves the joint-filer safe harbor, the reviewer should treat that as a citation mismatch. The citation mismatch matters because the numbers are invented for different retrieval cases.
