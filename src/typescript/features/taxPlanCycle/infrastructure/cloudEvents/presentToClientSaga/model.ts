import type {
  ActionItemCreatedEventInput,
  ActionItemCreatedEventPublishInput,
} from "../actionItemCreated/index.js";
import type { StageChangedEventPublishInput } from "../stageChanged/index.js";
import type { TaxPlanCycle } from "../../../taxPlanCycle.js";
import type { TaxPlanCycleRepository } from "../../../repositories/repository.js";

export interface PresentToClientStageChangedEventPublisher {
  publishStageChanged(
    input: StageChangedEventPublishInput,
  ): Promise<void> | void;
}

export interface PresentToClientActionItemCreatedEventPublisher {
  publishActionItemCreated(
    input: ActionItemCreatedEventPublishInput,
  ): Promise<void> | void;
}

export interface PresentToClientSagaOptions {
  repository: Pick<TaxPlanCycleRepository, "transition">;
  stageChangedEventPublisher?: PresentToClientStageChangedEventPublisher;
  actionItemEventPublisher?: PresentToClientActionItemCreatedEventPublisher;
}

export interface PresentToClientSagaInput {
  transitionedCycle: TaxPlanCycle;
  tenantId: string;
  caseId: string;
  actor: string;
  actionItem: ActionItemCreatedEventInput;
}

export interface PresentToClientSaga {
  run(input: PresentToClientSagaInput): Promise<void>;
}
