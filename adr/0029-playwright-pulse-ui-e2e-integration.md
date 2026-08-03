# ADR-0029: Use Playwright for headless Pulse UI end-to-end regression coverage

## Context
The Pulse UI needs browser-level regression coverage for the advisor flow that opens
the Plan Cycle Queue, drills into a case, and continues into Scenario Planner. The
existing Vitest suite covers component and route behavior, but it does not exercise
the browser runtime, routing, or local storage/session setup in the same way a user
does.

This work must stay in the Pulse UI layer instead of the root application test suite.
The end-to-end checks need their own npm script, their own test folder, and a
headless default so they fail the build on browser errors without depending on a
visible desktop session.

## Decision
Adopt Playwright as the dedicated Pulse UI end-to-end test runner and keep it scoped
to `src/pulseUI`.

Add `@playwright/test` to the Pulse UI dev dependencies, create a separate
`src/pulseUI/e2e` folder for browser specs, and expose a dedicated `test:e2e` npm
script in the Pulse UI package. Configure the runner to launch Chromium headlessly
against the local Vite dev server and to treat browser failures as test failures.

Use synthetic browser session setup inside the spec so the advisor flow can exercise
the authenticated workspace without introducing a second login UI path. The test may
seed a browser access token and stub the backend responses needed for the queue, case
detail, and scenario result assertions.

Keep the Playwright artifacts out of source control by ignoring the generated report
and test-results directories.

```mermaid
flowchart LR
    Package[src/pulseUI/package.json] --> Script[test:e2e]
    Script --> Config[playwright.config.ts]
    Config --> Browser[Headless Chromium]
    Browser --> App[Vite dev server]
    App --> Queue[/cycles/queue]
    Queue --> Case[/cycles/:id]
    Case --> Scenario[/scenarios]
    Scenario --> Results[Scenario result row]
    Spec[src/pulseUI/e2e/*.spec.ts] --> Session[Synthetic advisor session]
    Spec --> Stubs[Browser route stubs]
```

## Consequences
The advisor queue-to-scenario path now has browser coverage that checks routing,
auth/session bootstrapping, and the final scenario result render in the same runtime
the user sees.

The Pulse UI test surface is split cleanly between component tests and browser tests,
which keeps Vitest fast while reserving Playwright for the slower cross-page flow.

The project now carries one more developer dependency and one browser download step
for local validation. That tradeoff is intentional because the coverage is aimed at a
high-value regression path.

The Playwright runner is now part of the UI layer contract, so future browser tests
should continue to live under `src/pulseUI/e2e` and use the same headless, build-failing
configuration.

## Alternatives considered
- Keep the advisor flow covered only by Vitest component tests.
- Add the browser tests to the root package instead of the Pulse UI package.
- Use a visible or manually driven browser flow instead of a headless test runner.
- Stub the entire scenario flow in the test without exercising queue-to-case
  navigation.
