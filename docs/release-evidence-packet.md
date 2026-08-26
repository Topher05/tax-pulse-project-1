# SCRUM-189 Release Evidence Packet

This packet captures the release evidence that is available now for `SCRUM-189`
and explicitly marks the two missing upstream dependencies that still block a fully
complete packet.

## Available evidence

- CI coverage and quality gates:
  [`.github/workflows/build-test-quality.yml`](../.github/workflows/build-test-quality.yml)
- Container scan and SBOM generation:
  [`.github/workflows/container-scan-sbom.yml`](../.github/workflows/container-scan-sbom.yml)
- Security framing and residual-risk register:
  [`docs/stride-threat-model.md`](stride-threat-model.md)
- Trivy suppression rationale:
  [`docs/trivy-suppressions.md`](trivy-suppressions.md)
- Local and containerized reproduction steps:
  [`README.md`](../README.md)
  [`deployment/ecs/README.md`](../deployment/ecs/README.md)
  [`deployment/spa/README.md`](../deployment/spa/README.md)
  [`terraform/README.md`](../terraform/README.md)

## TODO dependencies

TODO: Depending on Jira-169, add the ZAP scan evidence and any release-notes text that
needs the security scan result before the packet is considered final.

TODO: Depending on Jira-181, add the RAGAS evaluation evidence and any quality-gate
summary that must reference the assist-score threshold before the packet is considered
final.

## Reproducible path

1. Start from a clean checkout of this repository.
2. Install the locked toolchain and dependencies using the repository setup steps in
   [`README.md`](../README.md).
3. Run the core checks:
   `npm run typecheck`, `npm test`, `npm run build`, and the Python quality checks
   documented in the repository README.
4. Run the container scan and SBOM workflow locally or through CI to produce the
   Trivy and SBOM artifacts.
5. Follow the deployment guidance in the ECS, SPA, and Terraform READMEs to reproduce
   the running stack from the checked-in contracts.

## Remaining work to complete SCRUM-189

- Add the Jira-169 ZAP evidence and link it from the packet.
- Add the Jira-181 RAGAS evidence and link it from the packet.
- Refresh the packet once those upstream artifacts exist so the TODO markers can be
  removed.
