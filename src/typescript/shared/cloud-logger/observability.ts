export type StructuredLogger = {
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
};

export type LogLevel = "info" | "warn" | "error";

export interface CloudWatchContext {
  service: string;
  layer: string;
  operation: string;
  tenant_id?: string;
  case_id?: string;
  request_id?: string;
  trace_id?: string;
  trace_parent?: string;
  x_amzn_trace_id?: string;
  route?: string;
  method?: string;
  dependency?: string;
  metric_name?: string;
  metric_value?: number;
  metric_unit?: string;
  outcome?: string;
  status_code?: number;
  duration_ms?: number;
  attempt?: number;
  error?: string;
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

function parseTraceparent(traceparent: string): {
  trace_id?: string;
  trace_parent?: string;
} {
  const parts = traceparent.split("-");

  if (parts.length < 4) {
    return { trace_parent: traceparent };
  }

  const traceId = parts[1]?.trim();
  const spanId = parts[2]?.trim();

  return {
    trace_id: traceId && traceId.length > 0 ? traceId : undefined,
    trace_parent: spanId && spanId.length > 0 ? spanId : traceparent,
  };
}

function parseAmznTraceId(xAmznTraceId: string): {
  trace_id?: string;
  trace_parent?: string;
  x_amzn_trace_id: string;
} {
  const rootMatch = /(?:^|;)\s*Root=([^;]+)/.exec(xAmznTraceId);
  const parentMatch = /(?:^|;)\s*Parent=([^;]+)/.exec(xAmznTraceId);

  return {
    x_amzn_trace_id: xAmznTraceId,
    trace_id: rootMatch?.[1]?.trim(),
    trace_parent: parentMatch?.[1]?.trim(),
  };
}

export function cloudWatchObservabilityProvider(
  headers: Record<string, string | string[] | undefined> | undefined,
): Partial<CloudWatchContext> {
  if (!headers) {
    return {};
  }

  const requestId =
    readHeaderValue(headers, "x-request-id") ??
    readHeaderValue(headers, "x-amzn-requestid") ??
    readHeaderValue(headers, "x-amz-request-id");
  const traceparent = readHeaderValue(headers, "traceparent");
  const xAmznTraceId = readHeaderValue(headers, "x-amzn-trace-id");

  const traceContext =
    traceparent !== undefined
      ? parseTraceparent(traceparent)
      : xAmznTraceId !== undefined
        ? parseAmznTraceId(xAmznTraceId)
        : {};

  return {
    request_id: requestId,
    ...traceContext,
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
