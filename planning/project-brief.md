# Project Brief: TaxPulse Advisory

## Overview

TaxPulse Advisory is a multi-tenant SaaS workspace for wealth advisory firms that need a clearer, safer way to manage tax liability planning for their clients. The product organizes each planning engagement as a Tax Plan Cycle: a quarterly case that moves from intake through data aggregation, scenario modeling, review, client approval, execution, and archive. The goal is to replace fragile spreadsheet workflows with a structured, reviewable system where advisors can model tax scenarios, clients can understand and approve recommendations, and firms can preserve a reliable audit history.

## Problem

Tax planning is high-value work for independent RIAs, family offices, and wealth-management firms, but much of that work is still handled through spreadsheets, email threads, and one-off client conversations. That makes planning hard to review, hard to continue when staff changes, and hard to prove later when a client or reviewer asks why a recommendation was made.

Clients also need clearer visibility into what they are approving and what still needs to be done. The IRS notes that taxes generally must be paid as income is earned through withholding or estimated tax payments, and taxpayers with income from sources such as interest, dividends, self-employment, capital gains, or business activity may need estimated payments. TaxPulse gives advisors and clients a quarterly workspace for turning that planning need into tracked recommendations and action items.

## Who It Serves

- Wealth advisory firms, including independent RIAs, multi-family offices, and firms serving high-net-worth clients.
- Firm Admins who manage workspace policy, users, review sign-off, reassignment, compliance review, and cycle closeout.
- Advisors who own client relationships, aggregate client data, model scenarios, recommend actions, and track execution.
- Clients who use a scoped portal to view plan progress, review scenarios, approve recommendations, upload documents, message advisors, and complete action items.
- TaxPulse platform admins who operate the SaaS platform without tenant impersonation in the MVP.

## What We Are Creating

TaxPulse centers the product around a Tax Plan Cycle, one case per client and planning period. Each cycle carries the client income and deduction picture, modeled scenarios, selected recommendation, action checklist, owner, due date, priority, comments, attachments, stage-transition history, and audit trail.

The MVP creates the foundation for:

- A stage-based workflow where the stage is the workflow condition; there is no separate case status field.
- Role-gated transitions for Firm Admins, Advisors, Clients, and platform admins.
- Scenario modeling for typed-in income, deduction, and planning figures.
- Data aggregation for income events and deductions through a validated integration boundary.
- Client portal access scoped to the signed-in client's own plan data.
- Immutable audit history for stage transitions, denied attempts, review activity, and archive evidence.
- Tenant isolation so each advisory firm works in its own protected workspace.
- Future delivery areas from the Jira roadmap, including React operator and portal screens, secure APIs, event-driven workflow, deployment infrastructure, data engineering, RAG-powered AI Assist, observability, and hardening.

## How It Helps Users and Clients

For advisors, TaxPulse turns repeat tax-planning work into a repeatable operating workflow. Instead of recreating context across spreadsheets and messages, advisors can open a cycle, see the current stage, aggregate income and deduction data, model scenarios, submit work for review, and track approved actions through execution.

For clients, the product makes tax planning easier to understand and act on. The portal shows where the plan stands, what scenarios were considered, what recommendation is waiting for approval, and which action items remain open. That reduces confusion and makes the advisor's guidance more transparent.

For firms, TaxPulse creates stronger quality control and continuity. Firm Admin review provides a second pair of eyes before recommendations are presented. The audit trail preserves who did what and when. Archived cycles become compliance-ready records rather than scattered files.

For the broader advisory market, the project fits the direction of professional planning. The CFP Board's education requirements include comprehensive financial plan development and principal knowledge topic categories, which supports tax planning as part of a complete advisory workflow. Current wealth-management coverage also shows that high-net-worth clients often expect integrated services beyond investment management, including tax planning and broader financial advice.

## Core Workflow

Tax Plan Cycles move through seven canonical stages:

1. Intake
2. Data Aggregation
3. Modeling
4. Review
5. Client Approval
6. Executed
7. Archived

The cycle's condition lives in its stage. If work pauses, the case uses an `on_hold` flag and optional `hold_reason` without changing the meaning of the current stage.

## Delivery Plan From CSV

The delivery plan is based on `planning/stackpulse_tax.csv`. The export contains 187 Jira issues: 13 epics and 174 stories. At the time of this brief, the CSV shows 20 items done, 3 in progress, 1 blocked, and 163 to do.

The epic roadmap covers:

- Documentation.
- Engineering Foundations and Federal Posture.
- Domain Model and Walking Skeleton.
- Secure APIs: Auth, Audit, and Boundaries.
- Polyglot Backend and Contracts.
- React SPA: Operator and Portal Experience.
- Event-Driven Workflow and Legacy Integration.
- UI Completion and Polish.
- Containers, Serverless, and Deployment.
- IaC, Secure Pipeline, and Observability.
- Data Engineering Pipeline.
- RAG-Powered AI Assist.
- Hardening, Evidence, and Final Demo.

Completed foundation work in the CSV is concentrated around team documentation, security posture, runtime setup, Codex conventions, TypeScript domain modeling, schema validation, aggregation payloads, the Python tax calculation request model, stage-transition validation, and the stage-only ADR. The remaining backlog describes the planned product path rather than completed functionality.

## Current Repository Foundation

The repository already includes early implementation pieces that match the scope:

- TypeScript Tax Plan Cycle stage definitions, zod validation, priority validation, hold-reason rules, and legal stage-transition validation.
- TypeScript aggregation payload and client boundaries for income events and deductions.
- Python pydantic modeling for tax calculation requests, including filing-status validation.
- A PostgreSQL migration that creates tenant support and the `tax_plan_cycle` table with stage, owner, priority, due date, hold fields, and tenant indexing.
- A README that documents setup, runtime pins, security posture, least-privilege expectations, and no-secrets rules.
- An ADR recording the decision that a Tax Plan Cycle's condition lives in its stage and must not be duplicated in a separate `status` field.

## Project Principles

- Preserve tenant isolation at every layer.
- Use least privilege for internal, external, and platform roles.
- Scope portal access to the client's own records and granted artifacts.
- Keep workflow condition in the Tax Plan Cycle stage; do not add a separate status field.
- Keep pause state separate through `on_hold` and `hold_reason`.
- Record meaningful workflow activity in an immutable audit trail.
- Use clearly fake synthetic data only.
- Do not commit secrets, tokens, real taxpayer data, or `.env` files.
- Treat denied workflow attempts as auditable events, not silent failures.

## Success Criteria

TaxPulse is successful when an advisory firm can create a tenant-scoped Tax Plan Cycle, assign an owner, move the cycle through the approved workflow, model planning scenarios, submit work for review, present recommendations to a client, track approved action items, and archive the cycle with a reliable audit trail.

Clients should be able to understand the current plan stage, review scenarios, approve recommendations, upload supporting documents, communicate with the advisor, and complete action items from a scoped portal.

Firm Admins should be able to review modeling assumptions, send work back when needed, approve recommendations before client presentation, manage users and roles, and close and seal completed cycles.

The system should remain testable, tenant-isolated, role-gated, and aligned with the documented project constraints.

## Sources

- Product scope: `planning/02_TaxPulse_Advisory 1.txt`
- Delivery plan: `planning/stackpulse_tax.csv`
- Current implementation: repository source, tests, migration, README, and ADR files
- IRS estimated tax guidance: https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes
- CFP Board certification coursework requirement: https://www.cfp.net/certification-process/education-requirement/certification-coursework-requirement
- Wealth-management market context: https://www.wsj.com/buyside/personal-finance/financial-advisors/top-financial-advisors-for-high-net-worth
