<!-- path: data/corpus/CORPUS-SPEC.md -->
<!-- Hand this to your AI tool. Generating against a SPEC is what separates a corpus
     you can measure retrieval on from ten interchangeable pages. -->
# Corpus specification — rule provisions and planning playbook

## Scope
<!-- 10-12 documents, 2-4 pages each, from a FICTIONAL issuing authority you name,
     split between rule provisions and advisory playbook guidance. -->

## Required structure
<!-- Title, sections, subsections. A stable identifier on EVERY section
     (e.g. TC-4021-b for provisions, PB-07 for playbook entries), unique corpus-wide,
     in a scheme that plainly does NOT resemble a real code citation. -->

## Required content properties
<!-- - threshold tables with real numbers (caps, phase-out ranges, limits)
     - 2-3 near-duplicate provisions differing in exactly ONE material detail
       (filing status, year, or limit)
     - one superseded provision with an effective date, alongside its replacement
     - tenant metadata in each document's front matter -->

## Decisions to complete before generation

- Fictional issuer: `Northstar Synthetic Tax Planning Authority`

- Tenant metadata fields and allowed values:
  - `tenant_id`: `tenant-alpha`, `tenant-beta`, `tenant-shared`
  - `tenant_visibility`: `single-tenant`, `shared-training`
  - `audience`: `advisor`, `reviewer`, `client-facing-summary`
  - `content_label`: `synthetic-training`
  - `invented_rates_and_limits`: `true`

- Stable section-identifier pattern: `SYN-TC-####-x` for rule provisions and `SYN-PB-##-x` for playbook entries.
  Example rule identifiers: `SYN-TC-4100-a`, `SYN-TC-4100-b`.
  Example playbook identifiers: `SYN-PB-07-a`, `SYN-PB-07-b`.
  These identifiers are synthetic and must not be presented as real tax code citations.

- Documents and policy areas:
  1. `SYN-TC-4100` Estimated payment trigger rules for non-withheld income
  2. `SYN-TC-4110` Estimated payment safe-harbor thresholds by filing status
  3. `SYN-TC-4120` Quarterly underpayment exception rules
  4. `SYN-TC-4200` Itemized deduction cap provisions
  5. `SYN-TC-4210` Charitable contribution percentage-limit provisions
  6. `SYN-TC-4300` Retirement contribution credit phase-out provisions
  7. `SYN-TC-4310` Superseded retirement contribution credit provision and replacement
  8. `SYN-PB-01` Advisor playbook for estimated payment recommendations
  9. `SYN-PB-02` Playbook for deduction bunching and cap review
  10. `SYN-PB-03` Playbook for retirement contribution planning
  11. `SYN-PB-04` Client explanation playbook for superseded rules and effective dates

- Table-bearing section identifiers:
  - `SYN-TC-4110-a` estimated payment safe-harbor thresholds
  - `SYN-TC-4110-b` filing-status payment thresholds
  - `SYN-TC-4200-a` itemized deduction cap table
  - `SYN-TC-4210-a` charitable contribution percentage-limit table
  - `SYN-TC-4300-a` retirement credit phase-out table
  - `SYN-PB-02-b` advisor review thresholds for deduction bunching
  - `SYN-PB-03-b` retirement planning contribution limit checklist

- Near-duplicate section pairs and their one material difference:
  - `SYN-TC-4110-a` and `SYN-TC-4110-b`: different filing status only, joint vs single
  - `SYN-TC-4200-a` and `SYN-TC-4200-b`: different tax year only, 2026 vs 2027
  - `SYN-TC-4210-a` and `SYN-TC-4210-b`: different contribution limit only, 48% vs 52%

- Superseded and replacement section identifiers plus effective dates:
  - Superseded: `SYN-TC-4310-a`, effective `2025-01-01` through `2025-12-31`
  - Replacement: `SYN-TC-4310-b`, effective `2026-01-01`

## Required labelling
<!-- Every document declares itself synthetic training content from a fictional
     authority and states that its rates and limits are invented. -->