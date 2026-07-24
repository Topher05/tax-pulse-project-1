# ADR-0013: Tax Liability Engine Namespace and Layout Refactor

## Context
The Python workspace namespace `tax_pulse_project_team_1` no longer reads clearly as
the project grows. The repository also used an extra `src/python` wrapper that made the
Python source layout harder to navigate and forced path references to carry redundant
segments.

The Python side already has a small set of runtime modules, LocalStack bootstrap code,
and focused tests. A cleaner namespace and flatter source tree will make those files
easier to discover, import, and document without changing the functional behavior of
the Python stack.

## Decision
Rename the Python import/package namespace to `tax_liability_engine`.

Move the Python source tree directly under `src/` and the Python tests directly under
`tests/`, removing the `src/python` wrapper layer.

Move the Python Docker Compose definition into the Python package directory so the
LocalStack bootstrap flow lives beside the Python entrypoint code.

Keep the CLI behavior centered on `tax_liability_engine.main` so the package remains
invocable both as `python -m tax_liability_engine.main` and through the installed
`tax-pulse` console script.

Keep the existing public behavior of the Python modules and tests, but update all
imports, script entrypoints, path lookups, and developer documentation to match the new
layout.

## Consequences
The Python package name becomes clearer and aligns with the domain more closely.

The source tree is easier to navigate, and tooling configuration can target `src` and
`tests` directly instead of carrying the extra wrapper path.

Existing code that imports `tax_pulse_project_team_1` will need to switch to
`tax_liability_engine`; no backward-compatible shim is retained.

The change is purely a workspace/layout refactor and does not alter the DynamoDB
bootstrap behavior, queue projection behavior, or other Python runtime logic.

## Alternatives considered
- Keep the existing `tax_pulse_project_team_1` namespace.
- Rename only the package but keep the `src/python` wrapper.
- Add a compatibility shim for the old package name.
