from decimal import Decimal

import pytest
from pydantic import ValidationError
from tax_liability_engine import (
    TaxCalculationRequest,
    TaxCalculationResult,
    calculate_tax,
)
from tax_liability_engine.tax_calculation import derive_quarterly_estimates


def test_tax_calculation_request_accepts_required_fields() -> None:
    model = TaxCalculationRequest(
        income=Decimal("100000"),
        deductions=Decimal("12000"),
        state="CA",
        filing_status="single",
    )

    assert model.income == Decimal("100000")
    assert model.deductions == Decimal("12000")
    assert model.withholding == 0
    assert model.state == "CA"
    assert model.filing_status == "single"


def test_tax_calculation_request_accepts_withholding() -> None:
    model = TaxCalculationRequest(
        income=Decimal("100000"),
        deductions=Decimal("12000"),
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
    ("field", "value", "message"),
    [
        ("income", -1, "Income and deductions cannot be negative."),
        ("deductions", -1, "Income and deductions cannot be negative."),
        ("withholding", -1, "Input should be greater than or equal to 0"),
    ],
)
def test_tax_calculation_request_rejects_negative_amounts(
    field: str,
    value: float,
    message: str,
) -> None:
    request = {
        "income": 100000,
        "deductions": 12000,
        "withholding": 24500,
        "state": "CA",
        "filing_status": "single",
    }
    request[field] = value

    with pytest.raises(ValidationError) as exc_info:
        TaxCalculationRequest.model_validate(request)

    assert field in str(exc_info.value)
    assert message in str(exc_info.value)


def test_tax_calculation_result_carries_required_outputs() -> None:
    result = TaxCalculationResult(
        income=Decimal("100000"),
        deductions=Decimal("12000"),
        state="CA",
        filing_status="single",
        taxable_income=Decimal("88000"),
        federal_liability=Decimal("14072.00"),
        state_liability=Decimal("4622.64"),
        total_liability=Decimal("18694.64"),
        effective_rate=Decimal("0.2124"),
        marginal_rate=Decimal("0.3130"),
    )

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
async def test_calculate_tax_returns_zero_liability_for_zero_income() -> None:
    result = await calculate_tax(
        TaxCalculationRequest(
            income=Decimal("0"),
            deductions=Decimal("0"),
            state="CA",
            filing_status="single",
        )
    )

    assert result.taxable_income == Decimal("0")
    assert result.federal_liability == Decimal("0.00")
    assert result.state_liability == Decimal("0.00")
    assert result.total_liability == Decimal("0.00")
    assert result.effective_rate == Decimal("0.0000")
    assert result.marginal_rate == Decimal("0.0000")


@pytest.mark.parametrize(
    ("income", "expected_federal_liability"),
    [
        (Decimal("12400"), Decimal("1240.00")),
        (Decimal("50400"), Decimal("5800.00")),
    ],
)
@pytest.mark.asyncio
async def test_calculate_tax_handles_income_at_federal_bracket_boundaries(
    income: Decimal,
    expected_federal_liability: Decimal,
) -> None:
    result = await calculate_tax(
        TaxCalculationRequest(
            income=income,
            deductions=Decimal("0"),
            state="CA",
            filing_status="single",
        )
    )

    assert result.taxable_income == income
    assert result.federal_liability == expected_federal_liability


@pytest.mark.parametrize(
    ("income", "deductions"),
    [
        (Decimal("1000"), Decimal("1000")),
        (Decimal("50000"), Decimal("60000")),
    ],
)
@pytest.mark.asyncio
async def test_calculate_tax_returns_zero_liability_when_deductions_meet_or_exceed_income(
    income: Decimal,
    deductions: Decimal,
) -> None:
    result = await calculate_tax(
        TaxCalculationRequest(
            income=income,
            deductions=deductions,
            state="CA",
            filing_status="single",
        )
    )

    assert result.taxable_income == Decimal("0")
    assert result.federal_liability == Decimal("0.00")
    assert result.state_liability == Decimal("0.00")
    assert result.total_liability == Decimal("0.00")


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


@pytest.mark.asyncio
async def test_calculate_tax_uses_the_next_bracket_at_an_exact_threshold() -> None:
    result = await calculate_tax(
        TaxCalculationRequest(
            income=Decimal("12400"),
            deductions=Decimal("0"),
            state="CA",
            filing_status="single",
        )
    )

    assert result.taxable_income == Decimal("12400")
    assert result.federal_liability == Decimal("1240.00")
    assert result.state_liability == Decimal("137.21")
    assert result.total_liability == Decimal("1377.21")
    assert result.effective_rate == Decimal("0.1111")
    assert result.marginal_rate == Decimal("0.1400")
