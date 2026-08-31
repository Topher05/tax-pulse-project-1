# Security Policy

TaxPulse handles sensitive tax-planning information. Development and operations must
preserve least privilege, tenant isolation, scoped access, and immutable audit behavior.

## Requirements

1. Grant code and users only the privileges necessary for the intended operation.
2. Do not put secrets, real or realistic taxpayer data, Controlled Unclassified
   Information (CUI), or Sensitive But Unclassified (SBU) information in AI prompts,
   source control, fixtures, screenshots, or logs.
3. Use clearly fake synthetic data for development, documentation, tests, and demos.
4. Keep API keys, service tokens, private signing keys, and local environment files out of
   version control.
5. Give JWT private signing material only to the Core Case Service issuer. Verifiers must
   use public JWKS.
6. Do not weaken tenant-not-found behavior in a way that exposes cross-tenant resource
   existence.

## Contributor Checklist

- [ ] Changes use the lowest privileges necessary and affect only the intended scope.
- [ ] Tenant isolation and role-gated access remain enforced.
- [ ] Audit history remains immutable where required.
- [ ] Test, seed, and example data is clearly synthetic.
- [ ] No secrets, tokens, private keys, `.env` files, or sensitive data are included.
- [ ] `.gitignore` continues to cover local environment files.
- [ ] Repo-local Codex configuration retains `sandbox_mode = "workspace-write"` and
  `approval_policy = "on-request"`.
- [ ] Relevant setup, validation, and security checks pass.

For operational response procedures, see the
[Incident Runbook](./docs/incident-runbook.md). For architecture-level threat analysis,
see the [STRIDE Threat Model](./docs/stride-threat-model.md).
