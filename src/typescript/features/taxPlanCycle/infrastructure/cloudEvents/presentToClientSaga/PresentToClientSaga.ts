import type {
  PresentToClientSaga,
  PresentToClientSagaInput,
  PresentToClientSagaOptions,
} from "./model.js";

export function createPresentToClientSaga(
  options: PresentToClientSagaOptions,
): PresentToClientSaga {
  return {
    async run(input: PresentToClientSagaInput): Promise<void> {
      //CL, Compensation boundary: the saga owns rollback behavior if the action item publish fails after the main transition has already completed.
      if (!options.actionItemEventPublisher) {
        return;
      }

      try {
        console.info({
          message: "present-to-client action-item publish starting",
          tenant_id: input.tenantId,
          case_id: input.caseId,
          actor: input.actor,
          from_stage: input.transitionedCycle.stage,
          to_stage: "Client Approval",
        });
        await options.actionItemEventPublisher.publishActionItemCreated({
          tenantId: input.tenantId,
          caseId: input.caseId,
          actor: input.actor,
          ...input.actionItem,
        });
        console.info({
          message: "present-to-client action-item publish completed",
          tenant_id: input.tenantId,
          case_id: input.caseId,
          actor: input.actor,
          from_stage: input.transitionedCycle.stage,
          to_stage: "Client Approval",
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
