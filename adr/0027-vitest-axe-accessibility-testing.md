# ADR-0027: Use vitest-axe for Pulse UI accessibility checks

## Context
The Pulse UI needs an automated accessibility check in the Vitest test flow so screen
scaffolds can be guarded with axe before they are wired to live data. SCRUM-116 is the
first ticket in the UI workflow that needs this harness, and it also needs a
story-only mock screen because the production Deductions work is still blocked by
SCRUM-112 (review pending), SCRUM-113, SCRUM-114, and SCRUM-115.

The repository already uses Vitest and React Testing Library for component coverage, so
the accessibility check should fit the same test runtime instead of introducing a second
runner or a separate browser-only harness.

## Decision
Use `vitest-axe` for Pulse UI accessibility assertions.

Add a shared Vitest setup file that imports the matcher extension from
`vitest-axe/extend-expect`, then run axe assertions directly from Vitest component
tests. Keep the check at the component-test layer so the same jsdom render can verify
roles, labels, and the absence of axe violations.

For SCRUM-116, exercise the check against a dedicated `mockDeductionsPage` test
fixture. The fixture is a temporary story seam: it provides labeled form controls,
table rows, and empty-state coverage before the production Deductions UI is complete.

## Consequences
The Pulse UI now has a lightweight accessibility assertion path that fits the existing
test stack and can be reused by later screen tickets.

The setup keeps accessibility validation in the same Vitest workflow as the rest of the
component tests, which reduces maintenance overhead and avoids a separate runtime.

The mock Deductions fixture is intentionally not the production route. That preserves
the blocked Jira sequencing while still allowing SCRUM-116 to land a passing accessibility
and regression test.

## Alternatives considered
- Use `jest-axe` with a separate Jest-style setup.
- Add a browser E2E accessibility pass instead of a component-level axe check.
- Defer accessibility automation until the real Deductions screen is fully wired.
