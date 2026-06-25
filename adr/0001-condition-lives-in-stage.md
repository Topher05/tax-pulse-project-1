# ADR-0001: Tax Plan Cycle condition lives in stage

## Context
TaxPulse Advisory centers work around a Tax Plan Cycle. Each cycle moves through the
canonical workflow stages of `Intake`, `Data Aggregation`, `Modeling`, `Review`,
`Client Approval`, `Executed`, and `Archived`.

The product must show where a cycle is in the workflow, gate transitions by role and
current stage, and preserve an immutable audit trail. Adding another field for the
cycle's condition would create competing sources of truth and increase the chance of
inconsistent queue, detail, API, and audit behavior.

## Decision
A Tax Plan Cycle's condition is fully captured by its current stage. Do not add a
separate `status` field to Tax Plan Cycle domain models, API payloads, database records,
UI state, or ADR metadata for this decision.

Pause behavior remains separate from workflow position. Represent pauses with `on_hold`
and an optional hold reason while preserving the current stage.

## Consequences
Workflow logic, authorization, queues, filters, and UI badges must derive the cycle's
condition from stage plus any independent pause flag.

Implementations should reject designs that introduce a second condition field for Tax
Plan Cycles. Changes that need a new workflow condition should update the stage model or
define additional pause metadata rather than adding a parallel condition field.

Audit records should capture stage transitions and pause changes as separate events so
reviewers can understand both workflow progress and temporary holds.
