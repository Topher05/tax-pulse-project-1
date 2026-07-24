from tax_pulse_project_team_1.tax_plan_cycle_queue_projection import (
    TaxPlanCycleQueueProjectionItem,
    TaxPlanCycleRecord,
)


def test_queue_projection_models_use_pythonic_field_names() -> None:
    record = TaxPlanCycleRecord(
        case_id="case-001",
        client_id="client-001",
        stage="Intake",
        owner="Advisor One",
        priority="high",
        due_date="2026-07-21",
        on_hold=False,
    )
    projection = TaxPlanCycleQueueProjectionItem(
        tenant_id="tenant-001",
        case_id="case-001",
        client_id="client-001",
        stage="Intake",
        owner="Advisor One",
        priority="high",
        due_date="2026-07-21",
        on_hold=False,
        hold_reason=None,
        overdue=False,
    )

    assert record.case_id == "case-001"
    assert record.client_id == "client-001"
    assert record.due_date == "2026-07-21"
    assert projection.tenant_id == "tenant-001"
    assert projection.hold_reason is None
