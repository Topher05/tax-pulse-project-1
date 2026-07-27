"""DynamoDB table contracts for TaxPulse local AWS emulation."""

from .plan_cycle_queue_projection import (
    DEFAULT_PLAN_CYCLE_QUEUE_PROJECTION_TABLE_NAME,
    PLAN_CYCLE_QUEUE_PROJECTION_CASE_KEY,
    PLAN_CYCLE_QUEUE_PROJECTION_TENANT_KEY,
    PlanCycleQueueProjectionItem,
    create_dynamodb_client,
    create_plan_cycle_queue_projection_table,
    describe_plan_cycle_queue_projection_table,
    wait_for_plan_cycle_queue_projection_table,
)

__all__ = [
    "DEFAULT_PLAN_CYCLE_QUEUE_PROJECTION_TABLE_NAME",
    "PLAN_CYCLE_QUEUE_PROJECTION_CASE_KEY",
    "PLAN_CYCLE_QUEUE_PROJECTION_TENANT_KEY",
    "PlanCycleQueueProjectionItem",
    "create_dynamodb_client",
    "create_plan_cycle_queue_projection_table",
    "describe_plan_cycle_queue_projection_table",
    "wait_for_plan_cycle_queue_projection_table",
]
