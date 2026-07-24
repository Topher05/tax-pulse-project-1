"""Typed contracts for comparing tax-planning scenarios with a baseline."""

from __future__ import annotations

from pydantic import BaseModel, Field

from .tax_calculation import TaxCalculationRequest, TaxCalculationResult, calculate_tax


class ScenarioComparisonInput(BaseModel):
    """A named scenario using the same typed figures as a tax calculation."""

    name: str = Field(min_length=1)
    typed_figures: TaxCalculationRequest


class ScenarioComparisonRequest(BaseModel):
    """Baseline figures and the two to five scenarios to compare against them."""

    baseline: TaxCalculationRequest
    scenarios: list[ScenarioComparisonInput] = Field(min_length=2, max_length=5)


class ScenarioComparisonResult(BaseModel):
    """The total tax and signed difference from the baseline for one scenario."""

    name: str = Field(min_length=1)
    total_tax: float = Field(ge=0)
    delta_vs_baseline: float


async def calculate_scenario_comparisons(
    request: ScenarioComparisonRequest,
) -> list[ScenarioComparisonResult]:
    """Calculate each scenario with the baseline calculator and compare its total tax."""

    baseline_calculation = await calculate_tax(request.baseline)
    baseline_total_tax = _total_tax(baseline_calculation)
    results: list[ScenarioComparisonResult] = []

    for scenario in request.scenarios:
        calculation = await calculate_tax(scenario.typed_figures)
        total_tax = _total_tax(calculation)
        results.append(
            ScenarioComparisonResult(
                name=scenario.name,
                total_tax=total_tax,
                delta_vs_baseline=total_tax - baseline_total_tax,
            )
        )

    return results


def _total_tax(calculation: TaxCalculationResult) -> float:
    """Return combined federal and state liability for a calculation."""

    return float(calculation.total_liability)
