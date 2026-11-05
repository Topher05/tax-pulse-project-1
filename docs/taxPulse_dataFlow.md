# TaxPulse Data Flow

## Context

TaxPulse Advisory is a multi-tenant tax planning workspace with three main user
paths:

- advisors working inside the core case workspace,
- clients using the tenant-scoped portal,
- platform services handling authentication, case workflow, calculations, events,
  and audit history.

This document captures the current and intended data flow across those paths. It is
written to match the direct, architecture-first style used in the ADRs while keeping
the Mermaid diagrams as the primary source of truth for system shape.

The modeled scope includes:

- tenant discovery and authentication,
- the versioned Core Case Service API,
- the Tax Engine calculation service,
- the client portal distribution path,
- persistent stores and operational caches,
- event-driven workflow side effects,
- external taxpayer identifier integration,
- observability and secrets boundaries.

## Scope and notation

The diagrams intentionally separate these trust boundaries:

- external user versus internal service,
- tenant A versus tenant B,
- public edge versus private runtime,
- Core Case Service versus Tax Engine,
- application services versus persistent stores,
- TaxPulse services versus external integrations.

Some flows are conditional or future-facing. When a route is not guaranteed on every
deployment path, the diagram labels it as such instead of presenting it as a single
hardcoded runtime rule.

## System context

```mermaid
flowchart TB
  classDef actor fill:#e8f1ff,stroke:#2f5aac,color:#0d1b2a,stroke-width:1px;
  classDef service fill:#eef9f1,stroke:#2d7d46,color:#0f2a18,stroke-width:1px;
  classDef store fill:#fff5e6,stroke:#b26a00,color:#3a2400,stroke-width:1px;
  classDef boundary fill:#f6f7fb,stroke:#7d8597,color:#20242d,stroke-dasharray: 4 3;
  classDef external fill:#fdeef0,stroke:#b42318,color:#3a1111,stroke-width:1px;

  subgraph tenantUser["Tenant and user boundary"]
    advisor["Advisor / internal user"]:::actor
    client["Client portal user"]:::actor
    tenantA["Tenant A"]:::boundary
    tenantB["Tenant B"]:::boundary
  end

  subgraph edge["Public edge"]
    cdn["CloudFront distribution"]:::service
    spa["Private S3 SPA origin"]:::service
    alb["Public ALB"]:::service
  end

  subgraph app["Application runtime"]
    core["Core Case Service"]:::service
    engine["Tax Engine"]:::service
    lambdaFns["Event consumers / Lambdas"]:::service
  end

  subgraph data["Data and operational stores"]
    pg["PostgreSQL"]:::store
    dynamo["DynamoDB queue projection"]:::store
    redis["Redis queue cache / idempotency"]:::store
    secrets["Secrets Manager"]:::store
    cw["CloudWatch / X-Ray / OTEL"]:::store
  end

  subgraph externalSystems["External systems"]
    taxpayer["External taxpayer identifier service"]:::external
  end

  advisor --> alb
  client --> cdn
  cdn --> spa
  alb --> core
  alb --> engine
  core --> pg
  core --> dynamo
  core --> redis
  core --> lambdaFns
  core --> engine
  engine --> taxpayer
  core --> secrets
  engine --> secrets
  core --> cw
  engine --> cw
  lambdaFns --> cw

  tenantA -. isolation .- pg
  tenantB -. isolation .- pg
  tenantA -. isolation .- dynamo
  tenantB -. isolation .- dynamo
  tenantA -. isolation .- redis
  tenantB -. isolation .- redis
```

## Authentication and session flow

```mermaid
sequenceDiagram
  autonumber
  actor User as Tenant user
  participant Browser as Browser / SPA
  participant Auth as Core Case auth routes
  participant DB as PostgreSQL
  participant JWKS as JWKS / token verifier

  User->>Browser: Open tenant hostname
  Browser->>Auth: GET /auth/login
  Auth-->>Browser: Login form and tenant context
  User->>Browser: Submit credentials
  Browser->>Auth: POST /auth/login
  Auth->>DB: Verify user, tenant, password, MFA policy
  Auth->>JWKS: Validate or issue tokens as configured
  Auth-->>Browser: Access token + refresh cookie
  Browser->>Auth: POST /auth/login/mfa or /auth/refresh as needed
  Auth->>DB: Confirm MFA challenge or refresh token
  Auth-->>Browser: Updated session state
  Browser->>Auth: POST /auth/logout
  Auth->>DB: Revoke refresh token / session record
```

## Portal and case workspace flow

```mermaid
sequenceDiagram
  autonumber
  actor Advisor as Advisor
  actor Client as Client
  participant UI as Portal or workspace UI
  participant API as Core Case Service
  participant DB as PostgreSQL
  participant Cache as Redis
  participant Queue as DynamoDB

  Advisor->>UI: Open case workspace
  Client->>UI: Open client portal
  UI->>API: GET /v1/tax-plan-cycles or portal-scoped reads
  API->>Cache: Check queue / response cache
  alt cache hit
    Cache-->>API: Cached response
  else cache miss
    API->>Queue: Read tenant-scoped queue projection
    API->>DB: Read canonical case data
    API-->>Cache: Populate short-lived entry
  end
  API-->>UI: Case, stage, and portal data
  Advisor->>UI: Create or edit a case
  UI->>API: POST /v1/tax-plan-cycles
  API->>DB: Write canonical Tax Plan Cycle data
  API->>Queue: Refresh projection
  API->>Cache: Invalidate affected queue entry
```

## Calculation flow

```mermaid
sequenceDiagram
  autonumber
  actor Advisor as Advisor
  participant Core as Core Case Service
  participant Engine as Tax Engine
  participant DB as PostgreSQL
  participant Ext as External taxpayer identifier service

  Advisor->>Core: Request scenario or comparison
  Core->>DB: Load case, scenario, and tenant context
  Core->>Engine: POST /tax-calculations or /scenarios/comparisons
  Engine->>Ext: Resolve external taxpayer identifier when required
  Ext-->>Engine: Taxpayer lookup result
  Engine-->>Core: Calculation result
  Core->>DB: Persist scenario result and workflow impact
  Core-->>Advisor: Updated case view
```

## Workflow, audit, and event flow

```mermaid
flowchart LR
  classDef service fill:#eef9f1,stroke:#2d7d46,color:#0f2a18,stroke-width:1px;
  classDef store fill:#fff5e6,stroke:#b26a00,color:#3a2400,stroke-width:1px;
  classDef queue fill:#eef4ff,stroke:#3856a3,color:#0d1b2a,stroke-width:1px;

  caseChange["Case or stage change"]:::service
  core["Core Case Service"]:::service
  pg["PostgreSQL"]:::store
  outbox["Outbox table"]:::store
  sns["SNS"]:::queue
  sqs["SQS"]:::queue
  lambda["Lambda consumer"]:::service
  dynamo["DynamoDB queue projection"]:::store
  redis["Redis cache"]:::store
  audit["Immutable audit entries"]:::store

  caseChange --> core
  core --> pg
  core --> audit
  core --> outbox
  outbox --> sns
  sns --> sqs
  sqs --> lambda
  lambda --> dynamo
  lambda --> redis
```

## Storage ownership

```mermaid
erDiagram
  TENANT ||--o{ USER : contains
  TENANT ||--o{ TAX_PLAN_CYCLE : owns
  USER ||--o{ REFRESH_TOKEN : issues
  USER ||--o{ MFA_ENROLLMENT : configures
  TAX_PLAN_CYCLE ||--o{ SCENARIO : includes
  TAX_PLAN_CYCLE ||--o{ AUDIT_ENTRY : records
  TAX_PLAN_CYCLE ||--o{ ACTION_ITEM : tracks
  TAX_PLAN_CYCLE ||--o{ STAGE_TRANSITION : changes
  TAX_PLAN_CYCLE ||--o{ OUTBOX_EVENT : emits
  TAX_PLAN_CYCLE ||--o{ DEDUCTION : contains
  TAX_PLAN_CYCLE ||--o{ VECTOR_CORPUS : indexes
```

## Operational and deployment flow

```mermaid
flowchart TB
  classDef edge fill:#f0f7ff,stroke:#3559a6,color:#102040,stroke-width:1px;
  classDef private fill:#eef9f1,stroke:#2d7d46,color:#0f2a18,stroke-width:1px;
  classDef support fill:#fff5e6,stroke:#b26a00,color:#3a2400,stroke-width:1px;

  user["Browser / user"]:::edge
  cloudfront["CloudFront"]:::edge
  spa["Private S3 SPA origin"]:::private
  alb["Public ALB"]:::edge
  ecs["ECS services in private subnets"]:::private
  lambda["Lambda consumers"]:::private
  rds["RDS PostgreSQL"]:::support
  redis["ElastiCache Redis"]:::support
  dynamo["DynamoDB"]:::support
  secrets["Secrets Manager"]:::support
  obs["CloudWatch / X-Ray / OTEL"]:::support

  user --> cloudfront
  cloudfront --> spa
  user --> alb
  alb --> ecs
  ecs --> rds
  ecs --> redis
  ecs --> dynamo
  ecs --> secrets
  ecs --> obs
  lambda --> rds
  lambda --> obs
```

## Coverage notes

This document covers the diagrammed flows that matter for the current TaxPulse
architecture:

- login, MFA, refresh, and logout,
- advisor workspace and client portal access,
- tenant-scoped case reads and writes,
- case calculation handoff to the Tax Engine,
- transactional persistence and immutable audit history,
- outbox-driven event propagation,
- queue projection and cache coordination,
- external taxpayer lookup,
- runtime secrets and observability boundaries.

The document is intentionally detailed enough to support the threat-modeling and
architecture review work that depends on a complete data-flow picture. If future work
changes the routing between the ALB, Core Case Service, and Tax Engine, those changes
should be reflected here before the diagram is treated as a release artifact.
