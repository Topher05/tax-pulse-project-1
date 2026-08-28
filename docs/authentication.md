# Authentication

TaxPulse uses tenant-hostname resolution for password login, Argon2id password hashes,
and RS256 access tokens published through JWKS.

## Tenant Resolution

`POST /auth/login` accepts only `email` and `password`. The Core Case Service resolves the
tenant from a firm-specific hostname such as `{tenant-slug}.taxpulse.example`; clients
never submit a raw `tenant_id`.

- Valid credentials return `202` with an MFA challenge.
- Invalid credentials return a shared `401` Problem Details response.
- Unknown login workspaces return `404`.

Set `TAXPULSE_LOGIN_BASE_DOMAIN` when a deployment uses a different base domain. For local
development, use `localhost` and a hostname such as
`north-star-planning.localhost:5173`. See [Local Development](./local-development.md).

The architectural rationale is recorded in
[ADR-0022](../adr/0022-tenant-login-hostname-resolution.md).

## Password Hashing

Authentication helpers use Argon2id. The defaults work without configuration, but these
variables allow deployment-specific capacity and latency tuning:

- `TAXPULSE_ARGON2_MEMORY_COST_KIB`
- `TAXPULSE_ARGON2_TIME_COST`
- `TAXPULSE_ARGON2_PARALLELISM`
- `TAXPULSE_ARGON2_HASH_LENGTH`
- `TAXPULSE_ARGON2_SALT_LENGTH`

See [ADR-0007](../adr/0007-argon2id-password-login.md) for the dependency and architecture
rationale.

## RS256 Issuer and Verifiers

The Core Case Service is the issuer. It requires:

- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `JWT_SIGNING_PRIVATE_KEY`
- `JWT_SIGNING_KEY_ID`
- Optional access- and refresh-token TTL values

The private key belongs only to the issuer. Core publishes its public counterpart at
`/.well-known/jwks.json` and discovery metadata at
`/.well-known/openid-configuration`.

The Tax Engine and other verifiers receive only `JWT_ISSUER` and `JWT_JWKS_URL`. They must
not receive `JWT_SIGNING_PRIVATE_KEY`.

Generate the public JWK from an approved local issuer-administration environment:

```powershell
npm run jwt:public-jwk
```

The command prints public key material only. The output must correspond to the same
private signing key used by Core.

## Serverless Issuer Metadata

When a sandbox has no custom issuer domain, deployment can create a public Lambda Function
URL for discovery and JWKS metadata. Supply a public-only `JwtPublicJwk` value matching the
Core signing key, then set Core's `JWT_ISSUER` to the stack's `JwtIssuerUrl` output. The
metadata Lambda must never receive private-key material.

An issuer administrator can smoke-test a deployed HTTP API using synthetic case, tenant,
and user identifiers configured through `TAXPULSE_HTTP_API_*` values:

```bash
npm run aws:http-api-jwt-smoke
```

This command creates valid, expired, and tampered RS256 tokens locally. Run it only from an
approved issuer-administration environment because it accesses the issuer signing key.
