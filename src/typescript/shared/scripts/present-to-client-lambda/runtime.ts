import type { TaxPlanCycle } from "../../../features/taxPlanCycle/taxPlanCycle.js";
import {
  createPresentToClientLambdaHandler,
  type PresentToClientLambdaRequest,
  type PresentToClientLambdaResponse,
} from "./index.js";

export interface PresentToClientLambdaRuntime {
  handler(event: PresentToClientLambdaRequest): Promise<PresentToClientLambdaResponse>;
}

let runtimePromise: Promise<PresentToClientLambdaRuntime> | undefined;

async function createRuntime(): Promise<PresentToClientLambdaRuntime> {
  // AWS stub composition root for SCRUM-160: keep this Lambda free of
  // database and Redis wiring until the SNS/SQS cutover work is available.
  const controller = {
    async findByCaseId(input: { tenantId: string; caseId: string }): Promise<TaxPlanCycle | null> {
      void input.tenantId;
      return {
        id: input.caseId,
        client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e97",
        stage: "Review",
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
      actionItem?: {
        description: string;
        deadline: string;
        completed?: boolean;
      };
    }): Promise<TaxPlanCycle | null> {
      void input.tenantId;
      void input.caseId;
      void input.fromStage;
      void input.actor;
      void input.actionItem;

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
    handler: createPresentToClientLambdaHandler({
      controller,
      auditEntryWriter: {
        async record() {
          return undefined;
        },
      },
    }),
  };
}

async function getRuntime(): Promise<PresentToClientLambdaRuntime> {
  runtimePromise ??= createRuntime();
  return await runtimePromise;
}

export async function presentToClientHandler(
  event: PresentToClientLambdaRequest,
): Promise<PresentToClientLambdaResponse> {
  const runtime = await getRuntime();
  return await runtime.handler(event);
}

export async function resetPresentToClientLambdaRuntimeForTests(): Promise<void> {
  runtimePromise = undefined;
}
