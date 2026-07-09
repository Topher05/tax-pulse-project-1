# ADR-0006: Use Vitest coverage-v8 for TypeScript coverage reporting

## Context
TaxPulse already uses Vitest as the primary test runner for TypeScript unit and
integration tests. The project also needs a consistent way to measure and report test
coverage so we can spot gaps in core workflows, track quality over time, and produce a
repeatable report in local development and CI.

We want the coverage tool to fit the existing Vitest workflow instead of introducing a
separate runner or a second reporting stack. The repository is pinned to Node 22.0.0,
so the coverage provider also needs to work reliably in that runtime without adding
unnecessary overhead or platform-specific setup.

## Decision
Use `@vitest/coverage-v8` as the coverage provider for the TypeScript test suite and
standardize coverage generation through Vitest's `--coverage` flag.

Coverage output should remain part of the Vitest workflow and be treated as the
canonical source for TypeScript test coverage reporting in this project.

## Consequences
This keeps test execution and coverage collection in one toolchain, which makes the
developer experience simpler and reduces the chance of drift between test execution and
coverage reporting.

The main benefits are:
- native integration with the existing Vitest suite,
- lower setup and maintenance cost than a separate coverage stack,
- straightforward CI reporting for the TypeScript tests,
- coverage output that stays aligned with the same test runner used in development.

The tradeoffs are:
- coverage reporting stays tied to Vitest rather than a runner-agnostic tool,
- coverage collection adds runtime overhead when the report is generated,
- coverage metrics reflect the TypeScript test harness only, so other language test
  suites need their own reporting decisions.

## Alternatives considered
- Use Istanbul or `nyc` as a separate coverage layer.
- Use `c8` directly instead of the Vitest coverage provider.
- Adopt Jest solely for coverage reporting.
- Skip automated coverage reporting and rely on test execution alone.
