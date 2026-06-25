"""Tax calculation model definitions."""

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
