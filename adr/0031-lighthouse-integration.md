# ADR-0031: Add a reproducible Lighthouse performance gate for the Pulse UI dashboard

## Context
The Pulse UI needs an objective performance gate so the dashboard does not regress as
the surface grows. SCRUM-129 requires a Lighthouse run against the built app, with the
dashboard route scoring at least 90 and the build failing when the threshold is
missed.

The dashboard is still intentionally sparse, so the gate must work with the current
implementation without forcing unrelated UI changes. The run also needs to be
reproducible in CI, which means it must exercise the production-like built output
rather than relying on a dev server or a manually opened browser session.

## Decision
Add a dedicated Lighthouse check to the Pulse UI test flow and run it against the
built dashboard route.

The gate will:
- build the Pulse UI first,
- serve the built output locally,
- open the dashboard route in a deterministic browser context,
- run Lighthouse against that route, and
- fail the build when the performance score drops below 90.

Keep the Lighthouse integration separate from the axe accessibility gate. Axe will
continue to own semantic and accessibility regression detection, while Lighthouse will
own the dashboard performance threshold.

## Consequences
The dashboard now has a reproducible performance baseline that can be enforced in CI
and during local verification.

Because the check runs against the built app, it validates the same asset pipeline and
runtime shape that users receive in production-like deployments.

The threshold creates an explicit maintenance cost: future dashboard changes must stay
within the performance budget or update the implementation in a way that preserves the
score.

This ADR does not change the dashboard design or data flow. It only establishes the
performance gate and its build-breaking behavior.

## Alternatives considered
- Rely on manual Lighthouse runs without a build gate.
- Run Lighthouse against the dev server instead of the built app.
- Fold the Lighthouse check into the axe accessibility test suite.
- Delay the threshold until the dashboard has richer content.
