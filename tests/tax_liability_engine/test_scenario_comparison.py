from decimal import Decimal
from unittest.mock import AsyncMock, call

import pytest
from pydantic import ValidationError
from tax_liability_engine import (
    ScenarioComparisonRequest,
    ScenarioComparisonResult,
    TaxCalculationResult,
    calculate_scenario_comparisons,
)
import tax_liability_engine.scenario_comparison as scenario_comparison

BASELINE = {
    "income": 250000,
    "deductions": 30000,
    "state": "CA",
    "filing_status": "married_filing_jointly",
}


def scenario(number: int) -> dict[str, object]:
    return {
        "name": f"Scenario {number}",
        "typed_figures": {**BASELINE, "income": BASELINE["income"] + number},
    }


def calculation_result(total_liability: str) -> TaxCalculationResult:
    total = Decimal(total_liability)
    return TaxCalculationResult(
        income=Decimal("1000"),
        deductions=Decimal("0"),
        state="CA",
        filing_status="single",
        taxable_income=Decimal("1000"),
        federal_liability=total,
        state_liability=Decimal("0"),
        total_liability=total,
        effective_rate=Decimal("0"),
        marginal_rate=Decimal("0"),
    )


@pytest.mark.parametrize("count", [2, 5])
def test_scenario_comparison_request_accepts_two_to_five_scenarios(count: int) -> None:
    request = ScenarioComparisonRequest.model_validate(
        {
            "baseline": BASELINE,
            "scenarios": [scenario(number) for number in range(1, count + 1)],
        }
    )

    assert len(request.scenarios) == count
    assert request.scenarios[0].typed_figures.filing_status == "married_filing_jointly"


@pytest.mark.parametrize("count", [0, 1, 6])
def test_scenario_comparison_request_rejects_out_of_range_scenario_counts(count: int) -> None:
    with pytest.raises(ValidationError) as exc_info:
        ScenarioComparisonRequest.model_validate(
            {
                "baseline": BASELINE,
                "scenarios": [scenario(number) for number in range(1, count + 1)],
            }
        )

    assert "scenarios" in str(exc_info.value)


def test_scenario_comparison_result_reports_total_tax_and_signed_delta() -> None:
    result = ScenarioComparisonResult(
        name="Increase retirement contributions",
        total_tax=Decimal(58500),
        delta_vs_baseline=Decimal(-4500),
    )

    assert result.model_dump() == {
        "name": "Increase retirement contributions",
        "total_tax": 58500.0,
        "delta_vs_baseline": -4500.0,
    }


@pytest.mark.asyncio
async def test_scenario_comparisons_reuse_baseline_calculation_and_preserve_input_order(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    request = ScenarioComparisonRequest.model_validate(
        {
            "baseline": BASELINE,
            "scenarios": [scenario(number) for number in range(1, 4)],
        }
    )
    calculator = AsyncMock(
        side_effect=[
            calculation_result("100"),
            calculation_result("130"),
            calculation_result("80"),
            calculation_result("100"),
        ]
    )
    monkeypatch.setattr(scenario_comparison, "calculate_tax", calculator)

    results = await calculate_scenario_comparisons(request)

    assert [result.model_dump() for result in results] == [
        {
            "name": "Scenario 1",
            "total_tax": Decimal("130.00"),
            "delta_vs_baseline": Decimal("30.00"),
        },
        {
            "name": "Scenario 2",
            "total_tax": Decimal("80.00"),
            "delta_vs_baseline": Decimal("-20.00"),
        },
        {
            "name": "Scenario 3",
            "total_tax": Decimal("100.00"),
            "delta_vs_baseline": Decimal("0.00"),
        },
    ]
    assert calculator.await_args_list == [
        call(request.baseline),
        call(request.scenarios[0].typed_figures),
        call(request.scenarios[1].typed_figures),
        call(request.scenarios[2].typed_figures),
    ]


@pytest.mark.asyncio
async def test_scenario_comparisons_preserve_a_one_cent_delta(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    request = ScenarioComparisonRequest.model_validate(
        {
            "baseline": BASELINE,
            "scenarios": [scenario(1), scenario(2)],
        }
    )
    calculator = AsyncMock(
        side_effect=[
            calculation_result("18694.64"),
            calculation_result("18694.65"),
            calculation_result("18694.64"),
        ]
    )
    monkeypatch.setattr(scenario_comparison, "calculate_tax", calculator)

    results = await calculate_scenario_comparisons(request)

    assert results[0].total_tax == Decimal("18694.65")
    assert results[0].delta_vs_baseline == Decimal("0.01")
    assert results[1].delta_vs_baseline == Decimal("0.00")


@pytest.mark.asyncio
async def test_scenario_comparisons_use_real_brackets_for_totals_and_deltas() -> None:
    baseline = {
        "income": 100000,
        "deductions": 12000,
        "state": "CA",
        "filing_status": "single",
    }
    request = ScenarioComparisonRequest.model_validate(
        {
            "baseline": baseline,
            "scenarios": [
                {
                    "name": "Increase deductions",
                    "typed_figures": {**baseline, "deductions": 20000},
                },
                {"name": "Keep baseline", "typed_figures": baseline},
                {
                    "name": "Increase income",
                    "typed_figures": {**baseline, "income": 110000},
                },
            ],
        }
    )

    results = await calculate_scenario_comparisons(request)

    assert [result.model_dump() for result in results] == [
        {
            "name": "Increase deductions",
            "total_tax": Decimal("16190.64"),
            "delta_vs_baseline": Decimal("-2504.00"),
        },
        {
            "name": "Keep baseline",
            "total_tax": Decimal("18694.64"),
            "delta_vs_baseline": Decimal("0.00"),
        },
        {
            "name": "Increase income",
            "total_tax": Decimal("21824.64"),
            "delta_vs_baseline": Decimal("3130.00"),
        },
    ]
