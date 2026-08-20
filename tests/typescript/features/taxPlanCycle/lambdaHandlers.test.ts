import { describe, expect, test, vi } from "vitest";

import {
  createExecuteLambdaHandler,
  createPresentToClientLambdaHandler,
  type LambdaAuthenticator,
  type LambdaHttpRequest,
  type LambdaRequestContext,
  type TaxPlanCycle,
} from "../../../../src/typescript/index.js";

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

function createAuthenticator(
  context: LambdaRequestContext | null,
): LambdaAuthenticator {
  return {
    authenticate: vi.fn(async () => context),
  };
}

function createRequest(
  overrides: Partial<LambdaHttpRequest> = {},
): LambdaHttpRequest {
  return {
    headers: {
      authorization: "Bearer token",
      ...(overrides.headers ?? {}),
    },
    pathParameters: {
      caseId: reviewCycle.id,
      ...(overrides.pathParameters ?? {}),
    },
    body: overrides.body,
  };
}

describe("tax plan cycle Lambda handlers", () => {
  test("present-to-client transitions the cycle and forwards the action item", async () => {
    const transition = vi.fn(async () => clientApprovalCycle);
    const controller = {
      findByCaseId: vi.fn(async () => reviewCycle),
      transition,
    };
    const record = vi.fn(async () => undefined);
    const handler = createPresentToClientLambdaHandler({
      controller,
      auditEntryWriter: { record },
      authenticator: createAuthenticator({
        tenantId: "tenant-001",
        userId: "firm-admin-001",
        role: "Firm Admin",
        permissions: [],
      }),
    });

    const response = await handler(
      createRequest({
        body: JSON.stringify({
          action_item: {
            description: "Send the client presentation packet",
            deadline: "2026-08-14",
          },
        }),
      }),
    );

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(clientApprovalCycle);
    expect(transition).toHaveBeenCalledWith({
      tenantId: "tenant-001",
      caseId: reviewCycle.id,
      fromStage: "Review",
      toStage: "Client Approval",
      actor: "firm-admin-001",
      actionItem: {
        description: "Send the client presentation packet",
        deadline: "2026-08-14",
      },
    });
    expect(record).not.toHaveBeenCalled();
  });

  test("execute transitions the cycle without an action item body", async () => {
    const executeCycle: TaxPlanCycle = {
      ...clientApprovalCycle,
      stage: "Executed",
    };
    const transition = vi.fn(async () => executeCycle);
    const controller = {
      findByCaseId: vi.fn(async () => clientApprovalCycle),
      transition,
    };
    const record = vi.fn(async () => undefined);
    const handler = createExecuteLambdaHandler({
      controller,
      auditEntryWriter: { record },
      authenticator: createAuthenticator({
        tenantId: "tenant-001",
        userId: "firm-admin-001",
        role: "Firm Admin",
        permissions: [],
      }),
    });

    const response = await handler(createRequest({ body: undefined }));

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(executeCycle);
    expect(transition).toHaveBeenCalledWith({
      tenantId: "tenant-001",
      caseId: reviewCycle.id,
      fromStage: "Client Approval",
      toStage: "Executed",
      actor: "firm-admin-001",
    });
    expect(record).not.toHaveBeenCalled();
  });

  test("returns 400 for malformed present-to-client bodies", async () => {
    const controller = {
      findByCaseId: vi.fn(async () => reviewCycle),
      transition: vi.fn(),
    };
    const record = vi.fn(async () => undefined);
    const handler = createPresentToClientLambdaHandler({
      controller,
      auditEntryWriter: { record },
      authenticator: createAuthenticator({
        tenantId: "tenant-001",
        userId: "firm-admin-001",
        role: "Firm Admin",
        permissions: [],
      }),
    });

    const response = await handler(createRequest({ body: "{}" }));
    const problem = JSON.parse(response.body) as { code: string; issues: unknown[] };

    expect(response.statusCode).toBe(400);
    expect(problem.code).toBe("VALIDATION_ERROR");
    expect(controller.transition).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });

  test("returns 401 when the request has no valid authorization context", async () => {
    const controller = {
      findByCaseId: vi.fn(async () => reviewCycle),
      transition: vi.fn(),
    };
    const handler = createExecuteLambdaHandler({
      controller,
      auditEntryWriter: { record: vi.fn(async () => undefined) },
      authenticator: createAuthenticator(null),
    });

    const response = await handler(createRequest({ headers: { authorization: undefined } }));

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toMatchObject({
      type: "https://taxpulse.example/problems/authentication-required",
      title: "Authentication Required",
      status: 401,
    });
    expect(controller.findByCaseId).not.toHaveBeenCalled();
    expect(controller.transition).not.toHaveBeenCalled();
  });

  test("records denied transitions when the role is not authorized", async () => {
    const controller = {
      findByCaseId: vi.fn(async () => reviewCycle),
      transition: vi.fn(),
    };
    const record = vi.fn(async () => undefined);
    const auditLogger = { info: vi.fn() };
    const handler = createPresentToClientLambdaHandler({
      controller,
      auditEntryWriter: { record },
      auditLogger,
      authenticator: createAuthenticator({
        tenantId: "tenant-001",
        userId: "advisor-001",
        role: "Advisor",
        permissions: ["EDIT"],
      }),
    });

    const response = await handler(
      createRequest({
        body: JSON.stringify({
          action_item: {
            description: "Send the client presentation packet",
            deadline: "2026-08-14",
          },
        }),
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
    expect(controller.transition).not.toHaveBeenCalled();
  });
});
