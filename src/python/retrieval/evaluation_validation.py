"""Dependency-free validation helpers for offline retrieval evaluation."""

from __future__ import annotations

import math
import os
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ThresholdMetric:
    name: str
    minimum_mean: float


@dataclass(frozen=True)
class EvaluationThresholds:
    metrics: list[ThresholdMetric]


def load_thresholds(raw: Mapping[str, object]) -> EvaluationThresholds:
    metrics = raw.get("metrics")
    if not isinstance(metrics, list):
        raise RuntimeError("thresholds.json must contain a metrics array.")

    threshold_metrics: list[ThresholdMetric] = []
    for metric in metrics:
        if not isinstance(metric, dict):
            raise RuntimeError("Each threshold metric must be an object.")
        name = require_string(metric.get("name"), "threshold.name")
        minimum_mean = numeric_value(metric.get("minimumMean"), f"{name}.minimumMean")
        threshold_metrics.append(ThresholdMetric(name=name, minimum_mean=minimum_mean))

    names = [metric.name for metric in threshold_metrics]
    if len(names) != len(set(names)):
        raise RuntimeError("Threshold metric names must be unique.")
    if set(names) != {"context_relevance", "faithfulness"}:
        raise RuntimeError("Thresholds must define exactly context_relevance and faithfulness.")

    return EvaluationThresholds(metrics=threshold_metrics)


def numeric_value(value: object, label: str) -> float:
    try:
        if isinstance(value, bool):
            raise TypeError(label)
        if isinstance(value, (int, float)):
            numeric = float(value)
        elif isinstance(value, str):
            numeric = float(value)
        else:
            raise TypeError(label)
    except (TypeError, ValueError) as error:
        raise RuntimeError(f"{label} must be numeric.") from error
    if not math.isfinite(numeric) or not 0 <= numeric <= 1:
        raise RuntimeError(f"{label} must be a finite number between 0 and 1.")
    return numeric


def environment_path(name: str, default: Path) -> Path:
    value = os.environ.get(name, "").strip()
    return Path(value) if value else default


def require_string(value: object, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise RuntimeError(f"{label} must be a non-empty string.")
    return value.strip()
