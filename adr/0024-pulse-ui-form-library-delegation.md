# ADR-0024: Delegate Pulse UI form state to react-hook-form and validation to Zod

## Context
The Pulse UI will need form-heavy screens for creating, editing, and reviewing case
data. Those screens need predictable field registration, submission handling,
validation, and error display without pushing all of that state into ad hoc React
state or a shared component library.

The project already standardizes on Zod for typed validation and schema-driven data
contracts. That makes Zod the natural place for field validation rules and output
shape checks, while a dedicated form-state library can manage the interactive
concerns that should stay close to each route.

## Decision
Use `react-hook-form` for form state and `zod` for validation in Pulse UI.

Route-owned forms should:
- keep field registration, touched/dirty state, and submission lifecycle in
  `react-hook-form`,
- keep validation logic in local Zod schemas or schema adapters,
- keep form markup and validation wiring colocated with the page or feature component
  that owns the form,
- extract shared field primitives only when the same UI pattern is reused across
  multiple routes.

This keeps form logic out of global application state and avoids introducing a broad
shared form abstraction before the product has repeated form patterns worth
centralizing.

## Consequences
Benefits:
- route-local forms stay readable and testable,
- validation rules remain typed and declarative through Zod,
- form state management stays lightweight and familiar for React developers,
- future form screens can reuse the same library pair without inventing a second form
  stack.

Tradeoffs:
- the UI now depends on two form-related packages,
- each form still needs a thin local adapter between the schema and submission logic,
- cross-route form primitives should still be extracted carefully so they do not turn
  into a hidden component library.

## Alternatives considered
- Hand-roll form state with `useState` and `useEffect`, which would be simple for one
  screen but becomes repetitive and harder to validate consistently.
- Adopt a heavier form framework, which would add more opinionated abstractions than
  the current UI surface needs.
- Move validation into a shared helper layer, which would blur ownership and make
  feature-specific schemas harder to keep close to the page that uses them.
