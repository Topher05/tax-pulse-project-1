# Contributing Guide

This repository uses short, reviewable changes with explicit ticket and ADR linkage.
Keep PRs small enough to review in one pass, and keep all synthetic data clearly fake.

## Branch Naming

Use lowercase kebab-case with the Jira key at the end of the branch name.

Examples:

- `martins-okorie-jira43`
- `docs-pr-template-jira38`
- `backend-review-checklist-jira41`

Branch names should be descriptive, but the ticket key at the end is mandatory.

## Pull Requests

Every PR should include:

- a short summary of the change
- the Jira key or planning reference
- an ADR link when the change affects architecture, workflow, or domain behavior
- test and validation notes
- any migration, rollout, or review-risk notes

Use the PR template in [`.github/pull_request_template.md`](./.github/pull_request_template.md).

## AI Review Checklist

Before requesting review, run the checklist in
[`planning/ai-review-checklist.md`](./planning/ai-review-checklist.md).

The review should confirm:

- branch naming follows the repo convention
- the PR describes the actual change clearly
- the ADR link is present when the change needs one
- tests, validation, and risk notes are complete
- the PR does not introduce secrets or real taxpayer data
- migrations and rollback concerns are called out when relevant

## Sample PR

See [`planning/sample-pr.md`](./planning/sample-pr.md) for a completed example that
shows the ADR link and a filled-out review checklist.
