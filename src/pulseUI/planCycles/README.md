# Plan Cycle Queue State Boundary

SCRUM-94 owns only the request lifecycle states for the Plan Cycle Queue route:
loading, empty, and error with retry.

SCRUM-93 should connect at `PlanCycleQueueStateBoundary`'s non-empty success branch
in `PlanCycleQueueRoute.tsx`. Replace the current `return null` branch with the
queue table and KPI component once SCRUM-93 defines that UI. Do not add table rows,
KPI cards, overdue badges, or queue item field rendering as part of SCRUM-94.
