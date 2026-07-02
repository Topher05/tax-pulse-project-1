# AI Review Checklist

Use this checklist for every AI-assisted review in TaxPulse.

## Verify

- [ ] Branch name uses lowercase kebab-case and ends with the Jira key
- [ ] PR summary matches the actual code or doc change
- [ ] Ticket reference is present
- [ ] ADR link is included when the change affects architecture, workflow, or domain behavior
- [ ] Validation steps are listed and credible
- [ ] Migration impact is described when schema or data changes are involved
- [ ] Rollback or failure-mode notes are included when the change is risky
- [ ] Tenant isolation and least-privilege concerns remain intact
- [ ] No secrets, tokens, or real taxpayer data were added
- [ ] Any sample data is synthetic and clearly fake
- [ ] The change does not introduce a second source of truth for workflow state
- [ ] The review result is explicit: approved, changes requested, or blocked

## Review Prompt

Use this prompt shape when asking an AI to review a PR:

> Review this PR for correctness, security, data safety, tenant isolation, and alignment with the linked ADR. Confirm the branch naming, summary, ticket, validation, and migration notes are complete. Call out anything missing or risky.

## Review Output

The review should answer:

1. What changed?
2. Is the ADR link correct?
3. Are the tests and validation sufficient?
4. Are there any schema, migration, or rollback concerns?
5. Are there any security or data-handling issues?
6. Is the PR ready to merge, or what must change first?
