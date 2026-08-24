"""FastAPI application factory for the TaxPulse liability engine."""

from __future__ import annotations

from collections.abc import Awaitable, Callable

from fastapi import FastAPI

from .dependencies import create_tenant_scope_dependency
from .jwt_authentication import (
    AuthenticatedPrincipal,
    JwtValidationConfig,
    create_jwt_authentication_dependency,
)
from .routers.health import create_health_router
from .routers.scenario_comparison import create_scenario_comparison_router
from .routers.tax_calculation import create_tax_calculation_router


def create_app(
    config: JwtValidationConfig | None = None,
    *,
    authentication_dependency: Callable[..., Awaitable[AuthenticatedPrincipal]] | None = None,
) -> FastAPI:
    """Create the FastAPI application used by the tax calculation service."""

    effective_config = config or JwtValidationConfig.from_environment()
    require_authenticated_principal = (
        authentication_dependency or create_jwt_authentication_dependency(effective_config)
    )
    require_tenant_id = create_tenant_scope_dependency(require_authenticated_principal)

    app = FastAPI(title="TaxPulse Tax Calculation API")
    app.include_router(create_health_router())
    app.include_router(create_tax_calculation_router(require_tenant_id))
    app.include_router(create_scenario_comparison_router(require_tenant_id))
    return app
