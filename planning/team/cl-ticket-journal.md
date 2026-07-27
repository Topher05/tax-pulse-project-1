# Caleb Latimer Ticket Journal

**Owner:** Caleb Latimer  
**Branch prefix:** `caleb-latimer-`

Add new ticket entries below using this template.

<!--
## caleb-latimer-jiraXX - SCRUM-XX

**Branch:** `caleb-latimer-jiraXX`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-XX

**Summary:**

**Description:**

**Acceptance Criteria:**

-

**Code Connection:**

**Project Scope Connection:**

**Changed Files:**

-

**Validation Notes:**

-
-->

## caleb-latimer-jira74 - SCRUM-74

**Branch:** `caleb-latimer-jira74`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-74

**Summary:** Project Tax Plan Cycle changes into the queue table

**Description:** As a Backend Developer, I want cycle changes projected into the DynamoDB queue, so that the read model stays consistent with the case.

**Acceptance Criteria:**

- Creating or updating a cycle upserts its queue projection item.
- The queue projection item uses the tenant/case key contract and preserves the projected case fields.
- The LocalStack-backed queue table can be created and queried in tests.
- The Python queue-projection tests pass with the repository validation flow.

**Code Connection:**

- `src/tax_liability_engine/tax_plan_cycle_queue_projection.py`
- `src/tax_liability_engine/dynamodb/plan_cycle_queue_projection.py`
- `tests/tax_liability_engine/tax_plan_cycle_queue_projection/test_service.py`
- `tests/tax_liability_engine/test_plan_cycle_queue_projection.py`

**Project Scope Connection:**

- Polyglot Backend & Contracts
- Tax Plan Cycle queue projection read-model work

**Changed Files:**

- `src/tax_liability_engine/`
- `tests/tax_liability_engine/`
- `README.md`
- `CONTRIBUTING.md`
- `setup.sh`
- `pyproject.toml`
- `adr/0013-tax-liability-engine-namespace-refactor.md`

**Validation Notes:**

- `.\.venv\Scripts\python.exe -m pytest --cache-clear`
- `.\.venv\Scripts\python.exe -m pytest --basetemp=.pytest-tmp`
- `python -m pytest --cache-clear` in PowerShell also passed after the dev environment was installed
- LocalStack integration tests are wired through testcontainers and skip when Docker is not reachable in the current shell

## caleb-latimer-jira75 - SCRUM-75

**Branch:** `caleb-latimer-jira75`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-75

**Summary:** Cache the queue read in Redis with invalidation

**Description:** As an Advisor, I want the Plan Cycle Queue cached in Redis, so that the queue loads fast without hammering the read store.

**Acceptance Criteria:**

- Queue reads check Redis first and fall back to DynamoDB on a miss.
- A cache entry is invalidated when a case's stage or due_date changes.
- A test asserts a stale entry is not served after an invalidating change.

**Code Connection:**

- `src/typescript/taxPlanCycleQueueProjection.ts`
- `src/typescript/taxPlanCycleQueueCache.ts`
- `src/typescript/taxPlanCycleQueueDynamoStore.ts`
- `src/typescript/taxPlanCycleQueueReadService.ts`
- `src/typescript/taxPlanCycleTransitionController.ts`
- `tests/typescript/bootstrap/dockerRedis.ts`
- `tests/typescript/taxPlanCycleQueueCache.test.ts`
- `tests/typescript/taxPlanCycleQueueDynamoStore.test.ts`
- `tests/typescript/taxPlanCycleQueueRead.integration.ts`

**Project Scope Connection:**

- Polyglot Backend & Contracts
- Core Case Service queue-read cache-aside work

**Changed Files:**

- `src/typescript/`
- `tests/typescript/`
- `README.md`
- `.env.example`
- `package.json`
- `adr/0014-redis-cache-aside-queue-reads.md`
- `adr/README.md`

**Validation Notes:**

- Scaffolding was completed in the sandbox, but the new npm dependencies still need to be installed locally before `npm run typecheck`, `npm test`, and `npm run test:integration` can be executed.
- New queue-cache tests were added under the Tax Plan Cycle feature slice so the Redis coverage can be run directly with Vitest after install.
## caleb-latimer-jira84 - SCRUM-84

**Branch:** `caleb-latimer-jira84`

**Assignee:** Caleb Latimer

**Jira Key:** SCRUM-84

**Summary:** Expose the tax calculation via a FastAPI endpoint

**Description:** As an Advisor, I want the calculation exposed via a JWT-protected
FastAPI endpoint, so that the Core service can request real numbers.

**Acceptance Criteria:**

- A POST endpoint accepts the calculation request and returns the response model.
- The endpoint requires a valid shared JWT and is tenant-scoped.
- An httpx test asserts a sample request returns the expected liability.

**Sequence Diagram:**

```mermaid
sequenceDiagram
    participant Client
    participant API as FastAPI
    participant JWT as Shared JWT Dependency
    participant Calc as calculate_tax
    Client->>API: POST /tax-calculations
    API->>JWT: Validate bearer token
    JWT-->>API: AuthenticatedPrincipal(tenant_id)
    API->>Calc: calculate_tax(request)
    Calc-->>API: TaxCalculationResult
    API-->>Client: 200 OK + response model
```

**Code Connection:** `src/python/tax_pulse_project_team_1/api.py` now owns the
FastAPI app factory and the `/tax-calculations` route, reusing the existing shared JWT
dependency and the pure `calculate_tax` engine. The new HTTP test exercises the ASGI
app through `httpx` and verifies the response model and liability output.

**Project Scope Connection:** This delivers the Polyglot Backend & Contracts ticket by
exposing the Python tax engine as the tenant-scoped service endpoint the Core service
can call without changing the calculation math contract or introducing persistence.

**Changed Files:**

- `src/python/tax_pulse_project_team_1/api.py`
- `src/python/tax_pulse_project_team_1/jwt_authentication.py`
- `src/python/tax_pulse_project_team_1/__init__.py`
- `tests/python/test_tax_calculation.py`
- `tests/python/test_tax_calculation_api.py`
- `tests/python/test_plan_cycle_queue_projection.py`
- `src/tax_liability_engine/scripts/liability_engine_on.py`
- `adr/0016-fastapi-startup-convention.md`
- `docs/postman/jira84-tax-calculation.postman_collection.json`
- `docs/postman/jira84-tax-calculation.postman_environment.json`
- `README.md`
- `pyproject.toml`

**Validation Notes:**

- `.\.venv\Scripts\python.exe -m ruff check src/python tests/python` passed.
- `.\.venv\Scripts\python.exe -m pyright --pythonpath .\.venv\Scripts\python.exe`
  passed.
- `.\.venv\Scripts\python.exe -m pytest tests/python/test_tax_calculation.py
  tests/python/test_tax_calculation_api.py tests/python/test_plan_cycle_queue_projection.py`
  passed: 26 tests passed, 2 skipped.
- `python src/tax_liability_engine/scripts/liability_engine_on.py` launched the API and returned
  `{"status":"ok"}` from `GET /health`.
- `.\.venv\Scripts\python.exe -m pytest` passed: 67 tests passed, 2 skipped.
