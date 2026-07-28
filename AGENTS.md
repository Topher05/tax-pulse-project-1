# AGENTS.md

## Project Context
TaxPulse Advisory is a multi-tenant SaaS workspace for tax liability planning used by
wealth advisory firms. The core case entity is a Tax Plan Cycle with stage-based workflow
state, role-gated transitions, scoped internal/external access, and immutable audit history.

## Languages and Layout
- Python 3.13.14 source: `src/tax_liability_engine`
- Python tests: `tests/tax_liability_engine`
- TypeScript on Node.js 22.0.0 source: `src/typescript`
- TypeScript tests: `tests/typescript`

## Conventions
- Keep Python formatted with Ruff using `pyproject.toml`: line length 100, target `py313`.
- Python dev dependencies live in `pyproject.toml` and currently include Ruff, pytest, and
  `pyright[nodejs]`.
- TypeScript uses strict `NodeNext` ESM settings from `tsconfig.json`.
- Do not add a separate case `status`; workflow condition lives in the case stage.
- Preserve tenant isolation, least privilege, scoped portal access, and audit-trail behavior.
- Use clearly fake synthetic data only; do not commit secrets, tokens, real taxpayer data, or `.env` files.

## Validation Commands
Run relevant checks from the repository root:

```bash
python -m ruff format --check src tests
python -m pyright --pythonpath "$(python -c 'import sys; print(sys.executable)')"
python -m pytest
npm run typecheck
npm test
```

## Ticket Journal
- When implementing a Jira ticket from `planning/stackpulse_tax.csv`, add an entry to
  the assignee's journal under `planning/team/`, using the current branch name as its
  naming source and the routing in `planning/team/README.md`. Include the branch name,
  assignee, Jira key, summary, description, acceptance criteria, code connection,
  project scope connection, changed files, and validation notes. If unsure whose ticket journal to stop and ask for the correct journal.

### Developer experience rules
- If you see a comment starting with TODO in the text **DO NOT REMOVE IT UNDER ANY CIRCUMSTANCES**
- Use the following link to a mockup of a refference example for what our end goal should be [mockupLink](https://d2bio8evtu94bp.cloudfront.net/prototypes/Real-TimeTaxLiabilityCalculator.html) aim to keep ui,ux,html,css in line with what's available here. Use the exact same typography & colors