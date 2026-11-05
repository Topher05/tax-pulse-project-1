# ADR-0039: Feature-Owned Core Case TypeScript Layout

## Context

The Core Case Service grew from a small TypeScript entry point into authentication,
audit, workflow, administration, assistance, persistence, and integration capabilities.
Although several newer capabilities used feature slices, older modules remained directly
under `src/typescript`. File placement therefore depended on when a capability was added
rather than which part of the product owned it.

The repository also contains independently deployable Pulse UI and Tax Liability Engine
applications. Moving every deployable, build script, Docker path, Terraform reference, and
CI rule in one change would combine a source-layout refactor with release-system changes.

## Decision

Organize the Core Case Service by business feature first, with explicit application and
platform boundaries:

- `app/` owns Express creation, startup composition, and OpenAPI delivery.
- `features/<feature>/` owns business capabilities and exposes an `index.ts` public surface.
- Large features may use `domain/`, `application/`, `http/`, `persistence/`, and
  `infrastructure/` subdirectories. Small features remain shallow until the distinction is
  useful.
- `platform/http/` owns service-wide HTTP middleware and error translation.
- Existing database, logger, and operational-script paths remain stable during this hotfix.
- Tests mirror their production feature or application owner under `tests/typescript`.

New source files must not be added directly to `src/typescript` except the executable
`index.ts` and tool configuration. A repository test enforces this boundary.

The later move to top-level `apps/`, `services/`, `packages/`, `tools/`, and
`infrastructure/` roots is a separate packaging phase. It requires coordinated updates to
Docker, Terraform, CI, SAST, Lambda bundles, npm workspaces, Python packaging, and release
evidence, so it is intentionally excluded from this behavior-preserving hotfix.

## Consequences

- Engineers can identify a module's owner without scanning a language-wide flat directory.
- Authentication, audit, assistance, tax reference, Tax Plan Cycle, application, and HTTP
  platform code now have explicit homes.
- Existing runtime entry points and package commands remain stable.
- Most import changes are mechanical, but TypeScript compilation and focused structure tests
  are required to detect path drift.
- The repository still has a `shared/` directory for database, logging, and operational
  scripts until the coordinated packaging phase.

## Alternatives considered

- Move all deployables and infrastructure directories at once. Rejected for the hotfix
  because it would unnecessarily couple source organization to deployment behavior.
- Keep compatibility files at every former flat path. Rejected because they would preserve
  the ambiguity and allow new code to keep using obsolete locations.
- Group all backend files by technical layer across the entire service. Rejected because
  feature ownership is more useful for tenant, workflow, and authorization reasoning.
