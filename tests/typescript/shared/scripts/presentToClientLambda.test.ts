import { describe, expect, test, vi } from "vitest";

import {
  buildPresentToClientLambdaRequest,
  createPresentToClientLambdaHandler,
} from "../../../../src/typescript/shared/scripts/present-to-client-lambda/index.js";
import { createTaxPlanCycleTransitionController } from "../../../../src/typescript/features/taxPlanCycle/controllers/transitionController.js";
import type { TaxPlanCycle } from "../../../../src/typescript/features/taxPlanCycle/index.js";

function createInMemoryRepository(initialCycle: TaxPlanCycle) {
  const transitions: Array<{
    fromStage: TaxPlanCycle["stage"];
    toStage: TaxPlanCycle["stage"];
  }> = [];
  let currentCycle = initialCycle;

  return {
    transitions,
    async create() {
      return currentCycle.id;
    },
    async insert() {
      return currentCycle.id;
    },
    async findByCaseId(input: { tenantId: string; caseId: string }) {
      if (input.caseId !== currentCycle.id) {
        return null;
      }

      void input.tenantId;
      return currentCycle;
    },
    async findCurrentByClientId(input: { tenantId: string; clientId: string }) {
      void input.tenantId;
      void input.clientId;
      return null;
    },
    async listQueue() {
      return [
        {
          ...currentCycle,
          is_overdue: false,
          updated_at: new Date().toISOString(),
        },
      ];
    },
    async transition(input: {
      tenantId: string;
      caseId: string;
      toStage: TaxPlanCycle["stage"];
      actor: string;
      fromStage?: TaxPlanCycle["stage"];
      actionItem?: {
        description: string;
        deadline: string;
      };
    }) {
      void input.tenantId;
      void input.caseId;
      void input.actor;

      transitions.push({
        fromStage: currentCycle.stage,
        toStage: input.toStage,
      });

      currentCycle = {
        ...currentCycle,
        stage: input.toStage,
      };

      return currentCycle;
    },
    async setHoldStatus(input: {
      tenantId: string;
      caseId: string;
      onHold: boolean;
      holdReason?: string;
    }) {
      void input.tenantId;
      void input.caseId;
      currentCycle = {
        ...currentCycle,
        on_hold: input.onHold,
        ...(input.onHold && input.holdReason
          ? { hold_reason: input.holdReason }
          : {}),
      };
      return currentCycle;
    },
    getCurrentCycle() {
      return currentCycle;
    },
  };
}

const reviewCycle: TaxPlanCycle = {
  id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91",
  client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e92",
  stage: "Review",
  owner: "advisor-001",
  priority: "medium",
  due_date: "2026-12-31",
  on_hold: false,
};

const clientApprovalCycle: TaxPlanCycle = {
  ...reviewCycle,
  stage: "Client Approval",
};

describe("present-to-client Lambda boundary", () => {
  test("transitions the cycle when HTTP API JWT claims are present", async () => {
    const repository = createInMemoryRepository(reviewCycle);
    const stageChangedEvents: Array<Record<string, unknown>> = [];
    const controller = createTaxPlanCycleTransitionController(repository, {
      stageChangedEventPublisher: {
        publishStageChanged: vi.fn(async (input) => {
          stageChangedEvents.push(input);
        }),
      },
      actionItemEventPublisher: {
        publishActionItemCreated: vi.fn(async () => undefined),
      },
    });
    const handler = createPresentToClientLambdaHandler({
      controller,
      auditEntryWriter: {
        record: vi.fn(async () => undefined),
      },
    });

    const response = await handler({
      body: JSON.stringify({
        action_item: {
          description: "Send the client presentation packet",
          deadline: "2026-08-14",
        },
      }),
      pathParameters: {
        caseId: reviewCycle.id,
      },
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              tenant_id: "tenant-001",
              sub: "firm-admin-001",
              role: "Firm Admin",
            },
          },
        },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(clientApprovalCycle);
    expect(repository.getCurrentCycle().stage).toBe("Client Approval");
    expect(stageChangedEvents).toHaveLength(1);
  });

  test("returns 400 for malformed present-to-client bodies", async () => {
    const repository = createInMemoryRepository(reviewCycle);
    const controller = createTaxPlanCycleTransitionController(repository, {});
    const handler = createPresentToClientLambdaHandler({
      controller,
      auditEntryWriter: {
        record: vi.fn(async () => undefined),
      },
    });

    const response = await handler({
      body: "{}",
      pathParameters: {
        caseId: reviewCycle.id,
      },
      requestContext: {
        authorizer: {
          tenantId: "tenant-001",
          userId: "firm-admin-001",
          role: "Firm Admin",
        },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(repository.getCurrentCycle().stage).toBe("Review");
  });

  test("returns 401 when the API Gateway authorizer context is missing", async () => {
    const repository = createInMemoryRepository(reviewCycle);
    const controller = createTaxPlanCycleTransitionController(repository, {});
    const handler = createPresentToClientLambdaHandler({
      controller,
      auditEntryWriter: {
        record: vi.fn(async () => undefined),
      },
    });

    const response = await handler({
      body: JSON.stringify({
        action_item: {
          description: "Send the client presentation packet",
          deadline: "2026-08-14",
        },
      }),
      pathParameters: {
        caseId: reviewCycle.id,
      },
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toMatchObject({
      type: "https://taxpulse.example/problems/authentication-required",
      title: "Authentication Required",
      status: 401,
    });
  });

  test("records denied transitions when the role is not authorized", async () => {
    const repository = createInMemoryRepository(reviewCycle);
    const auditLogger = { info: vi.fn() };
    const record = vi.fn(async () => undefined);
    const controller = createTaxPlanCycleTransitionController(repository, {});
    const handler = createPresentToClientLambdaHandler({
      controller,
      auditEntryWriter: {
        record,
      },
      auditLogger,
    });

    const response = await handler(
      buildPresentToClientLambdaRequest({
        tenantId: "tenant-001",
        caseId: reviewCycle.id,
        userId: "advisor-001",
        role: "Advisor",
        actionItem: {
          description: "Send the client presentation packet",
          deadline: "2026-08-14",
        },
      }),
    );

    expect(response.statusCode).toBe(403);
    expect(JSON.parse(response.body)).toMatchObject({
      type: "https://taxpulse.example/problems/forbidden-transition",
      title: "Forbidden",
      status: 403,
    });
    expect(auditLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        case_id: reviewCycle.id,
        actor: "advisor-001",
        action: "transition Review -> Client Approval",
        outcome: "403",
      }),
    );
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: reviewCycle.id,
        actor: "advisor-001",
        action: "transition Review -> Client Approval",
        outcome: "403",
      }),
    );
    expect(repository.getCurrentCycle().stage).toBe("Review");
  });

  test("preserves saga compensation when action-item publishing fails", async () => {
    const repository = createInMemoryRepository(reviewCycle);
    const stageChangedEvents: Array<Record<string, unknown>> = [];
    const controller = createTaxPlanCycleTransitionController(repository, {
      stageChangedEventPublisher: {
        publishStageChanged: vi.fn(async (input) => {
          stageChangedEvents.push(input);
        }),
      },
      actionItemEventPublisher: {
        publishActionItemCreated: vi.fn(async () => {
          throw new Error("action-item publish failed");
        }),
      },
    });
    const handler = createPresentToClientLambdaHandler({
      controller,
      auditEntryWriter: {
        record: vi.fn(async () => undefined),
      },
    });

    const response = await handler(
      buildPresentToClientLambdaRequest({
        tenantId: "tenant-001",
        caseId: reviewCycle.id,
        userId: "firm-admin-001",
        role: "Firm Admin",
        actionItem: {
          description: "Send the client presentation packet",
          deadline: "2026-08-14",
        },
      }),
    );

    expect(response.statusCode).toBe(500);
    expect(repository.transitions).toEqual([
      {
        fromStage: "Review",
        toStage: "Client Approval",
      },
      {
        fromStage: "Client Approval",
        toStage: "Review",
      },
    ]);
    expect(repository.getCurrentCycle().stage).toBe("Review");
    expect(stageChangedEvents).toHaveLength(2);
  });
});
