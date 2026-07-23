"""Tax calculation model definitions."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Final, Literal

from pydantic import BaseModel, field_validator

ALLOWED_FILING_STATUSES: Final[frozenset[str]] = frozenset(
    {
        "single",
        "married_filing_jointly",
        "married_filing_separately",
        "head_of_household",
        "qualifying_surviving_spouse",
    }
)


@dataclass(frozen=True, slots=True)
class TaxBracket:
    """An income range taxed at one marginal rate."""

    rate: Decimal
    lower_bound: Decimal
    upper_bound: Decimal | None

    def __post_init__(self) -> None:
        if self.rate < Decimal("0"):
            raise ValueError("Tax bracket rate cannot be negative.")
        if self.lower_bound < Decimal("0"):
            raise ValueError("Tax bracket lower bound cannot be negative.")
        if self.upper_bound is not None and self.upper_bound <= self.lower_bound:
            raise ValueError("Tax bracket upper bound must exceed its lower bound.")


def calculate_bracket_liability(
    taxable_income: Decimal,
    brackets: tuple[TaxBracket, ...],
) -> Decimal:
    """Calculate unrounded progressive tax liability for a bracket schedule."""

    if taxable_income < Decimal("0"):
        raise ValueError("Taxable income cannot be negative.")

    liability = Decimal("0")
    for bracket in brackets:
        capped_income = (
            taxable_income
            if bracket.upper_bound is None
            else min(taxable_income, bracket.upper_bound)
        )
        taxable_amount = max(capped_income - bracket.lower_bound, Decimal("0"))
        liability += taxable_amount * bracket.rate

    return liability


class TaxCalculationRequest(BaseModel):
    """Request model for tax calculation inputs."""

    income: float
    deductions: float
    state: str
    filing_status: str

    @field_validator("filing_status")
    @classmethod
    def validate_filing_status(cls: type[TaxCalculationRequest], value: str) -> str:
        if value not in ALLOWED_FILING_STATUSES:
            allowed = ", ".join(sorted(ALLOWED_FILING_STATUSES))
            raise ValueError(f"Invalid filing status. Allowed values are: {allowed}.")
        return value


class TaxCalculationResult(BaseModel):
    """Placeholder result model for the async tax calculation seam."""

    income: float
    deductions: float
    state: str
    filing_status: str
    taxable_income: float
    estimated_tax: float
    currency: str = "USD"
    calculation_status: Literal["placeholder"] = "placeholder"


async def calculate_tax(request: TaxCalculationRequest) -> TaxCalculationResult:
    """Return a deterministic placeholder result for an async-ready calculation seam."""

    taxable_income = max(request.income - request.deductions, 0.0)
    estimated_tax = round(taxable_income * 0.1, 2)

    return TaxCalculationResult(
        income=request.income,
        deductions=request.deductions,
        state=request.state,
        filing_status=request.filing_status,
        taxable_income=taxable_income,
        estimated_tax=estimated_tax,
    )
