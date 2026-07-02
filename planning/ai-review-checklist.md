# AI Review Checklist

Use this checklist for every AI-assisted review in TaxPulse.

## Verify

- [ ] Branch name uses lowercase kebab-case and ends with the Jira key
- [ ] Branch type matches Git flow expectations:
  - `main` is for protected production merges and follows the full production pipeline
  - `develop` is for integration merges and keeps CI, approval, and signed-commit expectations active
  - `feature/*` is for day-to-day work and should carry unit tests, linting, type checks, and lightweight security/dependency scanning
  - `release/*` is for pre-release stabilization and should carry full regression, security, version, and pre-production validation
  - `hotfix/*` is for urgent production fixes and should carry targeted tests, affected-area regression, security checks, and expedited delivery
- [ ] PR summary matches the actual code or doc change
- [ ] Ticket reference is present
- [ ] ADR link is included when the change affects architecture, workflow, or domain behavior
- [ ] Validation steps are listed and credible
- [ ] Migration impact is described when schema or data changes are involved
- [ ] Rollback or failure-mode notes are included when the change is risky
- [ ] Git flow pipeline expectations are respected for the branch type
- [ ] Tenant isolation and least-privilege concerns remain intact
- [ ] No secrets, tokens, or real taxpayer data were added
- [ ] Any sample data is synthetic and clearly fake
- [ ] The change does not introduce a second source of truth for workflow state
- [ ] The review result is explicit: approved, changes requested, or blocked

## Review Prompt

Use this prompt shape when asking an AI to review a PR:

> Review this PR for correctness, security, data safety, tenant isolation, and alignment with the linked ADR. Confirm the branch naming, summary, ticket, validation, and migration notes are complete. Call out anything missing or risky.

> Also verify the branch type matches Git flow and that the expected pipeline and protection rules for `main`, `develop`, `feature/*`, `release/*`, or `hotfix/*` are reflected in the change.

## Review Output

The review should answer:

1. What changed?
2. Is the ADR link correct?
3. Are the tests and validation sufficient?
4. Are there any schema, migration, or rollback concerns?
5. Are there any security or data-handling issues?
6. Is the PR ready to merge, or what must change first?
