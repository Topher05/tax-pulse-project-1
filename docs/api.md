# API Guide

## Core Case Service

The Core Case Service publishes its OpenAPI 3.0 document at:

```text
GET /openapi.json
```

Use that document as the source of truth for current request and response schemas. Core
routes are versioned under `/v1`. Tax Plan Cycle operations include:

- `GET /v1/tax-plan-cycles`
- `POST /v1/tax-plan-cycles`
- `GET /v1/tax-plan-cycles/{caseId}`
- `POST /v1/tax-plan-cycles/{caseId}/scenarios`
- `GET /v1/tax-plan-cycles/{caseId}/quarterly-estimates`

Successful tenant-scoped reads return a persisted Tax Plan Cycle such as:

```json
{
  "id": "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
  "client_id": "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e11",
  "stage": "Intake",
  "owner": "advisor-123",
  "priority": "medium",
  "due_date": "2026-12-31",
  "on_hold": false,
  "scenarios": []
}
```

Schemas are generated from the same Zod definitions used by the routes. Workflow
condition is represented by `stage`; there is no separate case `status` field. Missing and
cross-tenant resources share the same not-found behavior to preserve tenant boundaries.

## Tax Engine

The FastAPI liability engine exposes:

- `GET /health`
- `POST /tax-calculations`
- `POST /scenarios/comparisons`

Calculation routes require a valid bearer token and derive tenant context at the route
boundary. Request bodies remain focused on calculation inputs, while calculation logic
stays in domain services.

Run the Tax Engine locally with:

```powershell
python src/tax_liability_engine/scripts/liability_engine_on.py
```

It reads `JWT_ISSUER` and `JWT_JWKS_URL` from the environment and verifies tokens through
public JWKS. It must not receive the Core Case Service's private signing key.

## AWS HTTP API

The reference serverless template is
[`deployment/PresentToClient-Draft.template.yaml`](../deployment/PresentToClient-Draft.template.yaml).
The runtime expects both event topic ARNs:

- `TAXPULSE_STAGE_CHANGED_TOPIC_ARN`
- `TAXPULSE_ACTION_ITEM_CREATED_TOPIC_ARN`

See [Authentication](./authentication.md) for the deployed JWT smoke test and issuer-key
handling requirements.
