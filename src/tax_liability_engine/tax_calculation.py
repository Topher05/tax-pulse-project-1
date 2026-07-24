"""Tax calculation model definitions."""

from __future__ import annotations

from typing import Final

from pydantic import BaseModel, Field, field_validator

ALLOWED_FILING_STATUSES: Final[frozenset[str]] = frozenset(
    {
        "single",
        "married_filing_jointly",
        "married_filing_separately",
        "head_of_household",
        "qualifying_surviving_spouse",
    }
)


class TaxCalculationRequest(BaseModel):
    """Request model for tax calculation inputs."""

    income: float = Field(ge=0)
    deductions: float = Field(ge=0)
    state: str
    filing_status: str

    @field_validator("filing_status")
    @classmethod
    def validate_filing_status(cls: type[TaxCalculationRequest], value: str) -> str:
        if value not in ALLOWED_FILING_STATUSES:
            allowed = ", ".join(sorted(ALLOWED_FILING_STATUSES))
            raise ValueError(f"Invalid filing status. Allowed values are: {allowed}.")
        return value


class TaxCalculationResponse(BaseModel):
    """Response contract for calculated tax liabilities and rates."""

    federal_liability: float = Field(ge=0)
    state_liability: float = Field(ge=0)
    effective_rate: float = Field(ge=0, le=1)
    marginal_rate: float = Field(ge=0, le=1)
    quarterly_estimate: float = Field(ge=0)


async def calculate_tax(request: TaxCalculationRequest) -> TaxCalculationResponse:
    """Return a zero-valued response until bracket and payment logic is implemented."""

    return TaxCalculationResponse(
        federal_liability=0,
        state_liability=0,
        effective_rate=0,
        marginal_rate=0,
        quarterly_estimate=0,
    )
