import type { AuditEntryWriter } from "../../features/audit/persistence/auditEntryRepository.js";
import type { TaxPlanCycle } from "../../features/taxPlanCycle/taxPlanCycle.js";
import type {
  TaxPlanCycleQueueItem,
  TaxPlanCycleRepository,
} from "../../features/taxPlanCycle/repositories/repository.js";

const lambdaStubClientId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e97";
const lambdaStubOwner = "lambda-stub";
const lambdaStubPriority = "medium";
const lambdaStubDueDate = "2026-08-14";

export function createNoopAuditEntryWriter(): AuditEntryWriter {
  return {
    async record() {
      return undefined;
    },
  };
}

export function createMutableTaxPlanCycleRepository(
  initialStage: TaxPlanCycle["stage"],
): TaxPlanCycleRepository {
  let currentStage = initialStage;

  function materialize(caseId: string): TaxPlanCycle {
    return {
      id: caseId,
      client_id: lambdaStubClientId,
      stage: currentStage,
      owner: lambdaStubOwner,
      priority: lambdaStubPriority,
      due_date: lambdaStubDueDate,
      on_hold: false,
    };
  }

  return {
    async create(): Promise<string> {
      return "lambda-stub-cycle";
    },
    async insert(): Promise<string> {
      return "lambda-stub-cycle";
    },
    async findByCaseId(input: { tenantId: string; caseId: string }): Promise<TaxPlanCycle | null> {
      void input.tenantId;
      return materialize(input.caseId);
    },
    async findCurrentByClientId(input: {
      tenantId: string;
      clientId: string;
    }): Promise<TaxPlanCycle | null> {
      void input.tenantId;
      void input.clientId;
      return null;
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
      void input.fromStage;
      void input.actor;
      void input.actionItem;

      currentStage = input.toStage;
      return materialize(input.caseId);
    },
    async setHoldStatus(input: {
      tenantId: string;
      caseId: string;
      onHold: boolean;
      holdReason?: string;
    }): Promise<TaxPlanCycle | null> {
      void input.tenantId;
      void input.onHold;
      void input.holdReason;
      return materialize(input.caseId);
    },
    async listQueue(input: { tenantId: string; asOfDate?: string }): Promise<TaxPlanCycleQueueItem[]> {
      void input.tenantId;
      void input.asOfDate;
      return [];
    },
  };
}
