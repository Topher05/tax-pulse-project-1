import { jwtVerify } from "jose";
import { z } from "zod";

import { ProblemHttpError, type ProblemDetails } from "../../errors.js";
import type { JwtConfig } from "../../authConfig.js";
import type { AuthenticatedPrincipal, UserRole } from "../../authTypes.js";
import { roleNameEnum } from "../../shared/database/schema.js";
import type { AuditEntryWriter } from "../../auditEntryRepository.js";
import type { TaxPlanCycle } from "./taxPlanCycle.js";
import type { ActionItemCreatedEventInput } from "./infrastructure/cloudEvents/actionItemCreated/index.js";
import { actionItemCreatedEventInputSchema } from "./infrastructure/cloudEvents/actionItemCreated/index.js";
import type { TaxPlanCycleTransitionController } from "./controllers/transitionController.js";

export interface LambdaHttpRequest {
  body?: string | null;
  headers?: Record<string, string | undefined>;
  pathParameters?: Record<string, string | undefined>;
}

export interface LambdaHttpResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export interface LambdaRequestContext {
  tenantId: string;
  userId: string;
  role: UserRole;
  permissions: string[];
}

export interface LambdaAuthenticator {
  authenticate(
    authorizationHeader: string | undefined,
  ): Promise<LambdaRequestContext | null>;
}

export interface CreateJwtLambdaAuthenticatorOptions {
  permissionsForRole?: Partial<Record<UserRole, ReadonlyArray<string>>>;
}

export interface CreatePresentToClientLambdaHandlerOptions {
  controller: Pick<TaxPlanCycleTransitionController, "transition" | "findByCaseId">;
  auditEntryWriter: AuditEntryWriter;
  auditLogger?: Pick<Console, "info">;
  authenticator: LambdaAuthenticator;
}

export interface CreateExecuteLambdaHandlerOptions {
  controller: Pick<TaxPlanCycleTransitionController, "transition" | "findByCaseId">;
  auditEntryWriter: AuditEntryWriter;
  auditLogger?: Pick<Console, "info">;
  authenticator: LambdaAuthenticator;
}

const lambdaHeaders = {
  "content-type": "application/json",
} as const;

const presentToClientBodySchema = z.strictObject({
  action_item: actionItemCreatedEventInputSchema,
});

const transitionPathSchema = z.object({
  caseId: z.uuid(),
});

function authenticationRequired(): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/authentication-required",
    title: "Authentication Required",
    status: 401,
    detail: "A valid access token is required.",
  });
}

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
): LambdaHttpResponse {
  const normalizedProblem =
    problem instanceof ProblemHttpError
      ? parseProblem(problem)
      : problem;

  return {
    statusCode: normalizedProblem.status,
    headers: {
      ...lambdaHeaders,
      "content-type": "application/problem+json",
    },
    body: JSON.stringify(normalizedProblem),
  };
}

function jsonResponse(statusCode: number, body: unknown): LambdaHttpResponse {
  return {
    statusCode,
    headers: {
      ...lambdaHeaders,
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

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && roleNameEnum.enumValues.includes(value as UserRole);
}

function toAuthenticatedPrincipal(
  payload: Record<string, unknown>,
): AuthenticatedPrincipal | null {
  if (
    typeof payload.sub !== "string" ||
    payload.sub.length === 0 ||
    !isUserRole(payload.role) ||
    typeof payload.tenant_id !== "string" ||
    payload.tenant_id.length === 0
  ) {
    return null;
  }

  return {
    userId: payload.sub,
    role: payload.role,
    tenantId: payload.tenant_id,
  };
}

function isTransitionAuthorized(
  currentStage: TaxPlanCycle["stage"],
  context: LambdaRequestContext,
): boolean {
  if (currentStage === "Review") {
    return context.role === "Firm Admin";
  }

  if (currentStage === "Client Approval") {
    return context.role === "Firm Admin";
  }

  return false;
}

function logDeniedTransitionAttempt(
  auditLogger: Pick<Console, "info">,
  input: {
    caseId: string;
    actor: string;
    action: string;
    outcome: string;
  },
): Date {
  const occurredAt = new Date();

  auditLogger.info({
    case_id: input.caseId,
    actor: input.actor,
    action: input.action,
    outcome: input.outcome,
    occurred_at: occurredAt.toISOString(),
  });

  return occurredAt;
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
  const occurredAt = logDeniedTransitionAttempt(auditLogger, input);

  await auditEntryWriter.record({
    caseId: input.caseId,
    actor: input.actor,
    action: input.action,
    outcome: input.outcome,
    occurredAt,
  });
}

async function authenticate(
  authorizationHeader: string | undefined,
  authenticator: LambdaAuthenticator,
): Promise<LambdaRequestContext | null> {
  return await authenticator.authenticate(authorizationHeader);
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

export function createJwtLambdaAuthenticator(
  config: JwtConfig,
  options: CreateJwtLambdaAuthenticatorOptions = {},
): LambdaAuthenticator {
  const signingKey = new TextEncoder().encode(config.signingSecret);
  const permissionsForRole: Partial<Record<UserRole, ReadonlyArray<string>>> = {
    Advisor: ["EDIT"],
    ...options.permissionsForRole,
  };

  return {
    async authenticate(authorizationHeader) {
      if (!authorizationHeader) {
        return null;
      }

      const match = /^Bearer ([^\s]+)$/.exec(authorizationHeader);
      const token = match?.[1];

      if (!token) {
        return null;
      }

      try {
        const { payload } = await jwtVerify(token, signingKey, {
          algorithms: ["HS256"],
          issuer: config.issuer,
          requiredClaims: ["exp"],
        });
        const principal = toAuthenticatedPrincipal(payload);

        if (!principal) {
          return null;
        }

        return {
          tenantId: principal.tenantId,
          userId: principal.userId,
          role: principal.role,
          permissions: [...(permissionsForRole[principal.role] ?? [])],
        };
      } catch {
        return null;
      }
    },
  };
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

async function handleTransitionRequest(
  input: {
    event: LambdaHttpRequest;
    targetStage: TaxPlanCycle["stage"];
    bodySchema?: typeof presentToClientBodySchema;
    controller: Pick<TaxPlanCycleTransitionController, "transition" | "findByCaseId">;
    auditEntryWriter: AuditEntryWriter;
    auditLogger: Pick<Console, "info">;
    authenticator: LambdaAuthenticator;
  },
): Promise<LambdaHttpResponse> {
  // CL API Gateway proxy request boundary: this parses the raw Lambda event & normalizes it into the shared transition use case shape.
  const parsedParams = transitionPathSchema.safeParse(input.event.pathParameters ?? {});
  const requestBody = parseRequestBody(input.event.body);

  if (!requestBody.success) {
    return problemDetailsToResponse(requestBody.error);
  }

  const parsedBody = input.bodySchema
    ? input.bodySchema.safeParse(requestBody.data)
    : { success: true as const, data: {} as Record<string, never> };

  if (!parsedParams.success || !parsedBody.success) {
    const issues = [
      ...(parsedParams.success ? [] : parsedParams.error.issues.map(toValidationIssue)),
      ...(parsedBody.success ? [] : parsedBody.error.issues.map(toValidationIssue)),
    ];

    return problemDetailsToResponse(
      buildValidationProblem("Transition request failed validation.", issues),
    );
  }

  // CL, Bearer-token check stays in the Lambda path so the same auth rules work in AWS and in feature-level tests.
  const principal = await authenticate(input.event.headers?.authorization, input.authenticator);

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

  const action = `transition ${cycle.stage} -> ${input.targetStage}`;

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

  if (cycle.stage === "Review" && input.targetStage !== "Client Approval") {
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

  if (cycle.stage === "Client Approval" && input.targetStage !== "Executed") {
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
    toStage: input.targetStage,
    actor: principal.userId,
    ...(input.bodySchema
      ? { actionItem: (parsedBody.data as { action_item: ActionItemCreatedEventInput }).action_item }
      : {}),
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

  // Normalize the successful Lambda response back into the API Gateway proxy
  // contract expected by the AWS route.
  return jsonResponse(200, transitioned);
}

export function createPresentToClientLambdaHandler(
  options: CreatePresentToClientLambdaHandlerOptions,
): (event: LambdaHttpRequest) => Promise<LambdaHttpResponse> {
  const auditLogger = options.auditLogger ?? console;

  return async (event) =>
    await handleTransitionRequest({
      event,
      targetStage: "Client Approval",
      bodySchema: presentToClientBodySchema,
      controller: options.controller,
      auditEntryWriter: options.auditEntryWriter,
      auditLogger,
      authenticator: options.authenticator,
    });
}

export function createExecuteLambdaHandler(
  options: CreateExecuteLambdaHandlerOptions,
): (event: LambdaHttpRequest) => Promise<LambdaHttpResponse> {
  const auditLogger = options.auditLogger ?? console;

  return async (event) =>
    await handleTransitionRequest({
      event,
      targetStage: "Executed",
      controller: options.controller,
      auditEntryWriter: options.auditEntryWriter,
      auditLogger,
      authenticator: options.authenticator,
    });
}

export function serializeLambdaProblemResponse(error: unknown): LambdaHttpResponse {
  return problemDetailsToResponse(parseProblem(error));
}

export function serializeLambdaJsonResponse(
  statusCode: number,
  body: unknown,
): LambdaHttpResponse {
  return jsonResponse(statusCode, body);
}
