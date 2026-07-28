# ADR-0021: Resolve tenant context from firm-specific login hostnames

## Context
TaxPulse is a multi-tenant SaaS application in which users and password credentials are
scoped to a firm tenant. The same email address may therefore exist for users at different
firms. A password login request cannot safely select a credential record without tenant
context, but requiring a user to enter an internal tenant UUID is unusable and would make
the browser responsible for security-sensitive tenancy selection.

The password-login API must establish tenant context before it can verify a password and
advance a user to MFA. The bearer access token receives its `tenant_id` claim only after
MFA succeeds, so it cannot supply tenant context for the initial password request.

## Decision
Use firm-specific login hostnames in the form `{tenant-slug}.taxpulse.example` to establish
tenant context before password verification. The server normalizes and validates the
hostname, resolves its tenant slug to one active tenant, and supplies the internal
`tenant_id` to the tenant-scoped password-authentication service.

`POST /auth/login` accepts only `email` and `password`; it rejects client-supplied
`tenant_id` values. Unknown, malformed, and inactive tenant login hosts return a generic
login-workspace-not-found response. Valid password authentication continues to return the
existing MFA challenge, and the final MFA response remains responsible for issuing bearer
tokens with tenant claims.

## Consequences
Users sign in with only their email and password at the correct firm URL, while the server
retains control of tenant selection. A unique, URL-safe `login_slug` and active-state flag
are required for every tenant, and tenant provisioning must assign and manage those values.

Deployments must route tenant subdomains to the application and preserve the trusted request
hostname through the edge proxy. Login tests must cover valid tenant resolution, unknown or
inactive tenant hosts, and attempts to authenticate one tenant's credentials through another
tenant's hostname.

## Alternatives considered
- Require users to enter a raw `tenant_id` during login.
- Make email addresses globally unique across all firms.
- Ask users to enter a firm slug as an additional login-form field.
- Resolve the tenant from an untrusted client-provided request body value.
