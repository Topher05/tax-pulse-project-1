# Martins Okorie Ticket Journal

**Owner:** Martins Okorie  
**Branch prefix:** `martins-okorie-`

Add new ticket entries below using this template.

## martins-okorie-jira82 - SCRUM-82

**Branch:** `martins-okorie-jira82`

**Assignee:** Martins Okorie

**Jira Key:** SCRUM-82

**Summary:** Derive the quarterly estimated payment

**Description:** As an Advisor, I want the quarterly estimated payment derived from
total liability, so that the cycle shows what the client owes each quarter.

**Acceptance Criteria:**

- The engine splits total liability into four quarterly estimates.
- The estimate accounts for withholdings already applied.
- A pytest case asserts the four estimates sum to the net liability.

**Code Connection:** The Python tax calculation request now accepts non-negative
withholding, the response carries a four-payment quarterly estimate schedule, and the
calculation module derives deterministic cent-accurate quarterly payments from net
liability.

**Project Scope Connection:** This supports the Tax Plan Cycle modeling workflow by
turning calculated liability into quarterly payment guidance advisors can show clients
during tax planning.

**Changed Files:**

- `src/python/tax_pulse_project_team_1/tax_calculation.py`
- `tests/python/test_tax_calculation.py`
- `planning/team/mm-ticket-journal.md`

**Validation Notes:**

- `python -m pytest tests/python/test_tax_calculation.py` passed.
- `python -m ruff format --check src/python tests/python` passed.
- `python -m pyright --pythonpath "$(python -c 'import sys; print(sys.executable)')"` passed.
- `python -m pytest` passed after starting Colima and downloading
  `localstack/localstack:3.8.1` for the LocalStack/Testcontainers projection tests.

<!--
## martins-okorie-jiraXX - SCRUM-XX

**Branch:** `martins-okorie-jiraXX`

**Assignee:** Martins Okorie

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
