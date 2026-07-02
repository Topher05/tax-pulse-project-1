# Sample PR: Document Team Review Workflow

**Branch:** `chimaobi-docs-pr-template-jira38`

**Ticket:** `SCRUM-38`

**ADR Link:** [ADR-0001: Tax Plan Cycle condition lives in stage](../adr/0001-condition-lives-in-stage.md)

## Summary

Add a contributing guide, PR template, and AI review checklist so review expectations stay
consistent across the team.

## Validation

- Reviewed branch naming convention and repo docs layout
- Confirmed the branch follows the `feature/*` style naming rule with the Jira key at the end
- Confirmed the PR template includes summary, ticket, ADR, validation, and risk sections
- Confirmed the AI review checklist covers tenant isolation, secrets, migrations, and rollback concerns

## Risk Notes

- Docs-only change; no code paths or migrations are affected
- The checklist should be updated if the team adds new review requirements

## AI Review Checklist

- [x] Branch name follows the repo convention
- [x] Summary matches the actual change
- [x] Ticket reference is present
- [x] ADR link is present when needed
- [x] Validation is listed
- [x] Risk notes are listed when relevant
- [x] No secrets or real taxpayer data were introduced
- [x] Migration or rollback concerns were addressed when relevant

## Reviewer Notes

This PR is ready to merge. It is purely documentation, it links the relevant ADR, and it
demonstrates the completed review checklist expected for future changes.
