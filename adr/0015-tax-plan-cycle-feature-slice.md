# ADR-0015: Tax Plan Cycle Feature Slice Architecture

## Context
The Tax Plan Cycle code path has grown beyond a single route and repository pair. It
now includes:

- domain schemas and workflow rules,
- HTTP controllers and routes,
- a PostgreSQL-backed repository,
- Redis queue-cache helpers,
- a DynamoDB projection reader,
- a queue read service,
- and a growing test surface across unit, integration, and type-level checks.

The previous flat `src/typescript` layout made the Tax Plan Cycle files easy to start
with, but harder to maintain as the feature expanded. Related code was spread across
the root of the TypeScript source tree, and the test files also sat in mixed locations
 that made feature ownership less obvious.

## Decision
Group the Tax Plan Cycle runtime code under a dedicated feature slice at
`src/typescript/features/taxPlanCycle`.

Keep the file names close to their existing names where practical, rather than
renaming everything to match a generic architecture template. The goal is a cleaner
feature boundary without unnecessary churn.

Use these subfolders inside the feature slice:

- `controllers/` for HTTP orchestration layers,
- `infrastructure/` for Redis and DynamoDB adapters,
- `repository/` for Tax Plan Cycle persistence and retrieval,
- top-level feature files for domain schemas, routes, the read service, and the
  feature barrel.

Mirror the same feature ownership on the test side under
`tests/typescript/features/taxPlanCycle`.

## Structure
Current source tree:

```text
src/typescript/features/taxPlanCycle/
├── controllers/
│   ├── createController.ts
│   └── transitionController.ts
├── infrastructure/
│   ├── queueCache.ts
│   ├── queueDynamoStore.ts
│   └── queueProjection.ts
├── repository/
│   └── repository.ts
├── index.ts
├── readService.ts
├── routes.ts
└── taxPlanCycle.ts
```

Current test tree:

```text
tests/typescript/features/taxPlanCycle/
├── integration.test.ts
├── jwtProtectedRoutes.test.ts
├── mainComposition.test.ts
├── queueCache.test.ts
├── queueDynamoStore.test.ts
├── queueRead.integration.test.ts
├── read.typecheck.ts
├── routes.test.ts
├── schema.test.ts
├── taxPlanCycle.test.model.ts
└── transitions.test.ts
```

## Consequences
The Tax Plan Cycle feature now has a clearly owned bounded-context inside the Express
application. Engineers can navigate the feature by concern without scanning the full
top-level source directory.

The root TypeScript barrel still re-exports the feature surface so the rest of the
application can keep a stable import experience while the internal structure becomes
more modular.

This layout does not yet force every test into deeper `unit/`, `integration/`, or
`fixtures/` subfolders. That cleanup may still happen later, but the primary feature
boundary is now established first.

Adding new feature-slice does impose a risk of circular import dependency bugs, these have been fixed at the time of writing but may emerge in the future as further refactors are done

Adding feature slicing does add a risk of runtime concerns with import pathings layered into the main root `index.ts` this has been verified locally but will need extra attention to detail in future implementation

## Alternatives considered
- Keep the flat `src/typescript` Tax Plan Cycle files in place.
- Rename every file to match a generic feature-slice diagram exactly.
- Split the feature across multiple unrelated shared folders before establishing a
  feature boundary.
- Rather than split by Domain and enforce DDD (infrastructure, repository) pattern split by technical aspect (controller, model, util)
