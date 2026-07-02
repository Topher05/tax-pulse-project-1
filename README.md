# tax-pulse-project-team-1

## Project Layout

This workspace is scaffolded as a small dual-runtime project:

- TypeScript source lives in [`src/typescript`](./src/typescript)
- Python source lives in [`src/python/tax_pulse_project_team_1`](./src/python/tax_pulse_project_team_1)
- TypeScript tests live in [`tests/typescript`](./tests/typescript)
- Python tests live in [`tests/python`](./tests/python)

## Toolchain

- `nvm` is the required Node.js installer for both setup scripts.
- `pyenv` is the required Python installer for `setup.sh`.
- `nvm for Windows`, `winget`, and the `py` launcher are required for `setup.ps1`.
- Node.js is pinned in both [`.nvmrc`](./.nvmrc) and [`.tool-versions`](./.tool-versions).
- Python is pinned in [`.tool-versions`](./.tool-versions) and must exactly match `requires-python` in [`pyproject.toml`](./pyproject.toml).
- The setup scripts treat the manifests as strict pins and exit non-zero on any mismatch.

## Verify Active Versions

Run this from the repository root:

```powershell
node -v
py -3.13 --version
```

The reported versions should match the pinned values above.

## Setup

From the repository root:

```powershell
./setup.ps1
```

```bash
./setup.sh
```

Each script:

- validates that `.nvmrc`, `.tool-versions`, and `pyproject.toml` agree on the pinned versions
- installs Node from the pinned manifest version
- installs Python from the pinned manifest version
- verifies the Node and Python runtimes plus `npm` and `pip`
- fails if the active Node or Python version differs from the manifest pin
- installs TypeScript dependencies from [`package.json`](./package.json)
- installs the Python package in editable mode with dev dependencies
- runs a `hello` check for both the Node and Python stacks
- runs TypeScript type checks and smoke tests
- runs Python smoke tests

On Windows, if `setup.ps1` installs `nvm for Windows` or Python for the first time, close and reopen PowerShell before rerunning version checks or `nvm`/`py` commands. 

New installs may not be visible to the current shell session immediately. System restart may be required if terminal refresh doesn't respond to test commands

## Development Commands

After setup, run these from the repository root:

```bash
npm run dev
npm run typecheck
npm test
npm run build
npm start
```

```bash
python -m tax_pulse_project_team_1.main
python -m pytest
```

## Migration Commands

The PostgreSQL migration workflow is SQL-only and uses the top-level
[`migrations/`](./migrations) directory.

Local setup:

1. Install PostgreSQL 18 using the official installer or your platform package manager. [link here](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads)
2. Start the local PostgreSQL service.
3. Create a database for this project `taxpulse`.
4. User setup
    - Setup a new super user, and password use these in the config file
    - Can use pgAdmin or psql to setup user, developer can select preference
4. Copy [`.env.example`](./.env.example) to `.env`.
5. Edit `.env` and set `DATABASE_URL` to your local PostgreSQL connection string.

Apply all migrations:

```powershell
npm run migrate
```

Run the migration integration test:

```powershell
npm run test:migration
```

Notes:

- The Node scripts read `.env` automatically through `dotenv`.
- `seed.sql` seeds two sample tenants for local testing after the migrations have been applied.

Seed the sample tenants locally with:

```powershell
npm run seed
```

## Contributing and Codex Context

Codex should follow the repository conventions in [`AGENTS.md`](./AGENTS.md), including
the TaxPulse domain constraints, Python and TypeScript layout, formatter expectations,
and validation commands.

Repo-local Codex settings live in [`.codex/config.toml`](./.codex/config.toml). Keep
the sandbox at `workspace-write` with `approval_policy = "on-request"` for least-privilege
AI pairing.

## Manual Verification

Run this from the repository root:

```powershell
nvm use 22.0.0
node --version
py -3.13 --version
npm --version
py -3.13 -m pip --version
```

Install dependencies manually if needed:

```powershell
npm install
py -3.13 -m pip install -e ".[dev]"
```

Success means:

- `node --version` matches [`.nvmrc`](./.nvmrc) and the `nodejs` entry in [`.tool-versions`](./.tool-versions)
- `python --version` matches the `python` entry in [`.tool-versions`](./.tool-versions) and `requires-python` in [`pyproject.toml`](./pyproject.toml)
- running the setup script completes with both hello checks green

## Security Information

Due to the nature of the project holding sensitive information, it is essential that all engineers working on the project have a common understanding of what privileges and secrets management is necessary.
1. When working on the project, all engineers must create code operating under the lowest level privileges possible to avoid harmful manipulation of unrelated systems.
2. All additions must be thoroughly reviewed to ensure that no secrets (API keys, tokens, forms filled in with authentic looking information) are used in AI prompts or committed to repositories. Any information that is not listed as *public* information (CUI and SBU information) should *never* be entered into prompts or committed.
3. Types of sensitive artifacts: API keys, service tokens, envrionment variables. All of these should be checked to make sure that they are excluded in the .gitignore (it would look like `.env` as a file).

### Security Checklist
- [ ] Code additions are being made at lowest level privileges affecting the least amount of code necessary
- [ ] Clearly fake synthetic information has been generated for any development of systems that process real sensitive information
- [ ] Ensure all `.env` files are ignored in the .gitignore
- [ ] `config.toml` file includes `sandbox_mode = "workspace-write"` (*never* `sandbox_mode = "danger-full-access"`) and `approval_policy = "on-request"`.
- running the setup script completes with both hello checks and project checks green
