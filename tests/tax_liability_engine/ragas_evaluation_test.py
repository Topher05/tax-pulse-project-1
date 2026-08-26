from __future__ import annotations

import math

import pytest

from python.retrieval import evaluation_validation


def test_load_thresholds_requires_both_quality_metrics() -> None:
    with pytest.raises(RuntimeError, match="exactly context_relevance and faithfulness"):
        evaluation_validation.load_thresholds(
            {"metrics": [{"name": "context_relevance", "minimumMean": 0.8}]}
        )


def test_load_thresholds_rejects_duplicate_metric_names() -> None:
    with pytest.raises(RuntimeError, match="must be unique"):
        evaluation_validation.load_thresholds(
            {
                "metrics": [
                    {"name": "context_relevance", "minimumMean": 0.8},
                    {"name": "context_relevance", "minimumMean": 0.9},
                    {"name": "faithfulness", "minimumMean": 0.8},
                ]
            }
        )


@pytest.mark.parametrize(
    "value",
    [math.nan, math.inf, -math.inf, -0.01, 1.01, "not-a-number"],
)
def test_numeric_value_rejects_malformed_metric_scores(value: object) -> None:
    with pytest.raises(RuntimeError):
        evaluation_validation.numeric_value(value, "metric")


@pytest.mark.parametrize("value", [0, 0.8, 1, "0.85"])
def test_numeric_value_accepts_finite_unit_interval_scores(value: object) -> None:
    assert 0 <= evaluation_validation.numeric_value(value, "metric") <= 1
