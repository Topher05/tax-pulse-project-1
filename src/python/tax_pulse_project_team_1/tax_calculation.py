"""Tax calculation model definitions."""

from typing import Literal

from pydantic import BaseModel, field_validator

ALLOWED_FILING_STATUSES = {
    "single",
    "married_filing_jointly",
    "married_filing_separately",
    "head_of_household",
    "qualifying_surviving_spouse",
}


class TaxCalculationRequest(BaseModel):
    """Request model for tax calculation inputs."""

    income: float
    deductions: float
    state: str
    filing_status: str

    @field_validator("filing_status")
    @classmethod
    def validate_filing_status(cls, value: str) -> str:
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
