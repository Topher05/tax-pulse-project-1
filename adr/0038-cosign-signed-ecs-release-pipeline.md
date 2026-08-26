# ADR-0038: Cosign-Signed ECS Release Pipeline

## Status

Accepted

## Context

SCRUM-167 added container vulnerability scanning and SBOM generation for the Core Case
Service and Tax Engine images, but the release path still allowed an unsigned artifact
to be pushed or deployed by a future pipeline. SCRUM-168 requires the release pipeline to
fail closed so only signed application images can reach the Terraform-managed ECS
services.

The project already uses GitHub Actions, AWS ECR, and ECS Fargate ARM64 task
definitions. The team wants to avoid long-lived signing keys and continue using the
existing `.trivyignore` suppressions documented in `docs/trivy-suppressions.md`.

## Decision

We will extend `.github/workflows/container-scan-sbom.yml` into a development-branch
release pipeline that:

- keeps PR and `main` runs limited to build, Trivy scan, SBOM generation, and report
  upload
- publishes `linux/arm64` release images to the Terraform-managed ECR repositories only
  from `refs/heads/development`
- signs each pushed image by immutable digest with Cosign keyless GitHub OIDC identity
- verifies both image signatures against the exact workflow identity and issuer before
  rendering or deploying any ECS task definition
- deploys the Core Case Service and Tax Engine with digest-qualified image references so
  the released artifact is the same one that was scanned, signed, and verified

Terraform will provision a least-privilege GitHub Actions release role trusted only for
the repository `AI-Native-2026-06-22-FedStack/tax-pulse-project-team-1` on the
`development` branch. The role grants ECR push/read access for the two application
repositories plus the ECS and `iam:PassRole` permissions required to register and deploy
new task definitions.

## Consequences

- Release signing no longer depends on a stored Cosign private key.
- An unsigned, tampered, or wrongly-identified image fails verification before ECS
  mutation starts.
- PR and `main` runs retain the SCRUM-167 security feedback loop without taking AWS
  deployment credentials.
- The repository now depends on a configured GitHub variable,
  `AWS_RELEASE_ROLE_ARN`, that points at the Terraform-managed release role output.
- The `.trivyignore` policy remains unchanged, so the documented Node 22.0.0
  suppressions still apply during release scans.
