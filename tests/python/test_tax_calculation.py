from decimal import Decimal

import pytest
from pydantic import ValidationError
from tax_pulse_project_team_1 import (
    TaxCalculationRequest,
    TaxCalculationResponse,
    calculate_tax,
)


def test_tax_calculation_request_accepts_required_fields() -> None:
    model = TaxCalculationRequest(
        income=Decimal("100000"),
        deductions=Decimal("12000"),
        state="CA",
        filing_status="single",
    )

    assert model.income == Decimal("100000")
    assert model.deductions == Decimal("12000")
    assert model.state == "CA"
    assert model.filing_status == "single"


def test_tax_calculation_request_rejects_missing_fields() -> None:
    with pytest.raises(ValidationError, match="filing_status"):
        TaxCalculationRequest.model_validate({"income": 100000, "deductions": 12000, "state": "CA"})


def test_tax_calculation_request_rejects_invalid_filing_status_with_custom_message() -> None:
    with pytest.raises(ValidationError) as exc_info:
        TaxCalculationRequest(
            income=Decimal("100000"),
            deductions=Decimal("12000"),
            state="CA",
            filing_status="invalid-status",
        )

    message = str(exc_info.value)
    assert "Invalid filing status" in message
    assert "single" in message


def test_tax_calculation_request_normalizes_and_validates_state() -> None:
    model = TaxCalculationRequest(
        income=Decimal("100000"),
        deductions=Decimal("12000"),
        state="ca",
        filing_status="single",
    )

    assert model.state == "CA"

    with pytest.raises(ValidationError, match="Unsupported state: NY"):
        TaxCalculationRequest(
            income=Decimal("100000"),
            deductions=Decimal("12000"),
            state="NY",
            filing_status="single",
        )


@pytest.mark.asyncio
async def test_calculate_tax_returns_bracket_liabilities_and_rates() -> None:
    request = TaxCalculationRequest(
        income=Decimal("100000"),
        deductions=Decimal("12000"),
        state="CA",
        filing_status="single",
    )

    result = await calculate_tax(request)

    assert isinstance(result, TaxCalculationResponse)
    assert result.model_dump() == {
        "income": Decimal("100000"),
        "deductions": Decimal("12000"),
        "state": "CA",
        "filing_status": "single",
        "taxable_income": Decimal("88000"),
        "federal_liability": Decimal("14072.00"),
        "state_liability": Decimal("4622.64"),
        "total_liability": Decimal("18694.64"),
        "effective_rate": Decimal("0.2124"),
        "marginal_rate": Decimal("0.3130"),
        "currency": "USD",
    }


@pytest.mark.asyncio
async def test_calculate_tax_returns_zero_rates_for_zero_taxable_income() -> None:
    result = await calculate_tax(
        TaxCalculationRequest(
            income=Decimal("10000"),
            deductions=Decimal("12000"),
            state="CA",
            filing_status="single",
        )
    )

    assert result.taxable_income == Decimal("0")
    assert result.federal_liability == Decimal("0.00")
    assert result.state_liability == Decimal("0.00")
    assert result.effective_rate == Decimal("0.0000")
    assert result.marginal_rate == Decimal("0.0000")


@pytest.mark.asyncio
async def test_calculate_tax_returns_identical_results_for_identical_requests() -> None:
    request = TaxCalculationRequest(
        income=Decimal("100000"),
        deductions=Decimal("12000"),
        state="CA",
        filing_status="single",
    )

    first_result = await calculate_tax(request)
    second_result = await calculate_tax(request)

    assert first_result == second_result
