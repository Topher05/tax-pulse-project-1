"""Tax liability engine project workspace package."""

from collections.abc import Callable
from typing import TYPE_CHECKING

from .dynamodb import (
    DEFAULT_PLAN_CYCLE_QUEUE_PROJECTION_TABLE_NAME,
    PLAN_CYCLE_QUEUE_PROJECTION_CASE_KEY,
    PLAN_CYCLE_QUEUE_PROJECTION_TENANT_KEY,
    PlanCycleQueueProjectionItem,
    create_dynamodb_client,
    create_plan_cycle_queue_projection_table,
    describe_plan_cycle_queue_projection_table,
    wait_for_plan_cycle_queue_projection_table,
)
from .greetings import create_greeting
from .scenario_comparison import (
    ScenarioComparisonInput,
    ScenarioComparisonRequest,
    ScenarioComparisonResult,
    calculate_scenario_comparisons,
)
from .tax_calculation import (
    TaxCalculationRequest,
    TaxCalculationResult,
    calculate_tax,
)
from .tax_plan_cycle_queue_projection import (
    TaxPlanCycleQueueProjectionItem,
    TaxPlanCycleRecord,
    project_tax_plan_cycle_to_queue_item,
    upsert_tax_plan_cycle_queue_projection,
)

if TYPE_CHECKING:
    from .api import create_app


def __getattr__(name: str) -> Callable[..., object]:
    if name == "create_app":
        from .api import create_app

        return create_app
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__all__ = [
    "DEFAULT_PLAN_CYCLE_QUEUE_PROJECTION_TABLE_NAME",
    "PLAN_CYCLE_QUEUE_PROJECTION_CASE_KEY",
    "PLAN_CYCLE_QUEUE_PROJECTION_TENANT_KEY",
    "PlanCycleQueueProjectionItem",
    "create_dynamodb_client",
    "create_greeting",
    "create_plan_cycle_queue_projection_table",
    "describe_plan_cycle_queue_projection_table",
    "wait_for_plan_cycle_queue_projection_table",
    "TaxPlanCycleQueueProjectionItem",
    "TaxPlanCycleRecord",
    "TaxCalculationRequest",
    "ScenarioComparisonInput",
    "ScenarioComparisonRequest",
    "ScenarioComparisonResult",
    "create_app",
    "TaxCalculationResult",
    "calculate_tax",
    "calculate_scenario_comparisons",
    "project_tax_plan_cycle_to_queue_item",
    "upsert_tax_plan_cycle_queue_projection",
]
