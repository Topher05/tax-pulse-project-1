import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import type { ZodIssue } from "zod";

import {
  taxPlanCycleCreateController,
  type TaxPlanCycleCreateController,
} from "./taxPlanCycleCreateController.js";
import type {
  AuditEntryReader,
  AuditEntryWriter,
} from "./auditEntryRepository.js";
import { ProblemHttpError, type ProblemDetails } from "./errors.js";
import {
  taxPlanCycleCreateSchema,
  taxPlanCycleReadParamsSchema,
  taxPlanCycleTransitionParamsSchema,
  taxPlanCycleTransitionSchema,
  isLegalTaxPlanCycleStageTransition,
  type TaxPlanCycleStage,
} from "./taxPlanCycle.js";
import {
  taxPlanCycleTransitionController,
  type TaxPlanCycleTransitionController,
} from "./taxPlanCycleTransitionController.js";

export interface ValidationErrorIssue {
  path: Array<string | number>;
  message: string;
  code: string;
}

export interface ValidationErrorResponse extends ProblemDetails {
  code: "VALIDATION_ERROR";
  issues: ValidationErrorIssue[];
}

export interface CreateTaxPlanCycleRouterOptions {
  controller?: TaxPlanCycleCreateController;
  transitionController?: TaxPlanCycleTransitionController;
  auditEntryReader?: AuditEntryReader;
  auditEntryWriter?: AuditEntryWriter;
  auditLogger?: Pick<Console, "info">;
}

interface TenantScopedRequest extends Request {
  tenant: {
    id: string;
  };
  user?: {
    id: string;
    role?: "Firm Admin" | "Advisor" | "Client" | "TaxPulse Platform Admin";
    permissions?: string[];
  };
}

type TransitionAccessRule =
  | {
      role: "Firm Admin";
    }
  | {
      role: "Advisor";
      permission: "EDIT";
    };

const transitionAccessMatrix: Partial<
  Record<
    TaxPlanCycleStage,
    Partial<Record<TaxPlanCycleStage, ReadonlyArray<TransitionAccessRule>>>
  >
> = {
  Intake: {
    "Data Aggregation": [
      { role: "Advisor", permission: "EDIT" },
      { role: "Firm Admin" },
    ],
  },
  "Data Aggregation": {
    Modeling: [
      { role: "Advisor", permission: "EDIT" },
      { role: "Firm Admin" },
    ],
  },
  Modeling: {
    Review: [
      { role: "Advisor", permission: "EDIT" },
      { role: "Firm Admin" },
    ],
  },
  Review: {
    Modeling: [{ role: "Firm Admin" }],
    "Client Approval": [{ role: "Firm Admin" }],
  },
  "Client Approval": {
    Executed: [{ role: "Firm Admin" }],
  },
  Executed: {
    Archived: [{ role: "Firm Admin" }],
  },
};

function toValidationIssue(issue: ZodIssue): ValidationErrorIssue {
  return {
    path: issue.path.map((segment) =>
      typeof segment === "number" ? segment : String(segment),
    ),
    message: issue.message,
    code: issue.code,
  };
}

function getActorId(req: Request, fallbackActor: string): string {
  return (req as TenantScopedRequest).user?.id ?? fallbackActor;
}

function isAdvisorWithEditPermission(
  user: TenantScopedRequest["user"],
): boolean {
  return (
    user?.role === "Advisor" &&
    (user.permissions ?? []).includes("EDIT")
  );
}

function isTransitionAuthorized(
  currentStage: TaxPlanCycleStage,
  requestedStage: TaxPlanCycleStage,
  user: TenantScopedRequest["user"],
): boolean {
  const allowedRoles = transitionAccessMatrix[currentStage]?.[requestedStage];

  if (!allowedRoles) {
    return false;
  }

  return allowedRoles.some((rule) => {
    if (rule.role !== user?.role) {
      return false;
    }

    if (rule.role === "Firm Admin") {
      return true;
    }

    return isAdvisorWithEditPermission(user);
  });
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

export function createTaxPlanCycleRouter(
  options: CreateTaxPlanCycleRouterOptions = {},
): Router {
  const router = Router();
  const controller = options.controller ?? taxPlanCycleCreateController;
  const transitionController = options.transitionController ?? taxPlanCycleTransitionController;
  const auditLogger = options.auditLogger ?? console;
  const auditEntryWriter =
    options.auditEntryWriter ?? deprecatedNoopAuditEntryWriter;
  const auditEntryReader = options.auditEntryReader ?? {
    listByCase: async () => [],
  };

  router.get(
    "/tax-plan-cycles/:caseId/audit-entries",
    async (req: Request, res: Response, next: NextFunction) => {
      const parsedParams = taxPlanCycleReadParamsSchema.safeParse(req.params);

      if (!parsedParams.success) {
        next(
          new ProblemHttpError({
            type: "https://taxpulse.example/problems/validation-error",
            title: "Validation Error",
            status: 400,
            detail: "Request path parameters failed validation.",
            extensions: {
              code: "VALIDATION_ERROR",
              issues: parsedParams.error.issues.map(toValidationIssue),
            },
          }),
        );
        return;
      }

      try {
        const tenantId = (req as TenantScopedRequest).tenant.id;
        const cycle = await controller.findByCaseId({
          tenantId,
          caseId: parsedParams.data.caseId,
        });

        if (cycle === null) {
          next(
            new ProblemHttpError({
              type: "https://taxpulse.example/problems/tax-plan-cycle-not-found",
              title: "Tax Plan Cycle Not Found",
              status: 404,
              detail: "No tax plan cycle was found for the requested case ID.",
            }),
          );
          return;
        }

        const auditEntries = await auditEntryReader.listByCase({
          tenantId,
          caseId: parsedParams.data.caseId,
        });

        res.status(200).json({ audit_entries: auditEntries });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/tax-plan-cycles/:caseId",
    async (req: Request, res: Response, next: NextFunction) => {
      const parsedParams = taxPlanCycleReadParamsSchema.safeParse(req.params);
      console.log('Get case found')
      console.log(parsedParams) // Contains case id, where does tennant id live?
      if (!parsedParams.success) {
        next(
          new ProblemHttpError({
            type: "https://taxpulse.example/problems/validation-error",
            title: "Validation Error",
            status: 400,
            detail: "Request path parameters failed validation.",
            extensions: {
              code: "VALIDATION_ERROR",
              issues: parsedParams.error.issues.map(toValidationIssue),
            },
          }),
        );
        console.log('Exit A')
        return;
      }

      try {
        console.log("Starting Search for ID....")
        const foo = req as TenantScopedRequest
        console.log(req?.tenant)
        console.log("Req casting works")
        const tenantId = (req as TenantScopedRequest).tenant.id; // Fails and triggers catch, tenant is undefined via postman, does it need to be sent as a header
        console.log(tenantId)
        console.log("ID is above")
        const cycle = await controller.findByCaseId({
          tenantId,
          caseId: parsedParams.data.caseId,
        });

        if (cycle === null) {
          next(
            new ProblemHttpError({
              type: "https://taxpulse.example/problems/tax-plan-cycle-not-found",
              title: "Tax Plan Cycle Not Found",
              status: 404,
              detail: "No tax plan cycle was found for the requested case ID.",
            }),
          );
          return;
        }

        res.status(200).json(cycle);
      } catch (error) {
        console.log('Exit B') // Get fails here with 400 find out why, theory is that it's due to tenantId
        next(error);
      }
    },
  );

  router.post(
    "/tax-plan-cycles",
    async (req: Request, res: Response, next: NextFunction) => {
      const parsedBody = taxPlanCycleCreateSchema.safeParse(req.body);

      if (!parsedBody.success) {
        next(
          new ProblemHttpError({
            type: "https://taxpulse.example/problems/validation-error",
            title: "Validation Error",
            status: 400,
            detail: "Request body failed validation.",
            extensions: {
              code: "VALIDATION_ERROR",
              issues: parsedBody.error.issues.map(toValidationIssue),
            },
          }),
        );
        return;
      }

      try {
        const tenantId = (req as TenantScopedRequest).tenant.id;
        const result = await controller.create({
          ...parsedBody.data,
          tenantId,
          actor: getActorId(req, parsedBody.data.owner),
        });
        res.status(202).json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  // TODO: Refactor :id to be  Rename :id to case Id in the controller, code and tests it should match for consistency
  // TODO: Refactor error handling to give 401 error in case of invalid token
  router.patch(
    "/cycles/:id/transition",
    async (req: Request, res: Response, next: NextFunction) => {
      const parsedParams = taxPlanCycleTransitionParamsSchema.safeParse(
        req.params,
      );
      const parsedBody = taxPlanCycleTransitionSchema.safeParse(req.body);

      if (!parsedParams.success || !parsedBody.success) {
        next(
          new ProblemHttpError({
            type: "https://taxpulse.example/problems/validation-error",
            title: "Validation Error",
            status: 400,
            detail: "Transition request failed validation.",
            extensions: {
              code: "VALIDATION_ERROR",
              issues: [
                ...(parsedParams.success
                  ? []
                  : parsedParams.error.issues.map(toValidationIssue)),
                ...(parsedBody.success
                  ? []
                  : parsedBody.error.issues.map(toValidationIssue)),
              ],
            },
          }),
        );
        return;
      }

      try {
        const tenantId = (req as TenantScopedRequest).tenant.id;
        const actor = getActorId(req, "unknown-user");
        const cycle = await controller.findByCaseId({
          tenantId,
          caseId: parsedParams.data.id,
        });

        if (cycle === null) {
          next(
            new ProblemHttpError({
              type: "https://taxpulse.example/problems/tax-plan-cycle-not-found",
              title: "Tax Plan Cycle Not Found",
              status: 404,
              detail: "No tax plan cycle was found for the requested case ID.",
            }),
          );
          return;
        }

        const requestedStage = parsedBody.data.to_stage;
        const action = `transition ${cycle.stage} -> ${requestedStage}`;

        if (
          !isTransitionAuthorized(
            cycle.stage,
            requestedStage,
            (req as TenantScopedRequest).user,
          )
        ) {
          await writeDeniedTransitionAttempt(auditLogger, auditEntryWriter, {
            caseId: parsedParams.data.id,
            actor,
            action,
            outcome: "403",
          });
          next(
            new ProblemHttpError({
              type: "https://taxpulse.example/problems/forbidden-transition",
              title: "Forbidden",
              status: 403,
              detail: "The current role is not authorized to perform this transition.",
            }),
          );
          return;
        }

        if (!isLegalTaxPlanCycleStageTransition(cycle.stage, requestedStage)) {
          await writeDeniedTransitionAttempt(auditLogger, auditEntryWriter, {
            caseId: parsedParams.data.id,
            actor,
            action,
            outcome: "422",
          });
          next(
            new ProblemHttpError({
              type: "https://taxpulse.example/problems/invalid-transition",
              title: "Invalid Transition",
              status: 422,
              detail: "The requested stage transition is not legal.",
            }),
          );
          return;
        }

        const transitioned = await transitionController.transition({
          tenantId,
          caseId: parsedParams.data.id,
          toStage: requestedStage,
          actor,
        });

        if (transitioned === null) {
          next(
            new ProblemHttpError({
              type: "https://taxpulse.example/problems/tax-plan-cycle-not-found",
              title: "Tax Plan Cycle Not Found",
              status: 404,
              detail: "No tax plan cycle was found for the requested case ID.",
            }),
          );
          return;
        }

        res.status(200).json(transitioned);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}

/** @deprecated Legacy fallback stub. Inject a real audit writer instead. */
const deprecatedNoopAuditEntryWriter: AuditEntryWriter = {
  async record() {
    return undefined;
  },
};
