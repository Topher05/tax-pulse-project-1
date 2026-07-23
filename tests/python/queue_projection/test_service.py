from __future__ import annotations

from dataclasses import replace
from datetime import date

from tax_pulse_project_team_1.queue_projection import (
    TaxPlanCycleQueueProjectionItem,
    TaxPlanCycleRecord,
    project_tax_plan_cycle_to_queue_item,
    upsert_tax_plan_cycle_queue_projection,
)


def build_cycle(
    *,
    stage: str = "Intake",
    due_date: str = "2026-07-21",
    on_hold: bool = False,
    hold_reason: str | None = None,
) -> TaxPlanCycleRecord:
    return TaxPlanCycleRecord(
        case_id="case-001",
        client_id="client-001",
        stage=stage,
        owner="Advisor One",
        priority="high",
        due_date=due_date,
        on_hold=on_hold,
        hold_reason=hold_reason,
    )


def test_project_tax_plan_cycle_to_queue_item_recomputes_overdue_from_due_date() -> None:
    source = build_cycle(due_date="2026-07-21")

    projection = project_tax_plan_cycle_to_queue_item(
        "tenant-001",
        source,
        as_of=date(2026, 7, 22),
    )

    assert projection == TaxPlanCycleQueueProjectionItem(
        tenant_id="tenant-001",
        case_id="case-001",
        client_id="client-001",
        stage="Intake",
        owner="Advisor One",
        priority="high",
        due_date="2026-07-21",
        on_hold=False,
        hold_reason=None,
        overdue=True,
    )


def test_upsert_tax_plan_cycle_queue_projection_invokes_writer_with_projected_item() -> None:
    source = build_cycle(due_date="2026-07-24")
    captured: list[TaxPlanCycleQueueProjectionItem] = []

    projection = upsert_tax_plan_cycle_queue_projection(
        "tenant-001",
        source,
        as_of=date(2026, 7, 22),
        writer=captured.append,
    )

    assert captured == [projection]
    assert projection.overdue is False


def test_projection_matches_source_cycle_after_stage_change() -> None:
    source = build_cycle(stage="Review", due_date="2026-07-21", on_hold=True, hold_reason="Hold")
    updated_source = replace(source, stage="Client Approval")

    projection = project_tax_plan_cycle_to_queue_item(
        "tenant-001",
        updated_source,
        as_of=date(2026, 7, 22),
    )

    assert projection.tenant_id == "tenant-001"
    assert projection.case_id == updated_source.case_id
    assert projection.client_id == updated_source.client_id
    assert projection.stage == updated_source.stage
    assert projection.owner == updated_source.owner
    assert projection.priority == updated_source.priority
    assert projection.due_date == updated_source.due_date
    assert projection.on_hold is True
    assert projection.hold_reason == "Hold"
    assert projection.overdue is True
