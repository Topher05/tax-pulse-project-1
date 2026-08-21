from decimal import Decimal

import pytest

from tax_liability_engine.tax_calculation import TaxBracket, calculate_bracket_liability

BRACKETS = (
    TaxBracket(Decimal("0.10"), Decimal("0"), Decimal("10000")),
    TaxBracket(Decimal("0.20"), Decimal("10000"), Decimal("50000")),
    TaxBracket(Decimal("0.30"), Decimal("50000"), None),
)


def test_calculate_bracket_liability_accumulates_each_reached_bracket() -> None:
    liability = calculate_bracket_liability(Decimal("60000"), BRACKETS)

    assert liability == Decimal("12000.00")


def test_calculate_bracket_liability_at_boundary_uses_completed_lower_bracket() -> None:
    liability = calculate_bracket_liability(Decimal("10000"), BRACKETS)

    assert liability == Decimal("1000.00")


def test_calculate_bracket_liability_returns_zero_for_zero_taxable_income() -> None:
    liability = calculate_bracket_liability(Decimal("0"), BRACKETS)

    assert liability == Decimal("0.00")


def test_calculate_bracket_liability_is_deterministic() -> None:
    results = [calculate_bracket_liability(Decimal("60000"), BRACKETS) for _ in range(3)]

    assert results == [Decimal("12000.00")] * 3


def test_calculate_bracket_liability_rejects_negative_income() -> None:
    with pytest.raises(ValueError, match="Taxable income cannot be negative"):
        calculate_bracket_liability(Decimal("-1"), BRACKETS)
