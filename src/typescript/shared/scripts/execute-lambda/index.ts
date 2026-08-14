import { z } from "zod";

import type { AuditEntryWriter } from "../../../auditEntryRepository.js";
import { ProblemHttpError, type ProblemDetails } from "../../../errors.js";
import type { AuthenticatedPrincipal, UserRole } from "../../../authTypes.js";
import { roleNameEnum } from "../../../shared/database/schema.js";
import type { TaxPlanCycle } from "../../../features/taxPlanCycle/taxPlanCycle.js";
import type { TaxPlanCycleTransitionController } from "../../../features/taxPlanCycle/controllers/transitionController.js";
import { executeHandler as runtimeExecuteHandler } from "./runtime.js";

export interface ExecuteApiGatewayAuthorizerContext {
  tenantId?: string;
  tenant_id?: string;
  userId?: string;
  sub?: string;
  principalId?: string;
  role?: string;
  permissions?: string | string[];
  claims?: Record<string, unknown>;
}

export interface ExecuteApiGatewayRequestContext {
  authorizer?: ExecuteApiGatewayAuthorizerContext | null;
}

export interface ExecuteLambdaRequest {
  body?: string | null;
  headers?: Record<string, string | undefined>;
  pathParameters?: Record<string, string | undefined>;
  requestContext?: ExecuteApiGatewayRequestContext;
}

export interface ExecuteLambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export interface ExecuteRequestPrincipal extends AuthenticatedPrincipal {
  permissions: string[];
}

export interface CreateExecuteLambdaHandlerOptions {
  controller: Pick<TaxPlanCycleTransitionController, "transition" | "findByCaseId">;
  auditEntryWriter: AuditEntryWriter;
  auditLogger?: Pick<Console, "info">;
}

const jsonHeaders = {
  "content-type": "application/json",
} as const;

const problemHeaders = {
  "content-type": "application/problem+json",
} as const;

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
): ExecuteLambdaResponse {
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

function jsonResponse(statusCode: number, body: unknown): ExecuteLambdaResponse {
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
  authorizer: ExecuteApiGatewayAuthorizerContext | null | undefined,
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
  authorizer: ExecuteApiGatewayAuthorizerContext | null | undefined,
): ExecuteRequestPrincipal | null {
  const source = getAuthorizerSource(authorizer);

  if (!source) {
    return null;
  }

  const tenantId =
    readString(source.tenantId) ??
    readString(source.tenant_id) ??
    readString(source["tenant-id"]);
  const userId = readString(source.userId) ?? readString(source.sub) ?? readString(source.principalId);
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
  principal: ExecuteRequestPrincipal,
): boolean {
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

async function handleExecuteRequest(input: {
  event: ExecuteLambdaRequest;
  controller: Pick<TaxPlanCycleTransitionController, "transition" | "findByCaseId">;
  auditEntryWriter: AuditEntryWriter;
  auditLogger: Pick<Console, "info">;
}): Promise<ExecuteLambdaResponse> {
  // API Gateway owns admission and auth for this delivery path; the Lambda
  // only adapts the proxy event into the Tax Plan Cycle transition use case.
  const parsedParams = transitionPathSchema.safeParse(input.event.pathParameters ?? {});
  const requestBody = parseRequestBody(input.event.body);

  if (!requestBody.success) {
    return problemDetailsToResponse(requestBody.error);
  }

  if (!parsedParams.success) {
    return problemDetailsToResponse(
      buildValidationProblem("Transition request failed validation.", [
        ...parsedParams.error.issues.map(toValidationIssue),
      ]),
    );
  }

  const principal = toPrincipal(input.event.requestContext?.authorizer);

  if (!principal) {
    return problemDetailsToResponse(authenticationRequired());
  }

  const cycle = await input.controller.findByCaseId({
    tenantId: principal.tenantId,
    caseId: parsedParams.data.caseId,
  });

  if (cycle === null) {
    return problemDetailsToResponse(
      new ProblemHttpError({
        type: "https://taxpulse.example/problems/tax-plan-cycle-not-found",
        title: "Tax Plan Cycle Not Found",
        status: 404,
        detail: "No tax plan cycle was found for the requested case ID.",
      }),
    );
  }

  const action = `transition ${cycle.stage} -> Executed`;

  if (cycle.stage !== "Client Approval") {
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

  if (!isTransitionAuthorized(cycle.stage, principal)) {
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

  const transitioned = await input.controller.transition({
    tenantId: principal.tenantId,
    caseId: parsedParams.data.caseId,
    fromStage: cycle.stage,
    toStage: "Executed",
    actor: principal.userId,
  });

  if (transitioned === null) {
    return problemDetailsToResponse(
      new ProblemHttpError({
        type: "https://taxpulse.example/problems/tax-plan-cycle-not-found",
        title: "Tax Plan Cycle Not Found",
        status: 404,
        detail: "No tax plan cycle was found for the requested case ID.",
      }),
    );
  }

  return jsonResponse(200, transitioned);
}

export function createExecuteLambdaHandler(options: CreateExecuteLambdaHandlerOptions) {
  const auditLogger = options.auditLogger ?? console;

  return async (event: ExecuteLambdaRequest) =>
    await handleExecuteRequest({
      event,
      controller: options.controller,
      auditEntryWriter: options.auditEntryWriter,
      auditLogger,
    });
}

export function serializeExecuteLambdaProblemResponse(error: unknown): ExecuteLambdaResponse {
  return problemDetailsToResponse(parseProblem(error));
}

export function serializeExecuteLambdaJsonResponse(
  statusCode: number,
  body: unknown,
): ExecuteLambdaResponse {
  return jsonResponse(statusCode, body);
}

export async function handler(
  event: ExecuteLambdaRequest,
): Promise<ExecuteLambdaResponse> {
  return await runtimeExecuteHandler(event);
}
