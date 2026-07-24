# ADR-0011: Nest the Pulse UI React/Vite shell under src/pulseUI

## Context
TaxPulse is adding a React operator workspace that future frontend tickets will extend
with queue, detail, plan-tool, client-roster, and firm-administration screens.

Before SCRUM-92, the repository was a dual-runtime backend and calculation workspace:
TypeScript service code lived under `src/typescript`, Python code lived under
`src/python`, and there was no browser application root. The React shell is a large
structural addition, so its source, Vite entrypoint, and frontend-specific TypeScript
and test configuration need a clear home that does not blur backend and frontend
ownership.

The shell also needs to stay independent from SCRUM-75. Redis caching for the Plan Cycle
Queue read model affects backend/BFF performance and invalidation. The SCRUM-92 shell
does not fetch queue data, attach auth, or call the BFF; it only creates the routed
operator frame future tickets will fill.

## Decision
Create a dedicated Pulse UI application area under `src/pulseUI`.

The Pulse UI area will own:
- `index.html` as the Vite HTML entrypoint,
- `main.tsx` as the React bootstrap,
- React shell, route, navigation, and style files,
- `vite.config.ts` with `root: "src/pulseUI"` and output to `dist/pulseUI`,
- `tsconfig.pulseUI.json` for browser TypeScript and JSX,
- `vitest.config.ts` for the combined Vitest suite, including jsdom for Pulse UI tests.

Repository-level npm scripts remain in the root `package.json` and point to the nested
Pulse UI configs. The backend TypeScript configs remain scoped to `src/typescript`, while
the root `typecheck` command runs backend, backend test, and Pulse UI type checks.

The operator shell will use React, Vite, TanStack Router, lucide-react icons, Testing
Library, jsdom, and Vitest. The SCRUM-92 implementation will render a design-only View-as
switcher and empty routed content regions, with no auth, permission, queue data, Redis,
or DynamoDB behavior.

## Consequences
Benefits:
- frontend code and frontend config are colocated under a project-specific `src/pulseUI`
  boundary,
- future React tickets have a stable shell and route frame to extend,
- backend TypeScript remains isolated from browser JSX and DOM types,
- Vite builds emit browser assets into `dist/pulseUI`,
- the dependency on SCRUM-75 is not a technical blocker for shell work.

Tradeoffs:
- npm scripts must explicitly reference nested Vite, Vitest, and TypeScript config paths,
- moving the shared Vitest config under `src/pulseUI` means every Vitest script must pass
  `--config src/pulseUI/vitest.config.ts`,
- the Pulse UI TypeScript config needs relative include paths for both `src/pulseUI` and
  `tests/pulseUI`,
- the first frontend scaffold adds several browser-facing dependencies to the shared
  package manifest and lockfile.

## Alternatives considered
- Place the React app under `src/frontend`, which is conventional but less descriptive
  for TaxPulse.
- Keep Vite, Vitest, and Pulse UI TypeScript configs at the repository root, which makes
  scripts shorter but separates the app from its frontend-specific configuration.
- Put Pulse UI files under `src/typescript`, which would mix browser JSX with backend
  service modules and require broader TypeScript config changes.
