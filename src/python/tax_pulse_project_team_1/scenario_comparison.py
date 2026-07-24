"""Typed contracts for comparing tax-planning scenarios with a baseline."""

from __future__ import annotations

from pydantic import BaseModel, Field

from .tax_calculation import TaxCalculationRequest


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
