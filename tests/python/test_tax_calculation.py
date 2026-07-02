import pytest
from pydantic import ValidationError

from tax_pulse_project_team_1 import TaxCalculationRequest


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
        TaxCalculationRequest(income=100000, deductions=12000, state="CA")


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
