"""Projection helpers for the Tax Plan Cycle queue read model."""

from __future__ import annotations

from datetime import date
from typing import Protocol

from tax_liability_engine.dynamodb import DEFAULT_PLAN_CYCLE_QUEUE_PROJECTION_TABLE_NAME
from tax_liability_engine.dynamodb.plan_cycle_queue_projection import create_dynamodb_client

from .models import TaxPlanCycleQueueProjectionItem, TaxPlanCycleRecord


class DynamoDbPutItemClient(Protocol):
    """Small DynamoDB surface required by the queue projection writer."""

    def put_item(self, **kwargs: object) -> dict[str, object]: ...


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


def _to_dynamodb_item(projection: TaxPlanCycleQueueProjectionItem) -> dict[str, object]:
    return {
        "tenant_id": {"S": projection.tenant_id},
        "case_id": {"S": projection.case_id},
        "client": {"S": projection.client_id},
        "stage": {"S": projection.stage},
        "owner": {"S": projection.owner},
        "priority": {"S": projection.priority},
        "due_date": {"S": projection.due_date},
        "is_overdue": {"BOOL": projection.overdue},
    }


def upsert_tax_plan_cycle_queue_projection(
    tenant_id: str,
    source: TaxPlanCycleRecord,
    *,
    as_of: date | None = None,
    dynamodb_client: DynamoDbPutItemClient | None = None,
    table_name: str = DEFAULT_PLAN_CYCLE_QUEUE_PROJECTION_TABLE_NAME,
) -> TaxPlanCycleQueueProjectionItem:
    """Upsert the projected cycle into the DynamoDB queue read model."""

    projection = project_tax_plan_cycle_to_queue_item(tenant_id, source, as_of=as_of)
    client = dynamodb_client or create_dynamodb_client()
    client.put_item(TableName=table_name, Item=_to_dynamodb_item(projection))
    return projection
