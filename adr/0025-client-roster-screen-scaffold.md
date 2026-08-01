# ADR-0025: Scaffold and wire the Pulse UI Client Roster through a typed query boundary

## Context
The Pulse UI needs a Client Roster workspace screen for advisor and firm-admin users.
The roster represents the real-life clients available to the authenticated advisor or
tenant, so the frontend must not pass a tenant identifier when fetching rows. Tenant
scope belongs to the authenticated API context.

SCRUM-122 created the typed inert screen from the prototype before data wiring was
available. SCRUM-123 adds the dedicated TanStack Query boundary so the route can read
sample or live roster data without changing the presentational screen contract.

## Decision
Keep the Client Roster as a typed presentational screen and wire the route through a
TanStack Query hook.

Render `/clients` with a presentational `ClientRosterScreen` that receives a readonly
array of typed client rows through props. The row contract includes the prototype
fields needed by the final roster table: client name, filing summary, year-to-date
income, estimated tax, quarterly status, and a stable row identifier.

Move the row type into the Pulse UI entity layer and expose a `useClientRosterQuery`
hook that calls the tenant-scoped `/v1/clients` endpoint through the shared Case API
client. The hook does not accept a tenant ID; the backend derives advisor or tenant
scope from authentication.

Use camelCase names in the frontend roster API boundary and map rows into
`ClientRosterRow` before they reach the screen. The route passes `data ?? []` into the
existing screen so SCRUM-124 can add explicit loading, empty, and error states without
reworking the data boundary.

Keep the `Open Books` affordance inactive until the read-only client-books workflow is
implemented by a dedicated ticket. TanStack Table behavior remains reserved for the
roster table ticket.

```mermaid
flowchart LR
    Route[/clients route] --> Page[ClientRosterPage]
    Page --> Hook[useClientRosterQuery]
    Hook --> API[GET /v1/clients]
    API --> Scope[Authenticated advisor/tenant scope]
    Hook --> Rows[readonly ClientRosterRow data]
    Page --> Screen[ClientRosterScreen]
    Screen --> Props[readonly ClientRosterRow props]
    Screen --> Table[Roster table shell]
    Future[SCRUM-124 request states and SCRUM-125 table behavior] -.-> Page
```

## Consequences
The Client Roster route now has a concrete visual scaffold that follows the prototype
and reads roster rows through the same TanStack Query server-state pattern used by
other Pulse UI screens.

The typed props remain a narrow display contract, while the query hook becomes the
single frontend data boundary for the tenant-scoped roster endpoint.

The table action is visible but intentionally inactive, so the UI communicates the
future workflow without implying read-only client-book access exists yet.

Loading, empty, and error UI states are intentionally minimal in SCRUM-123 because
SCRUM-124 owns those request-state treatments.

## Alternatives considered
- Leave `/clients` as an empty placeholder until the roster endpoint is available.
- Fetch data directly in the route with `useEffect`.
- Introduce TanStack Table during the scaffold ticket instead of leaving that to the
  dedicated roster table ticket.
- Pass a tenant ID from the frontend to the roster hook, which was rejected to preserve
  tenant isolation and keep scoping in the authenticated backend context.
