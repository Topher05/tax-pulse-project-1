import { z } from "zod";

import type { AuditEntryWriter } from "../../../auditEntryRepository.js";
import { ProblemHttpError, type ProblemDetails } from "../../../errors.js";
import type { AuthenticatedPrincipal, UserRole } from "../../../authTypes.js";
import { roleNameEnum } from "../../../shared/database/schema.js";
import type { TaxPlanCycle } from "../../../features/taxPlanCycle/taxPlanCycle.js";
import type { ActionItemCreatedEventInput } from "../../../features/taxPlanCycle/infrastructure/cloudEvents/actionItemCreated/index.js";
import type { TaxPlanCycleTransitionController } from "../../../features/taxPlanCycle/controllers/transitionController.js";
import {
  emitObservabilityEvent,
  cloudWatchObservabilityProvider,
  type CloudWatchContext,
  type StructuredLogger,
} from "../../cloud-logger/observability.js";
export { presentToClientHandler } from "./runtime.js";
/*
  CL, This lambda ONLY allows and should be triggered on Review => Client Approval transition meaning
// 1. Sender MUST be firm admin
// 2. This cannot be a send back to modelling call
*/

export interface PresentToClientApiGatewayAuthorizerContext {
  tenantId?: string;
  tenant_id?: string;
  userId?: string;
  sub?: string;
  principalId?: string;
  role?: string;
  permissions?: string | string[];
  claims?: Record<string, unknown>;
}

export interface PresentToClientApiGatewayRequestContext {
  authorizer?: PresentToClientApiGatewayAuthorizerContext | null;
}

export interface PresentToClientLambdaRequest {
  body?: string | null;
  headers?: Record<string, string | undefined>;
  pathParameters?: Record<string, string | undefined>;
  requestContext?: PresentToClientApiGatewayRequestContext;
}

export interface PresentToClientLambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export interface PresentToClientRequestPrincipal extends AuthenticatedPrincipal {
  permissions: string[];
}

export interface CreatePresentToClientLambdaHandlerOptions {
  controller: Pick<TaxPlanCycleTransitionController, "transition" | "findByCaseId">;
  auditEntryWriter: AuditEntryWriter;
  auditLogger?: Pick<Console, "info">;
  telemetryLogger?: StructuredLogger;
}

const jsonHeaders = {
  "content-type": "application/json",
} as const;

const problemHeaders = {
  "content-type": "application/problem+json",
} as const;

const presentToClientBodySchema = z.strictObject({
  action_item: z.strictObject({
    description: z.string().min(1),
    deadline: z.iso.date(),
    completed: z.boolean().optional(),
  }),
});

const transitionPathSchema = z.object({
  caseId: z.uuid(),
});

function toValidationIssue(issue: z.ZodIssue): {
  path: Array<string | number>;
  message: string;
  code: string;
} {
  return {
    path: issue.path.map((segment) => (typeof segment === "number" ? segment : String(segment))),
    message: issue.message,
    code: issue.code,
  };
}

function problemDetailsToResponse(
  problem: ProblemDetails | ProblemHttpError,
): PresentToClientLambdaResponse {
  const normalizedProblem =
    problem instanceof ProblemHttpError
      ? {
          type: problem.type,
          title: problem.title,
          status: problem.status,
          detail: problem.detail,
          ...problem.extensions,
        }
      : problem;

  return {
    statusCode: normalizedProblem.status,
    headers: {
      ...problemHeaders,
    },
    body: JSON.stringify(normalizedProblem),
  };
}

function jsonResponse(statusCode: number, body: unknown): PresentToClientLambdaResponse {
  return {
    statusCode,
    headers: {
      ...jsonHeaders,
    },
    body: JSON.stringify(body),
  };
}

function parseProblem(error: unknown): ProblemDetails {
  if (error instanceof ProblemHttpError) {
    return {
      type: error.type,
      title: error.title,
      status: error.status,
      detail: error.detail,
      ...error.extensions,
    };
  }

  return {
    type: "about:blank",
    title: "Internal Server Error",
    status: 500,
    detail: "An unexpected error occurred.",
  };
}

function authenticationRequired(): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/authentication-required",
    title: "Authentication Required",
    status: 401,
    detail: "A valid access context is required.",
  });
}

function buildValidationProblem(
  detail: string,
  issues: Array<{ path: Array<string | number>; message: string; code: string }>,
): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/validation-error",
    title: "Validation Error",
    status: 400,
    detail,
    extensions: {
      code: "VALIDATION_ERROR",
      issues,
    },
  });
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && roleNameEnum.enumValues.includes(value as UserRole);
}

function readPermissions(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((permission) => readString(permission))
      .filter((permission): permission is string => permission !== null);
  }

  const permissionString = readString(value);

  if (!permissionString) {
    return [];
  }

  return permissionString
    .split(",")
    .map((permission) => permission.trim())
    .filter((permission) => permission.length > 0);
}

function getAuthorizerSource(
  authorizer: PresentToClientApiGatewayAuthorizerContext | null | undefined,
): Record<string, unknown> | null {
  if (!authorizer || typeof authorizer !== "object") {
    return null;
  }

  if (authorizer.claims && typeof authorizer.claims === "object") {
    return authorizer.claims as Record<string, unknown>;
  }

  return authorizer as Record<string, unknown>;
}

function toPrincipal(
  authorizer: PresentToClientApiGatewayAuthorizerContext | null | undefined,
): PresentToClientRequestPrincipal | null {
  const source = getAuthorizerSource(authorizer);

  if (!source) {
    return null;
  }

  const tenantId =
    readString(source.tenantId) ??
    readString(source.tenant_id) ??
    readString(source["tenant-id"]);
  const userId =
    readString(source.userId) ??
    readString(source.sub) ??
    readString(source.principalId);
  const role = readString(source.role);

  if (!tenantId || !userId || !role || !isUserRole(role)) {
    return null;
  }

  return {
    tenantId,
    userId,
    role,
    permissions: readPermissions(source.permissions),
  };
}

function isTransitionAuthorized(
  currentStage: TaxPlanCycle["stage"],
  principal: PresentToClientRequestPrincipal,
): boolean {
  if (currentStage === "Review") {
    return principal.role === "Firm Admin";
  }

  if (currentStage === "Client Approval") {
    return principal.role === "Firm Admin";
  }

  return false;
}

function parseRequestBody(
  body: string | null | undefined,
): { success: true; data: unknown } | { success: false; error: ProblemHttpError } {
  if (body === undefined || body === null || body.trim().length === 0) {
    return { success: true, data: {} };
  }

  try {
    return { success: true, data: JSON.parse(body) as unknown };
  } catch {
    return {
      success: false,
      error: buildValidationProblem("Transition request failed validation.", [
        {
          path: ["body"],
          message: "Request body must be valid JSON.",
          code: "invalid_json",
        },
      ]),
    };
  }
}

async function writeDeniedTransitionAttempt(
  auditLogger: Pick<Console, "info">,
  auditEntryWriter: AuditEntryWriter,
  input: {
    caseId: string;
    actor: string;
    action: string;
    outcome: "403" | "422";
  },
): Promise<void> {
  const occurredAt = new Date();

  auditLogger.info({
    case_id: input.caseId,
    actor: input.actor,
    action: input.action,
    outcome: input.outcome,
    occurred_at: occurredAt.toISOString(),
  });

  await auditEntryWriter.record({
    caseId: input.caseId,
    actor: input.actor,
    action: input.action,
    outcome: input.outcome,
    occurredAt,
  });
}

async function handlePresentToClientRequest(input: {
  event: PresentToClientLambdaRequest;
  controller: Pick<TaxPlanCycleTransitionController, "transition" | "findByCaseId">;
  auditEntryWriter: AuditEntryWriter;
  auditLogger: Pick<Console, "info">;
  telemetryLogger: StructuredLogger;
}): Promise<PresentToClientLambdaResponse> {
  // API Gateway owns admission and auth; this Lambda only adapts the request
  // into the shared transition use case and enforces the feature boundary.
  const startedAt = Date.now();
  const requestContext: CloudWatchContext = {
    service: "core-case-service",
    layer: "lambda",
    operation: "present-to-client",
    route: "/v1/tax-plan-cycles/{caseId}/present-to-client",
    method: "POST",
    ...cloudWatchObservabilityProvider(input.event.headers),
  };
  emitObservabilityEvent(input.telemetryLogger, "info", "present-to-client lambda request received", {
    ...requestContext,
    metric_name: "tax_plan_cycle.lambda.request.count",
    metric_value: 1,
    metric_unit: "Count",
  });

  const parsedParams = transitionPathSchema.safeParse(input.event.pathParameters ?? {});
  const requestBody = parseRequestBody(input.event.body);

  if (!requestBody.success) {
    emitObservabilityEvent(input.telemetryLogger, "warn", "present-to-client lambda request rejected", {
      ...requestContext,
      outcome: "validation_error",
      status_code: requestBody.error.status,
      metric_name: "tax_plan_cycle.lambda.request.count",
      metric_value: 1,
      metric_unit: "Count",
    });
    return problemDetailsToResponse(requestBody.error);
  }

  const parsedBody = presentToClientBodySchema.safeParse(requestBody.data);

  if (!parsedParams.success || !parsedBody.success) {
    const issues = [
      ...(parsedParams.success ? [] : parsedParams.error.issues.map(toValidationIssue)),
      ...(parsedBody.success ? [] : parsedBody.error.issues.map(toValidationIssue)),
    ];

    emitObservabilityEvent(input.telemetryLogger, "warn", "present-to-client lambda request rejected", {
      ...requestContext,
      outcome: "validation_error",
      status_code: 400,
      metric_name: "tax_plan_cycle.lambda.request.count",
      metric_value: 1,
      metric_unit: "Count",
    });

    return problemDetailsToResponse(
      buildValidationProblem("Transition request failed validation.", issues),
    );
  }

  const principal = toPrincipal(input.event.requestContext?.authorizer);

  if (!principal) {
    emitObservabilityEvent(input.telemetryLogger, "warn", "present-to-client lambda authentication failed", {
      ...requestContext,
      outcome: "unauthorized",
      status_code: 401,
      metric_name: "tax_plan_cycle.lambda.request.count",
      metric_value: 1,
      metric_unit: "Count",
    });
    return problemDetailsToResponse(authenticationRequired());
  }

  const cycle = await input.controller.findByCaseId({
    tenantId: principal.tenantId,
    caseId: parsedParams.data.caseId,
  });

  if (cycle === null) {
    emitObservabilityEvent(input.telemetryLogger, "warn", "present-to-client lambda request could not find cycle", {
      ...requestContext,
      tenant_id: principal.tenantId,
      case_id: parsedParams.data.caseId,
      outcome: "not_found",
      status_code: 404,
      metric_name: "tax_plan_cycle.lambda.request.count",
      metric_value: 1,
      metric_unit: "Count",
    });
    return problemDetailsToResponse(
      new ProblemHttpError({
        type: "https://taxpulse.example/problems/tax-plan-cycle-not-found",
        title: "Tax Plan Cycle Not Found",
        status: 404,
        detail: "No tax plan cycle was found for the requested case ID.",
      }),
    );
  }

  const action = `transition ${cycle.stage} -> Client Approval`;

  if (!isTransitionAuthorized(cycle.stage, principal)) {
    emitObservabilityEvent(input.telemetryLogger, "warn", "present-to-client lambda request denied", {
      ...requestContext,
      tenant_id: principal.tenantId,
      case_id: parsedParams.data.caseId,
      outcome: "forbidden",
      status_code: 403,
      metric_name: "tax_plan_cycle.lambda.request.count",
      metric_value: 1,
      metric_unit: "Count",
    });

    await writeDeniedTransitionAttempt(input.auditLogger, input.auditEntryWriter, {
      caseId: parsedParams.data.caseId,
      actor: principal.userId,
      action,
      outcome: "403",
    });

    return problemDetailsToResponse(
      new ProblemHttpError({
        type: "https://taxpulse.example/problems/forbidden-transition",
        title: "Forbidden",
        status: 403,
        detail: "The current role is not authorized to perform this transition.",
      }),
    );
  }

  if (cycle.stage === "Client Approval") {
    emitObservabilityEvent(input.telemetryLogger, "warn", "present-to-client lambda request denied", {
      ...requestContext,
      tenant_id: principal.tenantId,
      case_id: parsedParams.data.caseId,
      outcome: "invalid_transition",
      status_code: 422,
      metric_name: "tax_plan_cycle.lambda.request.count",
      metric_value: 1,
      metric_unit: "Count",
    });

    await writeDeniedTransitionAttempt(input.auditLogger, input.auditEntryWriter, {
      caseId: parsedParams.data.caseId,
      actor: principal.userId,
      action,
      outcome: "422",
    });

    return problemDetailsToResponse(
      new ProblemHttpError({
        type: "https://taxpulse.example/problems/invalid-transition",
        title: "Invalid Transition",
        status: 422,
        detail: "The requested stage transition is not legal.",
      }),
    );
  }

  const transitioned = await input.controller.transition({
    tenantId: principal.tenantId,
    caseId: parsedParams.data.caseId,
    fromStage: cycle.stage,
    toStage: "Client Approval",
    actor: principal.userId,
    actionItem: parsedBody.data.action_item as ActionItemCreatedEventInput,
  });

  if (transitioned === null) {
    emitObservabilityEvent(input.telemetryLogger, "warn", "present-to-client lambda request could not transition cycle", {
      ...requestContext,
      tenant_id: principal.tenantId,
      case_id: parsedParams.data.caseId,
      outcome: "not_found",
      status_code: 404,
      metric_name: "tax_plan_cycle.lambda.request.count",
      metric_value: 1,
      metric_unit: "Count",
    });
    return problemDetailsToResponse(
      new ProblemHttpError({
        type: "https://taxpulse.example/problems/tax-plan-cycle-not-found",
        title: "Tax Plan Cycle Not Found",
        status: 404,
        detail: "No tax plan cycle was found for the requested case ID.",
      }),
    );
  }

  const durationMs = Date.now() - startedAt;
  emitObservabilityEvent(input.telemetryLogger, "info", "present-to-client lambda request completed", {
    ...requestContext,
    tenant_id: principal.tenantId,
    case_id: parsedParams.data.caseId,
    outcome: "success",
    status_code: 200,
    duration_ms: durationMs,
    metric_name: "tax_plan_cycle.lambda.request.duration_ms",
    metric_value: durationMs,
    metric_unit: "Milliseconds",
  });

  return jsonResponse(200, transitioned);
}

export function buildPresentToClientLambdaRequest(input: {
  tenantId: string;
  caseId: string;
  userId: string;
  role: UserRole;
  actionItem: ActionItemCreatedEventInput;
  permissions?: string[];
}): PresentToClientLambdaRequest {
  return {
    body: JSON.stringify({
      action_item: input.actionItem,
    }),
    pathParameters: {
      caseId: input.caseId,
    },
    requestContext: {
      authorizer: {
        tenantId: input.tenantId,
        userId: input.userId,
        role: input.role,
        permissions: input.permissions ?? [],
      },
    },
  };
}

export function createPresentToClientLambdaHandler(
  options: CreatePresentToClientLambdaHandlerOptions,
): (event: PresentToClientLambdaRequest) => Promise<PresentToClientLambdaResponse> {
  const auditLogger = options.auditLogger ?? console;
  const telemetryLogger = options.telemetryLogger ?? console;

  return async (event) => {
    try {
      return await handlePresentToClientRequest({
        event,
        controller: options.controller,
        auditEntryWriter: options.auditEntryWriter,
        auditLogger,
        telemetryLogger,
      });
    } catch (error) {
      return problemDetailsToResponse(parseProblem(error));
    }
  };
}
