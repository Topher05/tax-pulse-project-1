"""Offline RAGAS evaluation for the synthetic AI-Assist corpus."""

from __future__ import annotations

import asyncio
import json
import math
import os
import sys
from collections.abc import Mapping
from datetime import UTC, datetime
from pathlib import Path
from typing import cast

from openai import AsyncOpenAI
from ragas.llms import llm_factory
from ragas.metrics.collections import ContextRelevance, Faithfulness

from python.retrieval.evaluation_validation import (
    environment_path,
    load_thresholds,
    numeric_value,
)

INPUT_PATH = Path("artifacts/assist-evaluation/ragas-input.json")
THRESHOLDS_PATH = Path("data/corpus/evaluation/thresholds.json")
REPORT_PATH = Path("artifacts/assist-evaluation/ragas-report.json")
DEFAULT_MODEL = "gpt-4o-mini"
DEFAULT_TEMPERATURE = 0


async def main() -> int:
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is required.")

    model = os.environ.get("RAGAS_EVALUATOR_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL
    temperature = float(os.environ.get("RAGAS_EVALUATOR_TEMPERATURE", str(DEFAULT_TEMPERATURE)))

    input_path = environment_path("ASSIST_RAGAS_INPUT_PATH", INPUT_PATH)
    thresholds_path = environment_path(
        "ASSIST_EVALUATION_THRESHOLDS_PATH",
        THRESHOLDS_PATH,
    )
    payload = json.loads(input_path.read_text(encoding="utf-8"))
    thresholds = load_thresholds(json.loads(thresholds_path.read_text(encoding="utf-8")))
    llm = llm_factory(model, client=AsyncOpenAI(api_key=api_key), temperature=temperature)

    if not isinstance(payload, dict):
        raise RuntimeError("Collected ragas input must be a JSON object.")
    samples = cast(list[Mapping[str, object]], payload.get("samples", []))
    if not isinstance(samples, list):
        raise RuntimeError("Collected ragas input must contain a samples array.")

    context_relevance_metric = ContextRelevance(llm=llm)
    faithfulness_metric = Faithfulness(llm=llm)

    scored_questions: list[dict[str, object]] = []
    context_scores: list[float] = []
    faithfulness_scores: list[float] = []

    for sample in samples:
        scored_question = await score_sample(
            sample,
            context_relevance_metric=context_relevance_metric,
            faithfulness_metric=faithfulness_metric,
        )
        scored_questions.append(scored_question)
        context_metric = cast(dict[str, object], scored_question["contextRelevance"])
        faithfulness_metric_score = cast(dict[str, object], scored_question["faithfulness"])
        context_scores.append(cast(float, context_metric["value"]))
        faithfulness_scores.append(cast(float, faithfulness_metric_score["value"]))

    aggregate_context_relevance = mean(context_scores)
    aggregate_faithfulness = mean(faithfulness_scores)

    threshold_map = {metric.name: metric.minimum_mean for metric in thresholds.metrics}
    report = {
        "generatedAt": current_utc_timestamp(),
        "evaluator": {
            "model": model,
            "temperature": temperature,
        },
        "thresholds": {
            "metrics": [
                {"name": metric.name, "minimumMean": metric.minimum_mean}
                for metric in thresholds.metrics
            ]
        },
        "questionCount": len(scored_questions),
        "questions": scored_questions,
        "aggregate": {
            "contextRelevance": aggregate_context_relevance,
            "faithfulness": aggregate_faithfulness,
        },
        "pass": (
            aggregate_context_relevance >= threshold_map["context_relevance"]
            and aggregate_faithfulness >= threshold_map["faithfulness"]
        ),
    }

    ensure_gate_inputs(report, scored_questions)
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    if not report["pass"]:
        raise RuntimeError(
            "RAGAS gate failed: aggregate means did not meet the configured thresholds."
        )

    print(f"PASS RAGAS evaluation wrote {len(scored_questions)} question score(s) to {REPORT_PATH}")
    return 0


async def score_sample(
    sample: Mapping[str, object],
    *,
    context_relevance_metric: ContextRelevance,
    faithfulness_metric: Faithfulness,
) -> dict[str, object]:
    user_input = require_string(sample.get("userInput"), "sample.userInput")
    response = require_string(sample.get("response"), "sample.response")
    retrieved_contexts = require_string_list(
        sample.get("retrievedContexts"), "sample.retrievedContexts"
    )
    retrieved_chunks = cast(list[Mapping[str, object]], sample.get("retrievedChunks", []))
    citations = cast(list[Mapping[str, object]], sample.get("citations", []))

    if not retrieved_contexts:
        raise RuntimeError(f"{user_input}: missing retrieved contexts.")

    context_result = await context_relevance_metric.ascore(
        user_input=user_input,
        retrieved_contexts=retrieved_contexts,
    )
    faithfulness_result = await faithfulness_metric.ascore(
        user_input=user_input,
        response=response,
        retrieved_contexts=retrieved_contexts,
    )

    context_value = numeric_value(
        context_result.value,
        f"{sample.get('id', 'unknown')} context relevance",
    )
    faithfulness_value = numeric_value(
        faithfulness_result.value,
        f"{sample.get('id', 'unknown')} faithfulness",
    )

    return {
        "id": require_string(sample.get("id"), "sample.id"),
        "userInput": user_input,
        "response": response,
        "retrievedChunkIds": [
            require_string(chunk.get("chunkId"), "sample.retrievedChunks.chunkId")
            for chunk in retrieved_chunks
        ],
        "citations": [citation for citation in citations if isinstance(citation, dict)],
        "contextRelevance": {
            "value": context_value,
            "reason": getattr(context_result, "reason", None),
        },
        "faithfulness": {
            "value": faithfulness_value,
            "reason": getattr(faithfulness_result, "reason", None),
        },
    }


def ensure_gate_inputs(
    report: dict[str, object],
    scores: list[dict[str, object]],
) -> None:
    if len(scores) == 0:
        raise RuntimeError("No evaluation samples were scored.")

    for score in scores:
        retrieved_chunk_ids = cast(list[str], score["retrievedChunkIds"])
        if not retrieved_chunk_ids:
            raise RuntimeError(f"{score['id']}: missing retrieved chunk IDs.")

        for metric_name in ("contextRelevance", "faithfulness"):
            metric = cast(dict[str, object], score[metric_name])
            value = metric["value"]
            if not isinstance(value, (int, float)) or not math.isfinite(value):
                raise RuntimeError(f"{score['id']}: {metric_name} did not return a numeric score.")

    aggregate = cast(dict[str, float], report["aggregate"])
    if not isinstance(aggregate["contextRelevance"], (int, float)):
        raise RuntimeError("Aggregate context relevance must be numeric.")
    if not isinstance(aggregate["faithfulness"], (int, float)):
        raise RuntimeError("Aggregate faithfulness must be numeric.")


def require_string(value: object, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise RuntimeError(f"{label} must be a non-empty string.")
    return value.strip()


def require_string_list(value: object, label: str) -> list[str]:
    if not isinstance(value, list):
        raise RuntimeError(f"{label} must be a list of strings.")
    return [require_string(item, label) for item in value]


def mean(values: list[float]) -> float:
    if not values:
        raise RuntimeError("Cannot compute a mean from zero values.")
    return sum(values) / len(values)


def current_utc_timestamp() -> str:
    return datetime.now(UTC).isoformat()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
