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
