"""Tax calculation model definitions."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from types import MappingProxyType
from typing import Final, Literal, Mapping

from pydantic import BaseModel, field_validator

ALLOWED_FILING_STATUSES: Final[frozenset[str]] = frozenset(
    {
        "single",
        "married_filing_jointly",
        "married_filing_separately",
        "head_of_household",
        "qualifying_surviving_spouse",
    }
)


@dataclass(frozen=True, slots=True)
class TaxBracket:
    """An income range taxed at one marginal rate."""

    rate: Decimal
    lower_bound: Decimal
    upper_bound: Decimal | None

    def __post_init__(self) -> None:
        if self.rate < Decimal("0"):
            raise ValueError("Tax bracket rate cannot be negative.")
        if self.lower_bound < Decimal("0"):
            raise ValueError("Tax bracket lower bound cannot be negative.")
        if self.upper_bound is not None and self.upper_bound <= self.lower_bound:
            raise ValueError("Tax bracket upper bound must exceed its lower bound.")


def calculate_bracket_liability(
    taxable_income: Decimal,
    brackets: tuple[TaxBracket, ...],
) -> Decimal:
    """Calculate unrounded progressive tax liability for a bracket schedule."""

    if taxable_income < Decimal("0"):
        raise ValueError("Taxable income cannot be negative.")

    liability = Decimal("0")
    for bracket in brackets:
        capped_income = (
            taxable_income
            if bracket.upper_bound is None
            else min(taxable_income, bracket.upper_bound)
        )
        taxable_amount = max(capped_income - bracket.lower_bound, Decimal("0"))
        liability += taxable_amount * bracket.rate

    return liability


BracketSchedule = tuple[TaxBracket, ...]
BracketBounds = tuple[tuple[str, str | None], ...]


def _create_bracket_schedule(
    rates: tuple[str, ...],
    bounds: BracketBounds,
) -> BracketSchedule:
    return tuple(
        TaxBracket(
            rate=Decimal(rate),
            lower_bound=Decimal(lower_bound),
            upper_bound=Decimal(upper_bound) if upper_bound is not None else None,
        )
        for rate, (lower_bound, upper_bound) in zip(rates, bounds, strict=True)
    )


_FEDERAL_RATES: Final[tuple[str, ...]] = (
    "0.1000",
    "0.1200",
    "0.2200",
    "0.2400",
    "0.3200",
    "0.3500",
    "0.3700",
)
_CALIFORNIA_RATES: Final[tuple[str, ...]] = (
    "0.0100",
    "0.0200",
    "0.0400",
    "0.0600",
    "0.0800",
    "0.0930",
    "0.1030",
    "0.1130",
    "0.1230",
)

# Source: IRS Publication 505 (2026), Tax Rate Schedules.
FEDERAL_BRACKETS_BY_FILING_STATUS: Final[Mapping[str, BracketSchedule]] = MappingProxyType(
    {
        "single": _create_bracket_schedule(
            _FEDERAL_RATES,
            (
                ("0", "12400"),
                ("12400", "50400"),
                ("50400", "105700"),
                ("105700", "201775"),
                ("201775", "256225"),
                ("256225", "640600"),
                ("640600", None),
            ),
        ),
        "married_filing_jointly": _create_bracket_schedule(
            _FEDERAL_RATES,
            (
                ("0", "24800"),
                ("24800", "100800"),
                ("100800", "211400"),
                ("211400", "403550"),
                ("403550", "512450"),
                ("512450", "768700"),
                ("768700", None),
            ),
        ),
        "married_filing_separately": _create_bracket_schedule(
            _FEDERAL_RATES,
            (
                ("0", "12400"),
                ("12400", "50400"),
                ("50400", "105700"),
                ("105700", "201775"),
                ("201775", "256225"),
                ("256225", "384350"),
                ("384350", None),
            ),
        ),
        "head_of_household": _create_bracket_schedule(
            _FEDERAL_RATES,
            (
                ("0", "17700"),
                ("17700", "67450"),
                ("67450", "105700"),
                ("105700", "201750"),
                ("201750", "256200"),
                ("256200", "640600"),
                ("640600", None),
            ),
        ),
        "qualifying_surviving_spouse": _create_bracket_schedule(
            _FEDERAL_RATES,
            (
                ("0", "24800"),
                ("24800", "100800"),
                ("100800", "211400"),
                ("211400", "403550"),
                ("403550", "512450"),
                ("512450", "768700"),
                ("768700", None),
            ),
        ),
    }
)

# Source: California 2025 Form 540 tax rate schedules.
CALIFORNIA_BRACKETS_BY_FILING_STATUS: Final[Mapping[str, BracketSchedule]] = MappingProxyType(
    {
        "single": _create_bracket_schedule(
            _CALIFORNIA_RATES,
            (
                ("0", "11079"),
                ("11079", "26264"),
                ("26264", "41452"),
                ("41452", "57542"),
                ("57542", "72724"),
                ("72724", "371479"),
                ("371479", "445771"),
                ("445771", "742953"),
                ("742953", None),
            ),
        ),
        "married_filing_separately": _create_bracket_schedule(
            _CALIFORNIA_RATES,
            (
                ("0", "11079"),
                ("11079", "26264"),
                ("26264", "41452"),
                ("41452", "57542"),
                ("57542", "72724"),
                ("72724", "371479"),
                ("371479", "445771"),
                ("445771", "742953"),
                ("742953", None),
            ),
        ),
        "married_filing_jointly": _create_bracket_schedule(
            _CALIFORNIA_RATES,
            (
                ("0", "22158"),
                ("22158", "52528"),
                ("52528", "82904"),
                ("82904", "115084"),
                ("115084", "145448"),
                ("145448", "742958"),
                ("742958", "891542"),
                ("891542", "1485906"),
                ("1485906", None),
            ),
        ),
        "head_of_household": _create_bracket_schedule(
            _CALIFORNIA_RATES,
            (
                ("0", "22173"),
                ("22173", "52530"),
                ("52530", "67716"),
                ("67716", "83805"),
                ("83805", "98990"),
                ("98990", "505208"),
                ("505208", "606251"),
                ("606251", "1010417"),
                ("1010417", None),
            ),
        ),
        "qualifying_surviving_spouse": _create_bracket_schedule(
            _CALIFORNIA_RATES,
            (
                ("0", "22158"),
                ("22158", "52528"),
                ("52528", "82904"),
                ("82904", "115084"),
                ("115084", "145448"),
                ("145448", "742958"),
                ("742958", "891542"),
                ("891542", "1485906"),
                ("1485906", None),
            ),
        ),
    }
)

STATE_BRACKETS_BY_STATE_AND_FILING_STATUS: Final[Mapping[str, Mapping[str, BracketSchedule]]] = (
    MappingProxyType(
        {
            "CA": CALIFORNIA_BRACKETS_BY_FILING_STATUS,
        }
    )
)


def get_bracket_schedules(
    filing_status: str, state: str
) -> tuple[BracketSchedule, BracketSchedule]:
    """Return the federal and state bracket schedules for one calculation input."""

    try:
        federal_brackets = FEDERAL_BRACKETS_BY_FILING_STATUS[filing_status]
    except KeyError as error:
        raise ValueError(f"Unsupported filing status: {filing_status}.") from error

    try:
        state_brackets = STATE_BRACKETS_BY_STATE_AND_FILING_STATUS[state][filing_status]
    except KeyError as error:
        raise ValueError(f"Unsupported state: {state}.") from error

    return federal_brackets, state_brackets


class TaxCalculationRequest(BaseModel):
    """Request model for tax calculation inputs."""

    income: float
    deductions: float
    state: str
    filing_status: str

    @field_validator("filing_status")
    @classmethod
    def validate_filing_status(cls: type[TaxCalculationRequest], value: str) -> str:
        if value not in ALLOWED_FILING_STATUSES:
            allowed = ", ".join(sorted(ALLOWED_FILING_STATUSES))
            raise ValueError(f"Invalid filing status. Allowed values are: {allowed}.")
        return value


class TaxCalculationResult(BaseModel):
    """Placeholder result model for the async tax calculation seam."""

    income: float
    deductions: float
    state: str
    filing_status: str
    taxable_income: float
    estimated_tax: float
    currency: str = "USD"
    calculation_status: Literal["placeholder"] = "placeholder"


async def calculate_tax(request: TaxCalculationRequest) -> TaxCalculationResult:
    """Return a deterministic placeholder result for an async-ready calculation seam."""

    taxable_income = max(request.income - request.deductions, 0.0)
    estimated_tax = round(taxable_income * 0.1, 2)

    return TaxCalculationResult(
        income=request.income,
        deductions=request.deductions,
        state=request.state,
        filing_status=request.filing_status,
        taxable_income=taxable_income,
        estimated_tax=estimated_tax,
    )
