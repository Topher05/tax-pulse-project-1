# tax-pulse-project-team-1

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
- runs a `hello` check for both the Node and Python stacks
- skips `npm ci` when no `package.json` exists

## Manual Verification

Run this from the repository root:

```powershell
nvm use 22.0.0
node --version
py -3.13 --version
npm --version
py -3.13 -m pip --version
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