# ADR-0022: Keep Plan Cycle Detail navigation state local to Pulse UI

## Context
SCRUM-95 adds the first Plan Cycle Detail surface inside the Pulse UI React/Vite
workspace created by SCRUM-92. The ticket needs predictable switching between the
Overview, Scenarios, Comments, and Audit Trail tabs, plus a stage stepper that follows
the canonical Tax Plan Cycle workflow.

At this stage, the detail tabs are skeletons. Later tickets will flesh out the Overview,
Comments, Audit Trail, scenarios, and live-data behavior. The navigation foundation
therefore needs to be stable enough for dependent tickets to share, but small enough
that it does not prematurely decide BFF payloads, persistence behavior, authorization,
or the final content model for each tab.

The comments tab also introduces a local editing concern: an advisor may type into the
comments box, move to another tab, and return before submitting. That unsaved draft is
UI state and should not be coupled to backend read models until comment submission and
data loading are implemented.

## Decision
Create a `src/pulseUI/planCycles` feature area for Plan Cycle UI code and keep the
Plan Cycle Detail tab, stepper, and unsaved comment draft state in a custom React hook.

The hook owns:
- the fixed detail tab list: Overview, Scenarios, Comments, Audit Trail,
- the active tab,
- the canonical Tax Plan Cycle stage list,
- the active stage and derived stepper index,
- the unsaved comments draft text.

The `/plan-cycles/$caseId` route consumes this hook and renders only a minimal Plan
Cycle Detail skeleton for SCRUM-95. The route may show placeholder tab panels, but it
must not fetch BFF data, persist comments, introduce a separate case status, or define
the final content contract for future tabs.

Future tickets may update this ADR as the Plan Cycle Detail tabs become data-backed and
as route-level data loading, comment submission, authorization, or tab-specific
component boundaries are finalized.

## Consequences
Benefits:
- tab switching and stepper transitions are testable without BFF or auth dependencies,
- unsaved comment text survives tab switches because the draft lives above the tab
  panels,
- future Plan Cycle UI work can share the `src/pulseUI/planCycles` feature area,
- SCRUM-96 and SCRUM-97 can add real tab content without redesigning the navigation
  state foundation,
- the UI continues to respect the domain rule that workflow condition lives in stage,
  not a separate status.

Tradeoffs:
- the stage shown by SCRUM-95 is local UI state until live Plan Cycle reads are wired,
- future tickets must revisit the hook boundary if tab state becomes URL-addressable or
  externally persisted,
- the ADR may need updates as the tab skeletons become complete feature surfaces.

## Alternatives considered
- Keep tab and stepper state inside the route component, which would work initially but
  make the behavior harder to unit test and reuse as tabs grow.
- Model each tab as a nested route immediately, which may be useful later but would
  over-specify route structure before tab content and deep-linking requirements are
  known.
- Store the unsaved comments draft in browser storage or the BFF, which would add
  persistence semantics before comment submission behavior exists.
- Put the feature under a `planCycleDetail` folder, which describes SCRUM-95 narrowly
  but does not leave room for SCRUM-94 and later Plan Cycle UI code to share the same
  feature area.
