import type { TaxPlanCycle } from "../../../features/taxPlanCycle/taxPlanCycle.js";
import {
  createExecuteLambdaHandler,
  type ExecuteLambdaRequest,
  type ExecuteLambdaResponse,
} from "./index.js";

export interface ExecuteLambdaRuntime {
  handler(event: ExecuteLambdaRequest): Promise<ExecuteLambdaResponse>;
}

let runtimePromise: Promise<ExecuteLambdaRuntime> | undefined;

async function createRuntime(): Promise<ExecuteLambdaRuntime> {
  // AWS stub composition root for SCRUM-160: keep this Lambda free of
  // database wiring until the execute delivery path is promoted to the real
  // persistence-backed runtime.
  const controller = {
    async findByCaseId(input: { tenantId: string; caseId: string }): Promise<TaxPlanCycle | null> {
      void input.tenantId;

      return {
        id: input.caseId,
        client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e97",
        stage: "Client Approval",
        owner: "lambda-stub",
        priority: "medium",
        due_date: "2026-08-14",
        on_hold: false,
      };
    },
    async transition(input: {
      tenantId: string;
      caseId: string;
      fromStage: TaxPlanCycle["stage"];
      toStage: TaxPlanCycle["stage"];
      actor: string;
    }): Promise<TaxPlanCycle | null> {
      void input.tenantId;
      void input.caseId;
      void input.fromStage;
      void input.actor;

      return {
        id: input.caseId,
        client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e97",
        stage: input.toStage,
        owner: "lambda-stub",
        priority: "medium",
        due_date: "2026-08-14",
        on_hold: false,
      };
    },
  };

  return {
    handler: createExecuteLambdaHandler({
      controller,
      auditEntryWriter: {
        async record() {
          return undefined;
        },
      },
    }),
  };
}

async function getRuntime(): Promise<ExecuteLambdaRuntime> {
  runtimePromise ??= createRuntime();
  return await runtimePromise;
}

export async function executeHandler(event: ExecuteLambdaRequest): Promise<ExecuteLambdaResponse> {
  const runtime = await getRuntime();
  return await runtime.handler(event);
}

export async function resetExecuteLambdaRuntimeForTests(): Promise<void> {
  runtimePromise = undefined;
}
