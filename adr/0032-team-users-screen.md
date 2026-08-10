# ADR-0032: Back the Team & Users screen with a tenant-scoped read boundary

## Context

SCRUM-146 established the Pulse UI Team & Users screen as a typed firm administration
surface with KPI cards and a roster table. SCRUM-147 made that screen read live tenant
data without taking over the later responsibilities in SCRUM-148 and SCRUM-149.
SCRUM-149 now fills the role-assignment gap left by SCRUM-147 while avoiding invite,
impersonation, and loading or error-state behavior reserved for adjacent tickets.

The existing authentication data model already stores tenant-scoped users, roles, and
status values. It did not store the display name or last-login timestamp needed by the
screen, and the mock SCRUM-146 role values were broader than the persistent role table.

## Decision

The Team & Users screen reads its roster through `GET /v1/firm/users`. The endpoint is
tenant-scoped from the authenticated request context and does not accept a tenant ID
from the browser. Its response exposes only the row fields needed by the read-only
screen: user id, display name, email, role, status, and last-login timestamp.

The backend owns a small `firmUsers` feature slice with Zod schemas, a repository, and
an Express router. The repository joins the existing `users`, `roles`, and
`user_status` tables, with `display_name` and nullable `last_login_at` stored on
`users`. The role values stay aligned with the existing database and JWT role set:
`Firm Admin`, `Advisor`, `Client`, and `TaxPulse Platform Admin`.

The Pulse UI owns a TanStack Query hook that fetches `/v1/firm/users`, parses the
response, and maps it into the `TeamUsersScreen` row model. SCRUM-147 intentionally
does not add visible loading, empty, retry, or error UI, and it does not add role
assignment mutations or invite behavior.

SCRUM-149 adds a tenant-scoped role update command beside the read boundary:
`PATCH /v1/firm/users/{userId}/role`. The request body accepts only tenant-assignable
roles: `Firm Admin`, `Advisor`, and `Client`. `TaxPulse Platform Admin` remains a
platform-level role that can be read in roster data when present, but it cannot be
assigned through the firm roster command. The server derives tenant scope from the
authenticated request context before updating the matching user. The command is limited
to Firm Admins; non-admin callers receive an authorization problem response.

The Pulse UI renders the role column as the role-assignment control. The control calls
the supplied screen handler with the selected user row and new role, then the page
persists that change through the mutation hook and invalidates the existing firm users
query. Non-admin screen contexts render the same control disabled, and platform-admin
rows are not editable through this tenant administration surface.

## Consequences

The screen now has one typed live-data boundary, and tenant isolation remains enforced
by the backend rather than by route parameters or client-provided tenant IDs. The
display fields give future administration work a real storage contract instead of
deriving names from email addresses.

SCRUM-148 should build on `useFirmUsersQuery()` for loading, empty, retry, and error
states. Role assignment now has its own command, preserving the same tenant-scoped
repository pattern as the read endpoint. Future invite, impersonation, platform-admin
promotion, or platform-wide user management work should add explicit commands rather
than overloading `GET /v1/firm/users` or the role-update command.

## Alternatives considered

Deriving display names and last-login text in the frontend was rejected because it
would make the live screen depend on placeholder data conventions. Returning only raw
`users` table fields was rejected because it would force SCRUM-148 and SCRUM-149 to
revisit the row contract immediately. Reusing `/v1/users` was rejected in favor of
`/v1/firm/users` to keep this route clearly scoped to the firm administration surface.
