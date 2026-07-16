# ADR-0007: Use Argon2id for password login verification

## Context
TaxPulse needs password login to verify user credentials without storing plaintext
passwords or issuing access tokens before MFA succeeds. Password verification must be
tenant-scoped through the user record, must avoid account enumeration, and must keep
credential storage separate from profile data.

The implementation depends on the `argon2` package for password hashing and
verification. This is a security-sensitive dependency, so the reason for adding it and
the boundaries around its use should be recorded as an architecture decision rather
than living only in route or README prose.

## Decision
Use Argon2id through the `argon2` package for password hashes stored in the
`credential` table. Registration code stores only the encoded Argon2id hash, and login
code verifies the submitted password against that hash before returning an MFA
challenge state.

Keep auth contracts in `authModel`, auth use-case logic in `authService`, database
credential access in `authCredentials`, and HTTP validation/response mapping in
`authRoutes`.

## Consequences
This keeps password handling aligned with the project security boundary: profile rows
identify users, credential rows hold password hashes, and a valid password only moves
the session into MFA rather than issuing a token.

The main benefits are:
- no plaintext password persistence,
- configurable Argon2id work factors for deployment tuning,
- identical invalid-credential responses for wrong passwords and unknown emails,
- a clearer module split between contracts, service logic, persistence, and HTTP.

The tradeoffs are:
- local tests that exercise hashing are slower than simple mock hashing,
- deployments must account for Argon2id memory and CPU cost,
- the native `argon2` dependency must remain compatible with the pinned Node runtime.

## Alternatives considered
- Use PBKDF2 from Node's standard library.
- Use bcrypt through a native or JavaScript package.
- Defer hashing behind a mock interface until the full registration flow exists.
