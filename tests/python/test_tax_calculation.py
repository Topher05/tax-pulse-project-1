import pytest
from pydantic import ValidationError

from tax_pulse_project_team_1 import (
    TaxCalculationRequest,
    TaxCalculationResult,
    calculate_tax,
)


def test_tax_calculation_request_accepts_required_fields() -> None:
    model = TaxCalculationRequest(
        income=100000,
        deductions=12000,
        state="CA",
        filing_status="single",
    )

    assert model.income == 100000
    assert model.deductions == 12000
    assert model.state == "CA"
    assert model.filing_status == "single"


def test_tax_calculation_request_rejects_missing_fields() -> None:
    with pytest.raises(ValidationError, match="filing_status"):
        TaxCalculationRequest.model_validate({"income": 100000, "deductions": 12000, "state": "CA"})


def test_tax_calculation_request_rejects_invalid_filing_status_with_custom_message() -> None:
    with pytest.raises(ValidationError) as exc_info:
        TaxCalculationRequest(
            income=100000,
            deductions=12000,
            state="CA",
            filing_status="invalid-status",
        )

    message = str(exc_info.value)
    assert "Invalid filing status" in message
    assert "single" in message


@pytest.mark.asyncio
async def test_calculate_tax_returns_placeholder_result_shape() -> None:
    request = TaxCalculationRequest(
        income=100000,
        deductions=12000,
        state="CA",
        filing_status="single",
    )

    result = await calculate_tax(request)

    assert isinstance(result, TaxCalculationResult)
    assert result.model_dump() == {
        "income": 100000.0,
        "deductions": 12000.0,
        "state": "CA",
        "filing_status": "single",
        "taxable_income": 88000.0,
        "estimated_tax": 8800.0,
        "currency": "USD",
        "calculation_status": "placeholder",
    }
