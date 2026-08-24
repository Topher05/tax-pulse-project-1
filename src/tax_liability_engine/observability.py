"""Request correlation and structured observability for the Tax Engine."""

from __future__ import annotations

import json
import logging
import time
import uuid
from collections.abc import Mapping

from fastapi import FastAPI, Request

_observability_logger = logging.getLogger("tax_liability_engine.observability")
_observability_logger.setLevel(logging.INFO)


def _read_header_value(
    headers: Mapping[str, str],
    header_name: str,
) -> str | None:
    value = headers.get(header_name)
    if value is None:
        return None

    normalized = value.strip()
    return normalized or None


def _normalize_hex(value: str | None, length: int) -> str | None:
    if value is None:
        return None

    normalized = value.strip().lower()
    if len(normalized) < length or not all(
        character in "0123456789abcdef" for character in normalized
    ):
        return None

    return normalized[:length]


def _build_traceparent(trace_id: str, span_id: str) -> str:
    return f"00-{trace_id}-{span_id}-01"


def resolve_request_id(headers: Mapping[str, str], fallback_request_id: str | None = None) -> str:
    request_id = (
        _read_header_value(headers, "x-request-id")
        or _read_header_value(headers, "x-amzn-requestid")
        or _read_header_value(headers, "x-amz-request-id")
        or (fallback_request_id.strip() if fallback_request_id else None)
    )
    return request_id or str(uuid.uuid4())


def resolve_trace_context(headers: Mapping[str, str]) -> dict[str, str]:
    traceparent = _read_header_value(headers, "traceparent")
    if traceparent:
        parts = traceparent.split("-")
        if len(parts) >= 4:
            trace_id = _normalize_hex(parts[1], 32)
            span_id = _normalize_hex(parts[2], 16)
            if trace_id and span_id:
                return {
                    "trace_id": trace_id,
                    "span_id": span_id,
                    "traceparent": _build_traceparent(trace_id, span_id),
                }

    x_amzn_trace_id = _read_header_value(headers, "x-amzn-trace-id")
    if x_amzn_trace_id:
        root = next(
            (
                part.split("=", maxsplit=1)[1].strip()
                for part in x_amzn_trace_id.split(";")
                if part.strip().startswith("Root=") and "=" in part
            ),
            None,
        )
        parent = next(
            (
                part.split("=", maxsplit=1)[1].strip()
                for part in x_amzn_trace_id.split(";")
                if part.strip().startswith("Parent=") and "=" in part
            ),
            None,
        )
        trace_id = _normalize_hex(root.replace("1-", "").replace("-", "") if root else None, 32)
        span_id = _normalize_hex(parent, 16)
        if trace_id and span_id:
            return {
                "trace_id": trace_id,
                "span_id": span_id,
                "traceparent": _build_traceparent(trace_id, span_id),
                "x_amzn_trace_id": x_amzn_trace_id,
            }

        return {"x_amzn_trace_id": x_amzn_trace_id}

    trace_id = uuid.uuid4().hex
    span_id = uuid.uuid4().hex[:16]
    return {
        "trace_id": trace_id,
        "span_id": span_id,
        "traceparent": _build_traceparent(trace_id, span_id),
    }


def install_observability_middleware(app: FastAPI) -> None:
    """Install request correlation and allowlisted JSON logging."""

    @app.middleware("http")
    async def observability_middleware(request: Request, call_next):
        request_id = resolve_request_id(request.headers, getattr(request.state, "request_id", None))
        request.state.request_id = request_id
        request.state.trace_context = resolve_trace_context(request.headers)

        started_at = time.perf_counter()
        trace_context = request.state.trace_context

        try:
            response = await call_next(request)
        except Exception as exc:
            if request.url.path != "/health":
                duration_ms = round((time.perf_counter() - started_at) * 1000)
                entry = {
                    "service": "tax-engine",
                    "operation": request.url.path,
                    "outcome": "error",
                    "request_id": request_id,
                    "trace_id": trace_context.get("trace_id"),
                    "span_id": trace_context.get("span_id"),
                    "traceparent": trace_context.get("traceparent"),
                    "x_amzn_trace_id": trace_context.get("x_amzn_trace_id"),
                    "method": request.method,
                    "status_code": 500,
                    "duration_ms": duration_ms,
                    "error_class": exc.__class__.__name__,
                }
                _observability_logger.info(
                    json.dumps(
                        {key: value for key, value in entry.items() if value is not None},
                        sort_keys=True,
                    )
                )
            raise

        response.headers["x-request-id"] = request_id

        if request.url.path == "/health":
            return response

        duration_ms = round((time.perf_counter() - started_at) * 1000)
        entry = {
            "service": "tax-engine",
            "operation": request.url.path,
            "outcome": "success" if response.status_code < 400 else "failed",
            "request_id": request_id,
            "trace_id": trace_context.get("trace_id"),
            "span_id": trace_context.get("span_id"),
            "traceparent": trace_context.get("traceparent"),
            "x_amzn_trace_id": trace_context.get("x_amzn_trace_id"),
            "method": request.method,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
        }
        _observability_logger.info(
            json.dumps(
                {key: value for key, value in entry.items() if value is not None},
                sort_keys=True,
            )
        )
        return response
