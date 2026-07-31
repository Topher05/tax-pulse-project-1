# ADR-0025: Scaffold the Pulse UI Client Roster as a typed inert screen

## Context
The Pulse UI needs a Client Roster workspace screen before the roster endpoint, query
hook, loading states, and TanStack Table behavior are built. The prototype shows this
screen as an internal advisor/firm-admin view with a short explanation and a carded
table for client financial posture.

The screen must be stable enough for later tickets to wire data into it without
reworking the route structure or prop contract. It also must avoid creating a second
server-state pattern before the dedicated data-fetching ticket lands.

## Decision
Scaffold the Client Roster as a typed route-local Pulse UI screen.

Render `/clients` with a presentational `ClientRosterScreen` that receives a readonly
array of typed client rows through props. The row contract includes the prototype
fields needed by the final roster table: client name, filing summary, year-to-date
income, estimated tax, quarterly status, and a stable row identifier.

Keep the first implementation inert. It may render synthetic prototype rows to preserve
the table shape, but it must not fetch data, introduce a query hook, call the Core Case
service, or make the `Open Books` affordance navigate. Future roster tickets can replace
the local rows with a TanStack Query hook, add request states, and upgrade the table
behavior without changing the screen boundary.

```mermaid
flowchart LR
    Route[/clients route] --> Page[ClientRosterPage]
    Page --> Screen[ClientRosterScreen]
    Screen --> Props[readonly ClientRosterRow props]
    Screen --> Table[Inert roster table]
    Future[Future roster query/table tickets] -.-> Props
```

## Consequences
The Client Roster route now has a concrete visual scaffold that follows the prototype
while remaining safe for incremental feature work.

The typed props provide a narrow contract for future data wiring and tests. Later
server-state work can focus on fetching and mapping roster rows instead of changing the
screen composition.

The table action is visible but intentionally inactive, so the UI communicates the
future workflow without implying read-only client-book access exists yet.

## Alternatives considered
- Leave `/clients` as an empty placeholder until the roster endpoint is available.
- Fetch data directly in the route with `useEffect`.
- Introduce TanStack Table during the scaffold ticket instead of leaving that to the
  dedicated roster table ticket.
