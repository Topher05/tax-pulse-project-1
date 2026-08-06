# ADR-0025: Scaffold and wire the Pulse UI Client Roster through a typed query boundary

## Context
The Pulse UI needs a Client Roster workspace screen for advisor and firm-admin users.
The roster represents the real-life clients available to the authenticated advisor or
tenant, so the frontend must not pass a tenant identifier when fetching rows. Tenant
scope belongs to the authenticated API context.

SCRUM-122 created the typed inert screen from the prototype before data wiring was
available. SCRUM-123 added the dedicated TanStack Query boundary and the persistent
backend endpoint so the route can read live roster data without changing the
presentational screen contract. SCRUM-125 fills the reserved table behavior with
TanStack Table rendering and client-side sorting over the hook-provided rows.

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
scope from authentication and reads from a tenant-keyed `client_roster` table.

Use camelCase names in the endpoint and frontend roster API boundary, with fields
aligned to the future TanStack Table columns: `clientName`, `filingStatus`,
`ytdIncome`, `estimatedTax`, and `quarterlyStatus`. The route passes `data ?? []`
into the existing screen so SCRUM-124 can add explicit loading, empty, and error
states without reworking the data boundary.

Render the non-empty roster with `@tanstack/react-table` through the Pulse UI's
existing v9 table pattern. The table owns client-side sorting only and uses the
existing hook data as its complete row set; it does not add sort parameters to the
tenant-scoped `/v1/clients` endpoint. Client, filing status, YTD income, estimated
tax, and quarterly status are sortable TanStack accessor columns. The inactive
`Open Books` affordance remains visible in a non-sortable action column.

Keep the `Open Books` affordance inactive until the read-only client-books workflow is
implemented by a dedicated ticket.

```mermaid
flowchart LR
    Route[/clients route] --> Page[ClientRosterPage]
    Page --> Hook[useClientRosterQuery]
    Hook --> API[GET /v1/clients]
    API --> Scope[Authenticated advisor/tenant scope]
    Scope --> Store[(client_roster table)]
    Hook --> Rows[readonly ClientRosterRow data]
    Page --> Screen[ClientRosterScreen]
    Screen --> Props[readonly ClientRosterRow props]
    Screen --> Table[TanStack roster table]
    Future[Future client books workflow] -.-> Table
```

## Consequences
The Client Roster route now has a concrete visual scaffold that follows the prototype
and reads roster rows through the same TanStack Query server-state pattern used by
other Pulse UI screens.

The typed props remain a narrow display contract, while the query hook becomes the
single frontend data boundary for the tenant-scoped roster endpoint.

The roster endpoint now has a persistent backend source for the fields SCRUM-125 will
render and sort. SCRUM-125 remains responsible only for TanStack Table behavior, not
for defining or persisting roster data.

The table action is visible but intentionally inactive, so the UI communicates the
future workflow without implying read-only client-book access exists yet.

Loading, empty, and error UI states are intentionally minimal in SCRUM-123 because
SCRUM-124 owns those request-state treatments.

Sorting is intentionally client-side for SCRUM-125 because the roster endpoint already
returns the full tenant-scoped display set needed by the table, and no pagination or
server-side sorting contract exists yet.

## Alternatives considered
- Leave `/clients` as an empty placeholder until the roster endpoint is available.
- Fetch data directly in the route with `useEffect`.
- Introduce TanStack Table during the scaffold ticket instead of leaving that to the
  dedicated roster table ticket.
- Pass a tenant ID from the frontend to the roster hook, which was rejected to preserve
  tenant isolation and keep scoping in the authenticated backend context.
- Derive roster rows from Tax Plan Cycle records, which was rejected because those
  records only carry `client_id` and do not store the roster display fields.
