# Contributing Guide

This repository uses short, reviewable changes with explicit ticket and ADR linkage.
Keep PRs small enough to review in one pass, and keep all synthetic data clearly fake.
Follow the Git flow conventions below when naming branches and requesting review.

## Git Flow
Conventions documented in [confluence](https://fedstack-june22-t1.atlassian.net/wiki/spaces/OTHER/pages/2162869/GitFlow)

### Branch Naming (Jira features)

Use lowercase kebab-case with the Jira key at the end of the branch name. Feature branches must include the developer name and feature ticket number. `firstname-lastname-jiraXX`

Examples:
- `martins-okorie-jira43`
- `dylan-harle-jira37`

Feature branch names should not deviate from this pattern, the ticket key at the end is mandatory.

### Branch Naming (Releases)
Use Version tagging strategy: **release-vMAJOR.MINOR.PATCH**
- MAJOR: Breaking changes
- MINOR: Backward-compatible features
- PATCH: Backward-compatible bug fixes or hotfixes

Examples:
- `release-v2.1.2`
- `release-v3.0.0`

### Branch Naming (Hotfixes)
Use lowercase kebab-case with the hotfix number at the end of the branch name.

Branches must include the developer name and the hotfix number.

`firstname-lastname-hotfixYY`

Examples:
- `caleb-latimer-hotfix1`
- `christopher-martus-hotfix87`

## Pull Requests

Every PR should include:
- the branch identifier (jira, hotfix or release)
- a brief summary of the contained changes
- an ADR link when the change affects architecture, workflow, or domain behavior
- acceptance criteria as a checklist which should include setup, testing, how to verify that the task is complete
- any migration, rollout, or review-risk notes
- checklist completion status

Use the PR template in [`.github/pull_request_template.md`](./.github/pull_request_template.md).

## AI Review Checklist

Before requesting review, run the checklist in
[`planning/ai-review-checklist.md`](./planning/ai-review-checklist.md).

The review should confirm:
- branch naming follows the repo convention
- the branch type matches the Git flow rules
- the PR describes the actual change clearly
- the ADR link is present when the change needs one
- tests, validation, and risk notes are complete
- the PR does not introduce secrets or real taxpayer data
- migrations, rollback concerns, and branch-specific pipeline expectations are called
  out when relevant

## Sample PR

See [`planning/sample-pr.md`](./planning/sample-pr.md) for a completed example that
shows the ADR link and a filled-out review checklist.
