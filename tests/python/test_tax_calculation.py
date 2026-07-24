from decimal import Decimal

import pytest
from pydantic import ValidationError
from tax_pulse_project_team_1 import (
    TaxCalculationRequest,
    TaxCalculationResult,
    calculate_tax,
)
from tax_pulse_project_team_1.tax_calculation import derive_quarterly_estimates


def test_tax_calculation_request_accepts_required_fields() -> None:
    model = TaxCalculationRequest(
        income=Decimal("100000"),
        deductions=Decimal("12000"),
        state="CA",
        filing_status="single",
    )

    assert model.income == Decimal("100000")
    assert model.deductions == Decimal("12000")
    assert model.income == 100000
    assert model.deductions == 12000
    assert model.withholding == 0
    assert model.state == "CA"
    assert model.filing_status == "single"


def test_tax_calculation_request_accepts_withholding() -> None:
    model = TaxCalculationRequest(
        income=100000,
        deductions=12000,
        withholding=24500,
        state="CA",
        filing_status="single",
    )

    assert model.withholding == 24500


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
@pytest.mark.parametrize(
    ("field", "value"), [("income", -1), ("deductions", -1), ("withholding", -1)]
)
def test_tax_calculation_request_rejects_negative_amounts(field: str, value: float) -> None:
    request = {
        "income": 100000,
        "deductions": 12000,
        "withholding": 24500,
        "state": "CA",
        "filing_status": "single",
    }
    request[field] = value

    with pytest.raises(ValidationError, match="Unsupported state: NY"):
        TaxCalculationRequest(
            income=Decimal("100000"),
            deductions=Decimal("12000"),
            state="NY",
            filing_status="single",
        )
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
        quarterly_estimates=[5025, 5025, 5025, 5025],
    )

    assert response.model_dump() == {
        "federal_liability": 15400.0,
        "state_liability": 4700.0,
        "effective_rate": 0.201,
        "marginal_rate": 0.24,
        "quarterly_estimate": 5025.0,
        "quarterly_estimates": [5025.0, 5025.0, 5025.0, 5025.0],
    }


@pytest.mark.parametrize(
    ("field", "value", "message"),
    [
        ("federal_liability", -1, "greater than or equal to 0"),
        ("state_liability", -1, "greater than or equal to 0"),
        ("quarterly_estimate", -1, "greater than or equal to 0"),
        ("quarterly_estimates", [5025, -1, 5025, 5025], "greater than or equal to 0"),
        ("quarterly_estimates", [5025, 5025, 5025], "List should have at least 4 items"),
        ("quarterly_estimates", [5025, 5025, 5025, 5025, 0], "List should have at most 4 items"),
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
        "quarterly_estimates": [5025, 5025, 5025, 5025],
    }
    response[field] = value

    with pytest.raises(ValidationError) as exc_info:
        TaxCalculationResponse.model_validate(response)

    assert field in str(exc_info.value)
    assert message in str(exc_info.value)


def test_tax_calculation_response_requires_quarterly_estimates() -> None:
    response = {
        "federal_liability": 15400,
        "state_liability": 4700,
        "effective_rate": 0.201,
        "marginal_rate": 0.24,
        "quarterly_estimate": 5025,
    }

    with pytest.raises(ValidationError) as exc_info:
        TaxCalculationResponse.model_validate(response)

    assert "quarterly_estimates" in str(exc_info.value)
    assert "Field required" in str(exc_info.value)


def test_derive_quarterly_estimates_splits_total_liability_into_four_payments() -> None:
    assert derive_quarterly_estimates(20100, 0) == [5025, 5025, 5025, 5025]


def test_derive_quarterly_estimates_subtracts_withholding_before_splitting() -> None:
    assert derive_quarterly_estimates(20100, 5000) == [3775, 3775, 3775, 3775]


def test_derive_quarterly_estimates_sum_to_net_liability_at_cent_precision() -> None:
    estimates = derive_quarterly_estimates(20100.01, 5000)

    assert estimates == [3775.01, 3775, 3775, 3775]
    assert sum(round(estimate * 100) for estimate in estimates) == 1510001


def test_derive_quarterly_estimates_distributes_remainder_cents_to_earliest_quarters() -> None:
    assert derive_quarterly_estimates(100.03, 0) == [25.01, 25.01, 25.01, 25]


def test_derive_quarterly_estimates_returns_zeroes_when_withholding_exceeds_liability() -> None:
    assert derive_quarterly_estimates(100, 150) == [0, 0, 0, 0]


@pytest.mark.asyncio
async def test_calculate_tax_returns_bracket_liabilities_and_rates() -> None:
    request = TaxCalculationRequest(
        income=Decimal("100000"),
        deductions=Decimal("12000"),
        state="CA",
        filing_status="single",
    )

    result = await calculate_tax(request)

    assert isinstance(result, TaxCalculationResult)
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
        "federal_liability": 0.0,
        "state_liability": 0.0,
        "effective_rate": 0.0,
        "marginal_rate": 0.0,
        "quarterly_estimate": 0.0,
        "quarterly_estimates": [0.0, 0.0, 0.0, 0.0],
    }
