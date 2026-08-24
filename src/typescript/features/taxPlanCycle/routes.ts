import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import type { ZodIssue } from "zod";

import {
  taxPlanCycleCreateController,
  type TaxPlanCycleCreateController,
} from "./controllers/createController.js";
import type {
  AuditEntryReader,
  AuditEntryWriter,
} from "../../auditEntryRepository.js";
import { ProblemHttpError, type ProblemDetails } from "../../errors.js";
import {
  taxPlanCycleCreateSchema,
  taxPlanCycleQueueGetResponseSchema,
  taxPlanCycleReadParamsSchema,
  taxPlanCycleSchema,
  clientTaxPlanReadModelSchema,
  taxPlanCycleTransitionParamsSchema,
  taxPlanCycleTransitionSchema,
  isLegalTaxPlanCycleStageTransition,
  clientTaxPlanScenarioSchema,
  type TaxPlanCycleStage,
} from "./taxPlanCycle.js";
import {
  taxPlanCycleTransitionController,
  type TaxPlanCycleTransitionController,
} from "./controllers/transitionController.js";
import type { ScenarioModelingController } from "./controllers/scenarios.js";
import { scenarioModelingRequestSchema } from "./scenarioModeling.js";
import type { ScenarioRepository } from "./repositories/scenarios.js";
import type { Scenario } from "../../scenario.js";
import type { TaxPlanCycleRepository } from "./repositories/repository.js";
import type { ActionItemRepository } from "./repositories/actionItems.js";
import type { ActionItemCompletedEventPublishInput } from "./infrastructure/cloudEvents/actionItemCompleted/index.js";
import { cloudWatchObservabilityProvider } from "../../shared/cloud-logger/observability.js";

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
  taxPlanCycleRepository?: Pick<TaxPlanCycleRepository, "findByCaseId" | "listQueue">;
  clientPortalReadRepository?: Pick<TaxPlanCycleRepository, "findCurrentByClientId">;
  scenarioRepository?: Pick<ScenarioRepository, "listByCaseId">;
  actionItemRepository?: Pick<ActionItemRepository, "listByCaseId" | "complete">;
  actionItemCompletedEventPublisher?: {
    publishActionItemCompleted(
      input: ActionItemCompletedEventPublishInput,
    ): Promise<void> | void;
  };
  scenarioModelingController?: ScenarioModelingController;
  auditEntryReader?: AuditEntryReader;
  auditEntryWriter?: AuditEntryWriter;
  auditLogger?: Pick<Console, "info">;
}

function authenticationRequired(): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/authentication-required",
    title: "Authentication Required",
    status: 401,
    detail: "A valid access token is required.",
  });
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

function getIdempotencyKey(req: Request): string {
  const idempotencyKey = req.header("Idempotency-Key")?.trim();

  if (!idempotencyKey) {
    throw new ProblemHttpError({
      type: "https://taxpulse.example/problems/idempotency-key-required",
      title: "Idempotency Key Required",
      status: 400,
      detail: "A non-empty Idempotency-Key header is required to create a Tax Plan Cycle.",
    });
  }

  return idempotencyKey;
}

function isAdvisorWithEditPermission(
  user: TenantScopedRequest["user"],
): boolean {
  return (
    user?.role === "Advisor" &&
    (user.permissions ?? []).includes("EDIT")
  );
}

function canReadCycle(user: TenantScopedRequest["user"], cycle: { client_id: string }): boolean {
  return user?.role !== "Client" || user.id === cycle.client_id;
}

function operatorAccessRequired(): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/operator-access-required",
    title: "Operator Access Required",
    status: 403,
    detail: "Client users can access plan progress only through the My Tax Plan view.",
  });
}

function isClientUser(user: TenantScopedRequest["user"]): boolean {
  return user?.role === "Client";
}

function toClientTaxPlanScenario(scenario: Scenario) {
  const computedResult = scenario.computed_result;
  const totalTax =
    "total_tax" in computedResult ? computedResult.total_tax : Number(computedResult.totalTax);
  const deltaVsBaseline =
    "delta_vs_baseline" in computedResult
      ? computedResult.delta_vs_baseline
      : Number(computedResult.deltaVBaseline);

  return clientTaxPlanScenarioSchema.parse({
    id: scenario.id,
    name: scenario.name,
    total_tax: totalTax,
    delta_vs_baseline: deltaVsBaseline,
  });
}

function clientPortalAccessRequired(viewName: string): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/client-portal-access-required",
    title: "Client Portal Access Required",
    status: 403,
    detail: `Only Client users can access the ${viewName} view.`,
  });
}

function clientCycleNotFound(): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/tax-plan-cycle-not-found",
    title: "Tax Plan Cycle Not Found",
    status: 404,
    detail: "No current tax plan cycle was found for this client.",
  });
}

function actionItemNotFound(): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/action-item-not-found",
    title: "Action Item Not Found",
    status: 404,
    detail: "No incomplete action item was found for this client.",
  });
}

function validationError(detail: string): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/validation-error",
    title: "Validation Error",
    status: 400,
    detail,
  });
}

function toClientTaxPlanReadModel(
  cycle: ReturnType<typeof taxPlanCycleSchema.parse>,
  scenarios: readonly Scenario[],
) {
  return clientTaxPlanReadModelSchema.parse({
    ...cycle,
    advisor: cycle.owner,
    next_meeting: null,
    projected_savings: null,
    top_recommendation: null,
    scenarios: scenarios.map(toClientTaxPlanScenario),
  });
}

function isTransitionAuthorized(
  currentStage: TaxPlanCycleStage,
  user: TenantScopedRequest["user"],
): boolean {
  const allowedTransitions = transitionAccessMatrix[currentStage];

  if (!allowedTransitions || !user?.role) {
    return false;
  }

  return Object.values(allowedTransitions).some((allowedRoles) =>
    allowedRoles.some((rule) => {
      if (rule.role !== user.role) {
        return false;
      }

      if (rule.role === "Firm Admin") {
        return true;
      }

      return isAdvisorWithEditPermission(user);
    }),
  );
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

async function writeTransitionAttemptAudit(
  auditLogger: Pick<Console, "info">,
  auditEntryWriter: AuditEntryWriter,
  input: {
    caseId: string;
    actor: string;
    action: string;
    outcome: string;
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
  await writeTransitionAttemptAudit(auditLogger, auditEntryWriter, input);
}

export function createTaxPlanCycleRouter(
  options: CreateTaxPlanCycleRouterOptions = {},
): Router {
  const router = Router();
  const controller = options.controller ?? taxPlanCycleCreateController;
  const transitionController = options.transitionController ?? taxPlanCycleTransitionController;
  const scenarioModelingController = options.scenarioModelingController;
  const taxPlanCycleRepository =
    options.taxPlanCycleRepository ?? {
      async findByCaseId() {
        return null;
      },
      async listQueue() {
        return [];
      },
    };
  const clientPortalReadRepository =
    options.clientPortalReadRepository ?? {
      async findCurrentByClientId() {
        return null;
      },
    };
  const scenarioRepository = options.scenarioRepository ?? {
    async listByCaseId() {
      return [];
    },
  };
  const actionItemRepository = options.actionItemRepository;
  const auditLogger = options.auditLogger ?? console;
  const auditEntryWriter =
    options.auditEntryWriter ?? deprecatedNoopAuditEntryWriter;
  const auditEntryReader = options.auditEntryReader ?? {
    listByCase: async () => [],
  };

  router.get(
    "/tax-plan-cycles",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = (req as TenantScopedRequest).tenant?.id;
        const user = (req as TenantScopedRequest).user;

        if (!tenantId || !user?.id) {
          next(authenticationRequired());
          return;
        }

        if (isClientUser(user)) {
          next(operatorAccessRequired());
          return;
        }

        const queue = await taxPlanCycleRepository.listQueue({ tenantId });
        const response = taxPlanCycleQueueGetResponseSchema.parse(queue);

        res.status(200).json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/portal/action-items",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = (req as TenantScopedRequest).tenant?.id;
        const user = (req as TenantScopedRequest).user;
        if (!tenantId || !user?.id) {
          next(authenticationRequired());
          return;
        }
        if (user.role !== "Client") {
          next(clientPortalAccessRequired("Action Items"));
          return;
        }
        if (!actionItemRepository) {
          throw new Error("Action item repository is required for the portal action-items route.");
        }

        const cycle = await clientPortalReadRepository.findCurrentByClientId({
          tenantId,
          clientId: user.id,
        });
        if (cycle === null || !canReadCycle(user, cycle)) {
          next(clientCycleNotFound());
          return;
        }

        res.status(200).json(await actionItemRepository.listByCaseId(cycle.id));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/portal/action-items/:actionItemId/complete",
    async (req: Request, res: Response, next: NextFunction) => {
      const actionItemId = Number(req.params.actionItemId);
      if (!Number.isSafeInteger(actionItemId) || actionItemId < 1) {
        next(validationError("Action item ID must be a positive integer."));
        return;
      }

      try {
        const tenantId = (req as TenantScopedRequest).tenant?.id;
        const user = (req as TenantScopedRequest).user;
        if (!tenantId || !user?.id) {
          next(authenticationRequired());
          return;
        }
        if (user.role !== "Client") {
          next(clientPortalAccessRequired("Action Items"));
          return;
        }
        if (!actionItemRepository) {
          throw new Error("Action item repository is required for the portal action-items route.");
        }

        const cycle = await clientPortalReadRepository.findCurrentByClientId({
          tenantId,
          clientId: user.id,
        });
        if (cycle === null || !canReadCycle(user, cycle)) {
          next(clientCycleNotFound());
          return;
        }

        const item = await actionItemRepository.complete({
          caseId: cycle.id,
          actionItemId,
        });
        if (item === null) {
          next(actionItemNotFound());
          return;
        }

        await options.actionItemCompletedEventPublisher?.publishActionItemCompleted({
          tenantId,
          caseId: cycle.id,
          actionItemId: item.id,
          actor: user.id,
        });
        res.status(200).json(item);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/portal/my-tax-plan",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = (req as TenantScopedRequest).tenant?.id;
        const user = (req as TenantScopedRequest).user;

        if (!tenantId || !user?.id) {
          next(authenticationRequired());
          return;
        }

        if (user.role !== "Client") {
          next(
            new ProblemHttpError({
              type: "https://taxpulse.example/problems/client-portal-access-required",
              title: "Client Portal Access Required",
              status: 403,
              detail: "Only Client users can access the My Tax Plan view.",
            }),
          );
          return;
        }

        const cycle = await clientPortalReadRepository.findCurrentByClientId({
          tenantId,
          clientId: user.id,
        });

        if (cycle === null || !canReadCycle((req as TenantScopedRequest).user, cycle)) {
          next(
            new ProblemHttpError({
              type: "https://taxpulse.example/problems/tax-plan-cycle-not-found",
              title: "Tax Plan Cycle Not Found",
              status: 404,
              detail: "No current tax plan cycle was found for this client.",
            }),
          );
          return;
        }

        const scenarios = await scenarioRepository.listByCaseId({
          tenantId,
          caseId: cycle.id,
        });

        res.status(200).json(toClientTaxPlanReadModel(cycle, scenarios));
      } catch (error) {
        next(error);
      }
    },
  );

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
        const user = (req as TenantScopedRequest).user;

        if (isClientUser(user)) {
          next(operatorAccessRequired());
          return;
        }
        const cycle = await controller.findByCaseId({
          tenantId,
          caseId: parsedParams.data.caseId,
        });

        if (cycle === null || !canReadCycle((req as TenantScopedRequest).user, cycle)) {
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
        const user = (req as TenantScopedRequest).user;

        if (isClientUser(user)) {
          next(operatorAccessRequired());
          return;
        }
        const cycle = await controller.findByCaseId({
          tenantId,
          caseId: parsedParams.data.caseId,
        });

        if (cycle === null || !canReadCycle((req as TenantScopedRequest).user, cycle)) {
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
        const user = (req as TenantScopedRequest).user;

        if (isClientUser(user)) {
          next(operatorAccessRequired());
          return;
        }
        const idempotencyKey = getIdempotencyKey(req);
        const result = await controller.create({
          ...parsedBody.data,
          tenantId,
          actor: getActorId(req, parsedBody.data.owner),
          idempotencyKey,
        });
        res.status(202).json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  if (scenarioModelingController !== undefined) {
    router.post(
      "/tax-plan-cycles/:caseId/scenarios",
      async (req: Request, res: Response, next: NextFunction) => {
        const parsedParams = taxPlanCycleReadParamsSchema.safeParse(req.params);
        const parsedBody = scenarioModelingRequestSchema.safeParse(req.body);

        if (!parsedParams.success || !parsedBody.success) {
          next(
            new ProblemHttpError({
              type: "https://taxpulse.example/problems/validation-error",
              title: "Validation Error",
              status: 400,
              detail: "Scenario modeling request failed validation.",
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
          const tenantId = (req as TenantScopedRequest).tenant?.id;
          const user = (req as TenantScopedRequest).user;

          if (!tenantId || !user?.id || req.headers.authorization === undefined) {
            next(authenticationRequired());
            return;
          }

          if (isClientUser(user)) {
            next(operatorAccessRequired());
            return;
          }

          const requestContext = cloudWatchObservabilityProvider(
            req.headers,
            (req as { id?: string }).id,
          );
          const scenarios = await scenarioModelingController.model({
            tenantId,
            caseId: parsedParams.data.caseId,
            authorizationHeader: req.headers.authorization,
            requestContext,
            ...parsedBody.data,
          });

          res.status(202).json(scenarios);
        } catch (error) {
          next(error);
        }
      },
    );
  }

  router.patch(
    "/tax-plan-cycles/:caseId/transition",
    async (req: Request, res: Response, next: NextFunction) => {
      console.log("[tax-plan-cycle transition] request received", {
        params: req.params,
        body: req.body,
      });

      const parsedParams = taxPlanCycleTransitionParamsSchema.safeParse(
        req.params,
      );
      const parsedBody = taxPlanCycleTransitionSchema.safeParse(req.body);

      if (!parsedParams.success || !parsedBody.success) {
        console.log("[tax-plan-cycle transition] validation failure", {
          paramsIssues: parsedParams.success
            ? []
            : parsedParams.error.issues.map(toValidationIssue),
          bodyIssues: parsedBody.success
            ? []
            : parsedBody.error.issues.map(toValidationIssue),
        });

        if (parsedParams.success) {
          await writeTransitionAttemptAudit(auditLogger, auditEntryWriter, {
            caseId: parsedParams.data.caseId,
            actor: (req as TenantScopedRequest).user?.id ?? "unknown",
            action: "transition request validation failed",
            outcome: "400",
          });
        }

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

      let transitionAuditContext:
        | {
            caseId: string;
            actor: string;
            action: string;
          }
        | null = null;
      let transitionAuditRecorded = false;

      try {
        const tenantId = (req as TenantScopedRequest).tenant?.id;
        const user = (req as TenantScopedRequest).user;

        if (!tenantId || !user?.role || !user.id) {
          console.log("[tax-plan-cycle transition] authentication failure", {
            tenantIdPresent: Boolean(tenantId),
            userIdPresent: Boolean(user?.id),
            rolePresent: Boolean(user?.role),
          });

          await writeTransitionAttemptAudit(auditLogger, auditEntryWriter, {
            caseId: parsedParams.data.caseId,
            actor: user?.id ?? "unknown",
            action: "transition authentication required",
            outcome: "401",
          });

          next(authenticationRequired());
          return;
        }

        if (isClientUser(user)) {
          console.log("[tax-plan-cycle transition] authorization failure", {
            caseId: parsedParams.data.caseId,
            actor: user.id,
            role: user.role,
            reason: "client-role-not-allowed",
          });

          await writeTransitionAttemptAudit(auditLogger, auditEntryWriter, {
            caseId: parsedParams.data.caseId,
            actor: user.id,
            action: `transition ${parsedParams.data.caseId} client-role-not-allowed`,
            outcome: "403",
          });

          next(operatorAccessRequired());
          return;
        }

        const actor = user.id;
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

        const requestedStage = parsedBody.data.to_stage;
        const action = `transition ${cycle.stage} -> ${requestedStage}`;
        transitionAuditContext = {
          caseId: parsedParams.data.caseId,
          actor,
          action,
        };
        console.log("[tax-plan-cycle transition] authorization check", {
          caseId: parsedParams.data.caseId,
          actor,
          role: user.role,
          fromStage: cycle.stage,
          toStage: requestedStage,
        });

        if (!isTransitionAuthorized(cycle.stage, user)) {
          console.log("[tax-plan-cycle transition] validation or authorization failure", {
            caseId: parsedParams.data.caseId,
            actor,
            role: user.role,
            fromStage: cycle.stage,
            toStage: requestedStage,
            reason: "role-not-authorized",
          });

          await writeDeniedTransitionAttempt(auditLogger, auditEntryWriter, {
            caseId: parsedParams.data.caseId,
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
          console.log("[tax-plan-cycle transition] validation or authorization failure", {
            caseId: parsedParams.data.caseId,
            actor,
            role: user.role,
            fromStage: cycle.stage,
            toStage: requestedStage,
            reason: "illegal-stage-transition",
          });

          await writeDeniedTransitionAttempt(auditLogger, auditEntryWriter, {
            caseId: parsedParams.data.caseId,
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
          caseId: parsedParams.data.caseId,
          fromStage: cycle.stage,
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

        await writeTransitionAttemptAudit(auditLogger, auditEntryWriter, {
          caseId: parsedParams.data.caseId,
          actor,
          action,
          outcome: "200",
        });
        transitionAuditRecorded = true;

        console.log("[tax-plan-cycle transition] transition success", {
          caseId: parsedParams.data.caseId,
          actor,
          fromStage: cycle.stage,
          toStage: requestedStage,
        });

        res.status(200).json(transitioned);
      } catch (error) {
        if (transitionAuditContext && !transitionAuditRecorded) {
          try {
            await writeTransitionAttemptAudit(auditLogger, auditEntryWriter, {
              ...transitionAuditContext,
              outcome: "500",
            });
            transitionAuditRecorded = true;
          } catch {
            // Ignore audit write failures on the error path so the original error still surfaces.
          }
        }

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
