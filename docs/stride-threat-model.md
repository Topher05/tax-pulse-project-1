# TaxPulse STRIDE threat register

## Purpose and modeled scope

This register documents security threats for the TaxPulse Advisory workspace. The
modeled scope includes authentication, the versioned Core Case API, tax-plan-cycle
workflow state, the client portal, audit storage, and the tenant boundaries between
firms. The primary trust boundaries are the client or advisor to API boundary, the
API to database boundary, and the platform-administration boundary.

The register describes controls present in this repository; it is not a claim that
the controls eliminate the listed risks. The SCRUM-185 data-flow diagram is a
predecessor artifact and is not present on this branch, so this document does not
create or link to that diagram.

## Spoofing

**Threat scenario:** An attacker presents a forged, expired, malformed, or otherwise
invalid JWT to impersonate a TaxPulse principal, potentially choosing another user,
role, or tenant in the claims.

**Affected asset or trust boundary:** Authenticated identity and tenant context at
the client-to-Core-Case-API boundary.

**Priority:** High

**Mitigation:** Require a bearer token and verify its configured signing algorithm,
signature, issuer, and expiration before accepting the request. After cryptographic
verification, require a non-empty subject, recognized role, and non-empty tenant
claim before populating the authenticated principal and tenant context. The API
applies this middleware to the versioned tax-plan-cycle routes.

**Implementation references:**

- [`jwtAuthentication.ts`](../src/typescript/jwtAuthentication.ts) verifies JWTs,
  requires expiration, validates issuer and (for the JWKS configuration) audience,
  and rejects claims without a valid subject, role, or tenant.
- [`index.ts`](../src/typescript/index.ts) installs JWT authentication and user-claim
  hydration before the versioned Core Case API routes.

**Residual limitation / follow-up:** Token compromise, signing-key compromise, and
misconfigured issuer or audience settings remain operational risks. JWT verification
does not by itself prove that a legitimate principal should access every resource.

## Tampering

**Threat scenario:** An application path, compromised service credential, or database
client attempts audit-trail tampering by modifying or deleting audit records, hiding
an action or changing its outcome.

**Affected asset or trust boundary:** Immutable audit history at the API-to-database
boundary.

**Priority:** High

**Mitigation:** Write audit entries through inserts and enforce an append-only
database trigger that rejects ordinary updates and deletes. Workflow transition
attempts are recorded with actor, action, outcome, and occurrence time, including
rejected attempts, so the audit record can be compared with the workflow result.

**Implementation references:**

- [`0004_lively_sugar_man.sql`](../src/typescript/shared/database/drizzle-migrations/0004_lively_sugar_man.sql)
  defines the `audit_entry` table and trigger that blocks updates and deletes.
- [`auditEntryRepository.ts`](../src/typescript/auditEntryRepository.ts) exposes an
  insert-only writer and tenant-scoped audit reader.
- [`routes.ts`](../src/typescript/features/taxPlanCycle/routes.ts) records successful,
  rejected, validation-failed, and error-path transition attempts.
- [`auditEntry.test.ts`](../tests/typescript/audit/auditEntry.test.ts) provides existing
  integration evidence that the trigger rejects update and delete operations.

**Residual limitation / follow-up:** The trigger blocks normal updates and deletes,
but it does not protect against a privileged database administrator dropping,
disabling, or bypassing the trigger. Database administration and backup integrity
need separate controls.

## Repudiation

**Threat scenario:** An actor denies that they attempted, successfully completed, or
was denied a tax-plan-cycle workflow transition.

**Affected asset or trust boundary:** Workflow decision history and accountability
at the API-to-audit-storage boundary.

**Priority:** High

**Mitigation:** Derive the actor from the authenticated request user, authorize the
requested stage transition against the role and permission matrix, and append an
audit entry containing the actor, action, HTTP outcome, and timestamp for successful
and rejected transition attempts. The append-only database trigger preserves the
record after insertion.

**Implementation references:**

- [`routes.ts`](../src/typescript/features/taxPlanCycle/routes.ts) derives the actor,
  checks role and `EDIT` permission, logs denied and successful transition attempts,
  and writes their outcomes to the audit writer.
- [`repository.ts`](../src/typescript/features/taxPlanCycle/repositories/repository.ts)
  persists stage transitions with actor and occurrence time alongside the workflow
  update.
- [`0004_lively_sugar_man.sql`](../src/typescript/shared/database/drizzle-migrations/0004_lively_sugar_man.sql)
  prevents ordinary mutation or deletion of audit entries after they are written.

**Residual limitation / follow-up:** Audit records are application and database
evidence, not independent non-repudiation. A compromised authenticated account or
privileged database administrator can still undermine attribution.

## Information Disclosure

**Threat scenario:** A principal supplies another tenant's case identifier or audit
query and reads that tenant's tax-plan cycles, client portal data, or audit records.
This is a tenant isolation threat: cross-tenant access or disclosure must not be
possible through an identifier alone.

**Affected asset or trust boundary:** Tenant-scoped tax-plan-cycle, portal, and audit
data at the API-to-database boundary.

**Priority:** Critical

**Mitigation:** Carry the authenticated tenant ID into repository operations and apply
it as a database predicate for cycle reads, transitions, queue queries, and client
portal reads. Apply the same tenant scope when joining audit entries to their cycle;
restrict client portal reads to the authenticated client, and prevent client users
from operator-only views. Platform-wide administration and audit access is separately
restricted to the platform-admin role.

**Implementation references:**

- [`repository.ts`](../src/typescript/features/taxPlanCycle/repositories/repository.ts)
  includes `tenantId` in cycle reads, transitions, and queue queries, including the
  update predicates and joined transition queries.
- [`auditEntryRepository.ts`](../src/typescript/auditEntryRepository.ts) joins audit
  entries to their cycle and requires the requested tenant ID in the read predicate.
- [`routes.ts`](../src/typescript/features/taxPlanCycle/routes.ts) passes authenticated
  tenant context to repositories, enforces client ownership for portal reads, and
  blocks client access to operator routes.
- [`platformAdministration/routes.ts`](../src/typescript/features/platformAdministration/routes.ts)
  requires the `TaxPulse Platform Admin` role for platform-wide administration and
  audit-log endpoints.

**Residual limitation / follow-up:** This protection depends on every data access
  path preserving tenant scope. A compromised platform administrator has intentionally
  broader visibility, and this register does not claim database-level row security.

## Denial of Service

**Threat scenario:** Requests from one tenant consume shared API capacity, starving
other tenants or making the Core Case API unavailable.

**Affected asset or trust boundary:** Versioned API request capacity at the tenant-to-
service boundary.

**Priority:** High

**Mitigation:** Apply a tenant-keyed request counter with a configurable positive limit
and time window. Reject requests after the tenant's bucket is exhausted and return a
`Retry-After` header so clients can back off.

**Implementation references:**

- [`tenantRateLimiting.ts`](../src/typescript/tenantRateLimiting.ts) implements the
  per-tenant window and counter, requires authenticated tenant context, and returns
  HTTP 429 with `Retry-After` when the limit is exceeded.
- [`index.ts`](../src/typescript/index.ts) installs tenant rate limiting in the
  versioned API middleware chain after authentication and claim hydration.

**Residual limitation / follow-up:** The limiter is process-local and tenant-scoped;
  it is not distributed protection. Multiple processes, upstream dependencies, and a
  distributed denial-of-service attack require infrastructure-level controls.

## Elevation of Privilege

**Threat scenario:** A client or insufficiently privileged advisor invokes an operator
  endpoint or performs a tax-plan-cycle stage transition reserved for a firm admin or
  an advisor with the required permission.

**Affected asset or trust boundary:** Role and permission boundary between client,
advisor, firm-admin, and platform-admin principals.

**Priority:** High

**Mitigation:** Enforce role and permission checks at the route boundary, deny client
  access to operator views, and evaluate each requested stage transition against the
  explicit transition access matrix. Require platform-admin role for platform-wide
  administration and audit access. Record denied authorization attempts for review.

**Implementation references:**

- [`routes.ts`](../src/typescript/features/taxPlanCycle/routes.ts) blocks client
  operator access, checks advisor `EDIT` permission or firm-admin role, enforces the
  legal stage-transition matrix, and records denied attempts.
- [`platformAdministration/routes.ts`](../src/typescript/features/platformAdministration/routes.ts)
  rejects users who are not authenticated platform administrators before handling
  administration or platform audit requests.
- [`jwtAuthentication.ts`](../src/typescript/jwtAuthentication.ts) accepts only
  recognized user roles when constructing the authenticated principal and hydrates
  the role's configured permissions for downstream authorization.

**Residual limitation / follow-up:** Authorization rules remain application-level;
  newly added routes must be included in the protected middleware chain and apply the
  same checks. A stolen credential retains that principal's legitimate privileges.
