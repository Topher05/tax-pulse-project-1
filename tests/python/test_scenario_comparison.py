import pytest
from pydantic import ValidationError
from tax_pulse_project_team_1 import (
    ScenarioComparisonRequest,
    ScenarioComparisonResult,
)

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
        total_tax=58500,
        delta_vs_baseline=-4500,
    )

    assert result.model_dump() == {
        "name": "Increase retirement contributions",
        "total_tax": 58500.0,
        "delta_vs_baseline": -4500.0,
    }
