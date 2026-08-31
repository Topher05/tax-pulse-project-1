# SCRUM-189 Release Evidence Packet

This packet defines the exact evidence set for one release of TaxPulse Advisory and the
commands required to reproduce that release from a clean checkout. As of 2026-08-28,
the workflow sources, gate behavior, artifact names, and documentation links below are
checked in. The final per-release packet is completed by attaching one successful
`development` run's commit SHA, Actions run URL, deployed SPA URL, immutable image
digests, and uploaded artifact set from `release-evidence-manifest`.

## Release identity

Record these values from the successful `Container Scan & SBOM` run on `development`:

- Release commit SHA: from `release-evidence-manifest.json` field `release_commit_sha`
- Commit checks page:
  `https://github.com/<owner>/<repo>/commit/<sha>/checks`
- Actions run page:
  `https://github.com/<owner>/<repo>/actions/runs/<run_id>`
- Deployed SPA URL: from `release-evidence-manifest.json` field `deployed_spa_url`
- UI source commit: from `release-evidence-manifest.json` field `ui_source_commit_sha`
- Deployed SPA index SHA-256: from `release-evidence-manifest.json` field
  `deployed_spa_index_sha256`; this must match the locally built `dist/pulseUI/index.html`
- Immutable images:
  - `core-case`: `<repository>@<digest>`
  - `tax-engine`: `<repository>@<digest>`

## Evidence index

- CI workflow source:
  [`.github/workflows/build-test-quality.yml`](../.github/workflows/build-test-quality.yml)
- Release workflow source:
  [`.github/workflows/container-scan-sbom.yml`](../.github/workflows/container-scan-sbom.yml)
- Reusable ZAP workflow source:
  [`.github/workflows/zap-baseline.yml`](../.github/workflows/zap-baseline.yml)
- ZAP High gate source:
  [`.github/scripts/enforce-zap-high-severity.mjs`](../.github/scripts/enforce-zap-high-severity.mjs)
- Threat model and residual-risk framing:
  [`docs/stride-threat-model.md`](stride-threat-model.md)
- Trivy suppression rationale:
  [`docs/trivy-suppressions.md`](trivy-suppressions.md)
- ECS deployment guide:
  [`deployment/ecs/README.md`](../deployment/ecs/README.md)
- SPA deployment guide:
  [`deployment/spa/README.md`](../deployment/spa/README.md)
- Terraform deployment guide:
  [`terraform/README.md`](../terraform/README.md)
- AI-Assist evaluation commands and artifact documentation:
  [`README.md`](../README.md)

## Artifact inventory

The release workflow must upload all of the following from the same successful run:

- `trivy-report-taxpulse-core-case`
- `sbom-taxpulse-core-case`
- `trivy-report-taxpulse-tax-engine`
- `sbom-taxpulse-tax-engine`
- `zap-baseline-reports`
- `release-evidence-manifest`

`release-evidence-manifest.json` is the packet anchor for the exact release because it
records:

- `release_commit_sha`
- `commit_checks_url`
- `actions_run_url`
- `deployed_spa_url`
- `ui_source_commit_sha`
- `deployed_spa_index_sha256`
- both immutable image references and digests
- the artifact names expected for that run

## Dependency status

TODO: Depending on Jira-169, add the ZAP scan evidence and any release-notes text that
needs the security scan result before the packet is considered final.

Resolved status for Jira-169:

- The reusable workflow
  [`.github/workflows/zap-baseline.yml`](../.github/workflows/zap-baseline.yml)
  scans an explicitly supplied `target_url`, preserves `report_html.html`,
  `report_md.md`, and `report_json.json`, and uploads them as
  `zap-baseline-reports`.
- The release workflow
  [`.github/workflows/container-scan-sbom.yml`](../.github/workflows/container-scan-sbom.yml)
  resolves the deployed SPA URL from the canonical Terraform `spa_url` output in the
  authenticated `development` deployment job before invoking ZAP.
- The High-severity gate
  [`.github/scripts/enforce-zap-high-severity.mjs`](../.github/scripts/enforce-zap-high-severity.mjs)
  now fails closed for malformed ZAP JSON, unknown `riskcode` values, and High
  (`"3"`) alerts.
- Per-release evidence still must be filled in after one successful `development` run:
  exact commit SHA, exact run URL, exact deployed SPA URL, and the uploaded
  `zap-baseline-reports` artifact from that run.

TODO: Depending on Jira-181, add the RAGAS evaluation evidence and any quality-gate
summary that must reference the assist-score threshold before the packet is considered
final.

Resolved status for Jira-181:

- The checked-in evaluation question bank is `data/corpus/evaluation/questions.json`.
- The checked-in threshold contract is `data/corpus/evaluation/thresholds.json` and
  requires mean `context_relevance >= 0.80` and mean `faithfulness >= 0.60`.
- The supported commands are documented in [README.md](../README.md):
  `npm run assist:evaluation:collect`, `npm run assist:evaluation:score`, and
  `npm run assist:evaluation`.
- The generated artifacts are:
  - `artifacts/assist-evaluation/ragas-input.json`
  - `artifacts/assist-evaluation/ragas-report.json`
- Per-release evidence still must be filled in with the exact generated artifact
  outputs used for the reviewed release packet when a reviewer wants a concrete report
  bundle alongside the checked-in workflow and threshold sources.

## Prerequisites

- Clean checkout of the target release commit
- Node.js `22.0.0`
- Python `3.13.14`
- `uv` installed for locked Python environments
- Docker available for container builds
- AWS credentials with access to the `development` deployment role when reproducing the
  release workflow outside GitHub Actions
- Terraform available when reproducing the deployed SPA output locally
- `OPENAI_API_KEY` and a pgvector-capable PostgreSQL environment only if reproducing the
  Jira-181 collection and scoring workflow end to end

## Clean checkout reproduction

Start from a clean checkout and install the locked dependencies:

```powershell
git clone <repo-url>
cd tax-pulse-project-team-1
git checkout <release-sha>
uv sync --locked --extra dev --extra eval
npm ci
Push-Location src/pulseUI
npm ci
Pop-Location
```

Run the repository validation gates:

```powershell
uv run --no-sync ruff format --check src tests
uv run --no-sync ruff check src tests
uv run --no-sync pyright
uv run --no-sync pytest
npm run typecheck
npm test
```

Expected success condition:

- All Python and TypeScript quality gates pass on the release commit with no local code
  changes required.

## Release reproduction

Build the release images and generate the scan artifacts through the checked-in release
workflow:

1. Trigger `Container Scan & SBOM` on `development` for the target commit.
2. Confirm both image jobs succeed and publish immutable digests.
3. Confirm `Verify Signatures & Deploy ECS` succeeds.
4. Confirm the verify/deploy job builds Pulse UI, syncs the Terraform-resolved private S3
   bucket, completes a CloudFront invalidation, and verifies the deployed index digest.
5. Confirm `OWASP ZAP Baseline Scan` succeeds against the Terraform-resolved SPA URL.
6. Confirm `Release Evidence Manifest` succeeds and uploads
   `release-evidence-manifest.json`.

Expected success condition:

- The workflow produces one coherent release run where Trivy, SBOM, deploy, ZAP, and
  manifest evidence all agree on the same commit and the same immutable image digests.

## Terraform-backed deployment verification

The release workflow resolves the SPA target from the canonical Terraform backend:

```powershell
terraform -chdir=terraform init -input=false
terraform -chdir=terraform output -raw spa_url
```

Expected success condition:

- `terraform output -raw spa_url` returns a non-empty `https://...` URL.
- The same URL is recorded in `release-evidence-manifest.json` as `deployed_spa_url`.
- The manifest's `deployed_spa_index_sha256` matches the built UI index digest.
- ZAP scans that exact URL through the reusable `target_url` input.

## Smoke verification

After deployment, verify the reviewer can reach the stack without tribal knowledge:

1. Open the recorded `deployed_spa_url`.
2. Confirm the SPA loads over HTTPS.
3. Confirm the release commit checks page shows the expected CI status for the same
   `release_commit_sha`.
4. Download the run artifacts from the recorded Actions run and verify the presence of:
   `trivy-report-taxpulse-core-case`, `sbom-taxpulse-core-case`,
   `trivy-report-taxpulse-tax-engine`, `sbom-taxpulse-tax-engine`,
   `zap-baseline-reports`, and `release-evidence-manifest`.
5. Open `release-evidence-manifest.json` and confirm the image digests, checks URL, run
   URL, and deployed SPA URL are internally consistent.

Expected success condition:

- A reviewer can move from the packet to the release run, the exact artifacts, and the
  running SPA without needing any unstated environment knowledge.

## Jira-169 ZAP evidence procedure

Use the release run's `zap-baseline-reports` artifact and verify:

- `report_json.json` exists and is non-empty.
- `report_html.html` and `report_md.md` are present for reviewer inspection.
- The run passed the fail-closed gate in
  [`.github/scripts/enforce-zap-high-severity.mjs`](../.github/scripts/enforce-zap-high-severity.mjs).
- The target scanned by ZAP matches the manifest `deployed_spa_url`.

Expected success condition:

- No High (`"3"`) alerts are present and no malformed report bypassed the gate.

## Jira-181 RAGAS evidence procedure

The checked-in commands are:

```powershell
npm run assist:evaluation:collect
npm run assist:evaluation:score
npm run assist:evaluation
```

Expected success condition:

- `artifacts/assist-evaluation/ragas-input.json` is produced.
- `artifacts/assist-evaluation/ragas-report.json` is produced.
- The report records aggregate means meeting `context_relevance >= 0.80` and
  `faithfulness >= 0.60`.

## Remaining work to complete SCRUM-189

- Record one exact successful `development` release run after the corrected workflow is
  available in that branch.
- Copy the resulting commit SHA, commit checks URL, Actions run URL, deployed SPA URL,
  immutable image digests, and artifact names from that run into the final review
  packet or linked release notes.
- If the release workflow cannot access AWS or Terraform state, resolve that
  operational blocker outside this repository.
