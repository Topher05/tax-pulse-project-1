import pytest
from pydantic import ValidationError
from tax_pulse_project_team_1 import (
    TaxCalculationRequest,
    TaxCalculationResponse,
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


@pytest.mark.parametrize(("field", "value"), [("income", -1), ("deductions", -1)])
def test_tax_calculation_request_rejects_negative_amounts(field: str, value: float) -> None:
    request = {
        "income": 100000,
        "deductions": 12000,
        "state": "CA",
        "filing_status": "single",
    }
    request[field] = value

    with pytest.raises(ValidationError) as exc_info:
        TaxCalculationRequest.model_validate(request)

    assert field in str(exc_info.value)
    assert "greater than or equal to 0" in str(exc_info.value)


def test_tax_calculation_response_carries_required_outputs() -> None:
    response = TaxCalculationResponse(
        federal_liability=15400,
        state_liability=4700,
        effective_rate=0.201,
        marginal_rate=0.24,
        quarterly_estimate=5025,
    )

    assert response.model_dump() == {
        "federal_liability": 15400.0,
        "state_liability": 4700.0,
        "effective_rate": 0.201,
        "marginal_rate": 0.24,
        "quarterly_estimate": 5025.0,
    }


@pytest.mark.parametrize(
    ("field", "value", "message"),
    [
        ("federal_liability", -1, "greater than or equal to 0"),
        ("state_liability", -1, "greater than or equal to 0"),
        ("quarterly_estimate", -1, "greater than or equal to 0"),
        ("effective_rate", 1.01, "less than or equal to 1"),
        ("marginal_rate", -0.01, "greater than or equal to 0"),
    ],
)
def test_tax_calculation_response_rejects_invalid_outputs(
    field: str, value: float, message: str
) -> None:
    response = {
        "federal_liability": 15400,
        "state_liability": 4700,
        "effective_rate": 0.201,
        "marginal_rate": 0.24,
        "quarterly_estimate": 5025,
    }
    response[field] = value

    with pytest.raises(ValidationError) as exc_info:
        TaxCalculationResponse.model_validate(response)

    assert field in str(exc_info.value)
    assert message in str(exc_info.value)


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
