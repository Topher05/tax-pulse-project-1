import type { ActionItemCreatedEventInput, ActionItemCreatedEventPublishInput } from "../../actionItemCreatedEvent.js";
import type { StageChangedEventPublishInput } from "../../stageChangedEvent.js";
import type { TaxPlanCycle } from "../../taxPlanCycle.js";
import type { TaxPlanCycleRepository } from "../../repositories/repository.js";

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

export function createPresentToClientSaga(
  options: PresentToClientSagaOptions,
): PresentToClientSaga {
  return {
    async run(input: PresentToClientSagaInput): Promise<void> {
      if (!options.actionItemEventPublisher) {
        return;
      }

      try {
        await options.actionItemEventPublisher.publishActionItemCreated({
          tenantId: input.tenantId,
          caseId: input.caseId,
          actor: input.actor,
          ...input.actionItem,
        });
      } catch (error) {
        try {
          const revertedCycle = await options.repository.transition({
            tenantId: input.tenantId,
            caseId: input.caseId,
            toStage: "Review",
            actor: input.actor,
          });

          if (revertedCycle && options.stageChangedEventPublisher) {
            await options.stageChangedEventPublisher.publishStageChanged({
              tenantId: input.tenantId,
              caseId: input.caseId,
              fromStage: input.transitionedCycle.stage,
              toStage: revertedCycle.stage,
              actor: input.actor,
            });
          }
        } catch {
          // Preserve the original action-item failure.
        }

        throw error;
      }
    },
  };
}
