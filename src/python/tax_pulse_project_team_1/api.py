"""FastAPI application factory for the TaxPulse tax calculation service."""

from __future__ import annotations

from collections.abc import Awaitable, Callable

from fastapi import APIRouter, Depends, FastAPI

from .jwt_authentication import (
    AuthenticatedPrincipal,
    JwtValidationConfig,
    create_jwt_authentication_dependency,
)
from .scenario_comparison import (
    ScenarioComparisonRequest,
    ScenarioComparisonResult,
    calculate_scenario_comparisons,
)
from .tax_calculation import TaxCalculationRequest, TaxCalculationResult, calculate_tax


def create_tenant_scope_dependency(
    require_authenticated_principal: Callable[..., Awaitable[AuthenticatedPrincipal]],
) -> Callable[..., Awaitable[str]]:
    """Return the authenticated tenant id so route handlers stay tenant-scoped."""

    async def require_tenant_id(
        principal: AuthenticatedPrincipal = Depends(require_authenticated_principal),  # noqa: B008
    ) -> str:
        return principal.tenant_id

    return require_tenant_id


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


def create_app(config: JwtValidationConfig | None = None) -> FastAPI:
    """Create the FastAPI application used by the tax calculation service."""

    effective_config = config or JwtValidationConfig.from_environment()
    require_authenticated_principal = create_jwt_authentication_dependency(effective_config)
    require_tenant_id = create_tenant_scope_dependency(require_authenticated_principal)

    app = FastAPI(title="TaxPulse Tax Calculation API")

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(create_tax_calculation_router(require_tenant_id))
    app.include_router(create_scenario_comparison_router(require_tenant_id))
    return app
