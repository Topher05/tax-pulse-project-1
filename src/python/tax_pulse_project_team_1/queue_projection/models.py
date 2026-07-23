"""Tax Plan Cycle queue projection models."""

from __future__ import annotations

from dataclasses import dataclass


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
