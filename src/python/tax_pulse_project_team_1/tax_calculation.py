"""Tax calculation model definitions."""

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Annotated, Final

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
MONEY_CENT: Final[Decimal] = Decimal("0.01")
QUARTER_COUNT: Final[int] = 4

NonNegativeMoneyAmount = Annotated[float, Field(ge=0)]


class TaxCalculationRequest(BaseModel):
    """Request model for tax calculation inputs."""

    income: float = Field(ge=0)
    deductions: float = Field(ge=0)
    withholding: float = Field(default=0, ge=0)
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
    quarterly_estimates: list[NonNegativeMoneyAmount] = Field(
        min_length=QUARTER_COUNT,
        max_length=QUARTER_COUNT,
    )


def _money_to_cents(amount: float) -> int:
    rounded_amount = Decimal(str(amount)).quantize(MONEY_CENT, rounding=ROUND_HALF_UP)
    return int(rounded_amount * 100)


def derive_quarterly_estimates(total_liability: float, withholding: float) -> list[float]:
    """Split net tax liability into four deterministic quarterly payments."""

    net_liability_cents = max(_money_to_cents(total_liability) - _money_to_cents(withholding), 0)
    base_payment_cents, remainder_cents = divmod(net_liability_cents, QUARTER_COUNT)

    payment_cents = [
        base_payment_cents + (1 if quarter_index < remainder_cents else 0)
        for quarter_index in range(QUARTER_COUNT)
    ]
    return [cents / 100 for cents in payment_cents]


async def calculate_tax(request: TaxCalculationRequest) -> TaxCalculationResponse:
    """Return a zero-valued response until bracket and payment logic is implemented."""

    federal_liability = 0
    state_liability = 0
    quarterly_estimates = derive_quarterly_estimates(
        federal_liability + state_liability,
        request.withholding,
    )

    return TaxCalculationResponse(
        federal_liability=federal_liability,
        state_liability=state_liability,
        effective_rate=0,
        marginal_rate=0,
        quarterly_estimate=quarterly_estimates[0],
        quarterly_estimates=quarterly_estimates,
    )
