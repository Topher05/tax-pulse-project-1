# AGENTS.md

## Project Context
TaxPulse Advisory is a multi-tenant SaaS workspace for tax liability planning used by
wealth advisory firms. The core case entity is a Tax Plan Cycle with stage-based workflow
state, role-gated transitions, scoped internal/external access, and immutable audit history.

## Languages and Layout
- Python 3.13.14 source: `src/python/tax_pulse_project_team_1`
- Python tests: `tests/python`
- TypeScript on Node.js 22.0.0 source: `src/typescript`
- TypeScript tests: `tests/typescript`

## Conventions
- Keep Python formatted with Ruff using `pyproject.toml`: line length 100, target `py313`.
- TypeScript uses strict `NodeNext` ESM settings from `tsconfig.json`.
- Do not add a separate case `status`; workflow condition lives in the case stage.
- Preserve tenant isolation, least privilege, scoped portal access, and audit-trail behavior.
- Use clearly fake synthetic data only; do not commit secrets, tokens, real taxpayer data, or `.env` files.

## Validation Commands
Run relevant checks from the repository root:

```bash
python -m ruff format --check src/python tests/python
python -m pyright
python -m pytest
npm run typecheck
npm test
```

## Ticket Journal
- When implementing a Jira ticket from `planning/stackpulse_tax.csv`, add an entry to `planning/team/ticket-journal.md` named from the current branch, whose final segment should identify the ticket each member is working on, and include the branch name, assignee, Jira key, summary, description, acceptance criteria, code connection, project scope connection, changed files, and validation notes.
