"""Tax calculation router for the TaxPulse HTTP surface."""

from __future__ import annotations

from collections.abc import Awaitable, Callable

from fastapi import APIRouter, Depends

from ..tax_calculation import TaxCalculationRequest, TaxCalculationResult, calculate_tax


def create_tax_calculation_router(
    require_tenant_id: Callable[..., Awaitable[str]],
) -> APIRouter:
    """Create the calculation route group for the FastAPI app."""

    router = APIRouter(tags=["tax-calculations"])

    @router.post("/tax-calculations", response_model=TaxCalculationResult)
    async def post_tax_calculation(
        request: TaxCalculationRequest,
        _tenant_id: str = Depends(require_tenant_id),  # noqa: B008
    ) -> TaxCalculationResult:
        return await calculate_tax(request)

    return router
