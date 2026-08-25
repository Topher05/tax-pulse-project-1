import { randomUUID } from "node:crypto";

export type StructuredLogger = {
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
};

export type LogLevel = "info" | "warn" | "error";

export interface TraceContext {
  request_id?: string;
  trace_id?: string;
  span_id?: string;
  traceparent?: string;
  x_amzn_trace_id?: string;
}

export interface CloudWatchContext {
  service: string;
  layer: string;
  operation: string;
  tenant_id?: string;
  case_id?: string;
  route?: string;
  method?: string;
  dependency?: string;
  outcome?: string;
  status_code?: number;
  duration_ms?: number;
  attempt?: number;
  metric_name?: string;
  metric_value?: number;
  metric_unit?: string;
  error?: string;
  error_class?: string;
  request_id?: string;
  trace_id?: string;
  span_id?: string;
  traceparent?: string;
  x_amzn_trace_id?: string;
  [key: string]: unknown;
}

function readHeaderValue(
  headers: Record<string, string | string[] | undefined>,
  headerName: string,
): string | undefined {
  const target = headerName.toLowerCase();

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== target) {
      continue;
    }

    if (Array.isArray(value)) {
      const [firstValue] = value;
      return typeof firstValue === "string" && firstValue.trim().length > 0
        ? firstValue.trim()
        : undefined;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
  }

  return undefined;
}

function normalizeHex(value: string | undefined, length: number): string | undefined {
  const trimmed = value?.trim().toLowerCase();

  if (!trimmed || !/^[0-9a-f]+$/.test(trimmed)) {
    return undefined;
  }

  if (trimmed.length < length) {
    return undefined;
  }

  return trimmed.slice(0, length);
}

function buildTraceparent(traceId: string, spanId: string): string {
  return `00-${traceId}-${spanId}-01`;
}

function parseTraceparent(traceparent: string): TraceContext {
  const parts = traceparent.split("-");

  if (parts.length < 4) {
    return { traceparent };
  }

  const traceId = normalizeHex(parts[1], 32);
  const spanId = normalizeHex(parts[2], 16);

  return {
    trace_id: traceId,
    span_id: spanId,
    traceparent: traceId && spanId ? buildTraceparent(traceId, spanId) : traceparent,
  };
}

function parseAmznTraceId(xAmznTraceId: string): TraceContext {
  const rootMatch = /(?:^|;)\s*Root=([^;]+)/.exec(xAmznTraceId);
  const parentMatch = /(?:^|;)\s*Parent=([^;]+)/.exec(xAmznTraceId);
  const rootValue = rootMatch?.[1]?.trim();
  const traceId = rootValue?.replace(/^1-/, "").replace(/-/g, "");
  const normalizedTraceId = normalizeHex(traceId, 32);
  const normalizedSpanId = normalizeHex(parentMatch?.[1], 16);

  return {
    x_amzn_trace_id: xAmznTraceId,
    trace_id: normalizedTraceId,
    span_id: normalizedSpanId,
    traceparent:
      normalizedTraceId && normalizedSpanId
        ? buildTraceparent(normalizedTraceId, normalizedSpanId)
        : xAmznTraceId,
  };
}

export function cloudWatchObservabilityProvider(
  headers: Record<string, string | string[] | undefined> | undefined,
  requestId?: string,
): Partial<TraceContext> {
  if (!headers) {
    return requestId ? { request_id: requestId.trim() } : {};
  }

  const resolvedRequestId =
    readHeaderValue(headers, "x-request-id") ??
    readHeaderValue(headers, "x-amzn-requestid") ??
    readHeaderValue(headers, "x-amz-request-id") ??
    requestId?.trim() ??
    randomUUID();
  const traceparent = readHeaderValue(headers, "traceparent");
  const xAmznTraceId = readHeaderValue(headers, "x-amzn-trace-id");

  const traceContext =
    traceparent !== undefined
      ? parseTraceparent(traceparent)
      : xAmznTraceId !== undefined
        ? parseAmznTraceId(xAmznTraceId)
        : {};

  return {
    request_id: resolvedRequestId,
    ...traceContext,
  };
}

function inferMetricUnit(metricName: string): string {
  if (metricName.endsWith(".duration_ms")) {
    return "Milliseconds";
  }

  return "Count";
}

function buildEmfMetadata(context: CloudWatchContext): Record<string, unknown> | undefined {
  if (context.metric_name === undefined || context.metric_value === undefined) {
    return undefined;
  }

  const dimensions = [[
    context.service,
    context.operation,
    context.outcome ?? "unknown",
  ]];

  return {
    _aws: {
      Timestamp: Date.now(),
      CloudWatchMetrics: [
        {
          Namespace: "TaxPulse",
          Dimensions: dimensions,
          Metrics: [
            {
              Name: context.metric_name,
              Unit: context.metric_unit ?? inferMetricUnit(context.metric_name),
            },
          ],
        },
      ],
    },
  };
}

export function emitObservabilityEvent(
  logger: StructuredLogger,
  level: LogLevel,
  message: string,
  context: CloudWatchContext,
): void {
  const entry = {
    telemetry: "observability",
    message,
    emitted_at: new Date().toISOString(),
    ...context,
    ...buildEmfMetadata(context),
  };

  if (level === "warn") {
    logger.warn(entry);
    return;
  }

  if (level === "error") {
    logger.error(entry);
    return;
  }

  logger.info(entry);
}

export function createTracePropagationHeaders(
  context: Partial<TraceContext> | undefined,
): Record<string, string> {
  if (!context) {
    return {};
  }

  const headers: Record<string, string> = {};

  if (context.request_id) {
    headers["x-request-id"] = context.request_id;
  }

  if (context.traceparent) {
    headers.traceparent = context.traceparent;
  } else if (context.trace_id && context.span_id) {
    headers.traceparent = buildTraceparent(context.trace_id, context.span_id);
  }

  if (context.x_amzn_trace_id) {
    headers["x-amzn-trace-id"] = context.x_amzn_trace_id;
  }

  return headers;
}

export function resolveRequestId(
  headers: Record<string, string | string[] | undefined> | undefined,
  fallbackRequestId?: string,
): string {
  const headerRequestId =
    headers !== undefined
      ? readHeaderValue(headers, "x-request-id") ??
        readHeaderValue(headers, "x-amzn-requestid") ??
        readHeaderValue(headers, "x-amz-request-id")
      : undefined;
  const resolvedRequestId = headerRequestId ?? fallbackRequestId?.trim();

  return resolvedRequestId && resolvedRequestId.length > 0
    ? resolvedRequestId
    : randomUUID();
}
