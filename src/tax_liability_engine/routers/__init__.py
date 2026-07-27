"""Feature-sliced FastAPI routers for the TaxPulse liability engine."""

from .health import create_health_router
from .scenario_comparison import create_scenario_comparison_router
from .tax_calculation import create_tax_calculation_router

__all__ = [
    "create_health_router",
    "create_scenario_comparison_router",
    "create_tax_calculation_router",
]
