"""Scenario comparison router for the TaxPulse HTTP surface."""

from __future__ import annotations

from collections.abc import Awaitable, Callable

from fastapi import APIRouter, Depends

from ..scenario_comparison import (
    ScenarioComparisonRequest,
    ScenarioComparisonResult,
    calculate_scenario_comparisons,
)


def create_scenario_comparison_router(
    require_tenant_id: Callable[..., Awaitable[str]],
) -> APIRouter:
    """Create the scenario-comparison route group for the FastAPI app."""

    router = APIRouter(tags=["scenario-comparisons"])

    @router.post("/scenarios/comparisons", response_model=list[ScenarioComparisonResult])
    async def post_scenario_comparisons(
        request: ScenarioComparisonRequest,
        _tenant_id: str = Depends(require_tenant_id),  # noqa: B008
    ) -> list[ScenarioComparisonResult]:
        return await calculate_scenario_comparisons(request)

    return router
