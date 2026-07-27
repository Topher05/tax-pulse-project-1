from decimal import Decimal

import pytest
from tax_liability_engine.tax_calculation import (
    ALLOWED_FILING_STATUSES,
    get_bracket_schedules,
)


@pytest.mark.parametrize("filing_status", sorted(ALLOWED_FILING_STATUSES))
def test_get_bracket_schedules_returns_federal_and_california_schedules(
    filing_status: str,
) -> None:
    federal, california = get_bracket_schedules(filing_status, "CA")

    assert len(federal) == 7
    assert federal[0].rate == Decimal("0.1000")
    assert federal[-1].upper_bound is None
    assert len(california) == 9
    assert california[0].rate == Decimal("0.0100")
    assert california[-1].upper_bound is None


def test_get_bracket_schedules_uses_filing_status_specific_bounds() -> None:
    single_federal, _ = get_bracket_schedules("single", "CA")
    joint_federal, _ = get_bracket_schedules("married_filing_jointly", "CA")

    assert single_federal[0].upper_bound == Decimal("12400")
    assert joint_federal[0].upper_bound == Decimal("24800")


def test_get_bracket_schedules_rejects_an_unsupported_state() -> None:
    with pytest.raises(ValueError, match="Unsupported state: NY"):
        get_bracket_schedules("single", "NY")
