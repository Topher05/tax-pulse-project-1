"""Projection helpers for the Tax Plan Cycle queue read model."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Callable


@dataclass(frozen=True, slots=True)
class TaxPlanCycleRecord:
    """Source Tax Plan Cycle fields mirrored from the Express entity."""

    case_id: str
    client_id: str
    stage: str
    owner: str
    priority: str
    due_date: str
    on_hold: bool
    hold_reason: str | None = None


@dataclass(frozen=True, slots=True)
class TaxPlanCycleQueueProjectionItem:
    """Queue read-model shape stored in DynamoDB."""

    tenant_id: str
    case_id: str
    client_id: str
    stage: str
    owner: str
    priority: str
    due_date: str
    on_hold: bool
    hold_reason: str | None
    overdue: bool


def project_tax_plan_cycle_to_queue_item(
    tenant_id: str,
    source: TaxPlanCycleRecord,
    *,
    as_of: date | None = None,
) -> TaxPlanCycleQueueProjectionItem:
    """Project the source cycle into the queue item's denormalized shape."""

    reference_date = date.today() if as_of is None else as_of
    due_date = date.fromisoformat(source.due_date)
    overdue = due_date < reference_date

    return TaxPlanCycleQueueProjectionItem(
        tenant_id=tenant_id,
        case_id=source.case_id,
        client_id=source.client_id,
        stage=source.stage,
        owner=source.owner,
        priority=source.priority,
        due_date=source.due_date,
        on_hold=source.on_hold,
        hold_reason=source.hold_reason,
        overdue=overdue,
    )


def upsert_tax_plan_cycle_queue_projection(
    tenant_id: str,
    source: TaxPlanCycleRecord,
    *,
    as_of: date | None = None,
    writer: Callable[[TaxPlanCycleQueueProjectionItem], None] | None = None,
) -> TaxPlanCycleQueueProjectionItem:
    """Stub the DynamoDB upsert seam until SCRUM-73 delivers the table contract."""

    projection = project_tax_plan_cycle_to_queue_item(tenant_id, source, as_of=as_of)
    # Blocked by Scrum-74 pending impl
    if writer is not None:
        writer(projection)
    return projection
