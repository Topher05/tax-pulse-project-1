"""Compatibility module that exposes the FastAPI composition root."""

from __future__ import annotations

from .app import create_app
from .dependencies import create_tenant_scope_dependency
from .routers.health import create_health_router
from .routers.scenario_comparison import create_scenario_comparison_router
from .routers.tax_calculation import create_tax_calculation_router

__all__ = [
    "create_app",
    "create_health_router",
    "create_scenario_comparison_router",
    "create_tax_calculation_router",
    "create_tenant_scope_dependency",
]
