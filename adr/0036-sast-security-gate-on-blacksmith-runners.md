# ADR-0036: SAST Security Gate on Blacksmith Runners

## Context

SCRUM-165 adds a pull-request security gate for the repository's TypeScript and
Python source. The gate needs to identify high-severity static-analysis findings
before merge without depending on application services or deployment credentials.

The repository already uses GitHub Actions and Blacksmith-backed runners for PR
security checks. Semgrep provides static analysis for `src/typescript`, while
Bandit provides Python security analysis for `src/tax_liability_engine`.

## Decision

Add a dedicated GitHub Actions workflow that runs on every `pull_request` event on
`blacksmith-2vcpu-ubuntu-2404`.

The workflow will:

- check out the repository,
- install Python 3.13,
- install Semgrep and Bandit with that Python runtime,
- run Semgrep against `src/typescript` with `--error --severity ERROR`, and
- run Bandit recursively against `src/tax_liability_engine` with
  `--severity-level high`.

The scanners run as ordinary workflow steps so a high-severity finding produces a
non-zero exit status and fails the job. The workflow has no path filter, ensuring
that every pull request receives the gate. Branch protection remains a repository
administrative concern and can mark the resulting check as required.

## Consequences

Pull requests receive consistent SAST coverage for both application languages, and
high-severity findings are visible as a failed required-check candidate before merge.
The gate may add dependency-install time to PR workflows and scanner rule updates
can change findings over time, but it requires no application or deployment changes.

## Alternatives considered

- Run the scanners only locally and rely on developers to remember the checks.
- Trigger the workflow only for source paths, which would omit pull requests whose
  relevant impact is indirect.
- Add scanner suppressions or custom rules before the initial gate has established
  its baseline.
- Depend on AWS or other deployment credentials for static analysis.
