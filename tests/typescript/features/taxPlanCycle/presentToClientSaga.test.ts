import { describe, expect, test, vi } from "vitest";

import { createPresentToClientSaga } from "../../../../src/typescript/features/taxPlanCycle/infrastructure/CloudEvents/presentToClientSaga/index.js";
import type { TaxPlanCycle } from "../../../../src/typescript/features/taxPlanCycle/index.js";

describe("createPresentToClientSaga", () => {
  test("publishes the action item and leaves the cycle in Client Approval", async () => {
    const transitionedCycle: TaxPlanCycle = {
      id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91",
      client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e92",
      stage: "Client Approval",
      owner: "advisor-001",
      priority: "high",
      due_date: "2026-08-21",
      on_hold: false,
    };
    const repository = {
      transition: vi.fn(),
    };
    const stageChangedEventPublisher = {
      publishStageChanged: vi.fn(async () => undefined),
    };
    const actionItemEventPublisher = {
      publishActionItemCreated: vi.fn(async () => undefined),
    };
    const saga = createPresentToClientSaga({
      repository,
      stageChangedEventPublisher,
      actionItemEventPublisher,
    });

    await saga.run({
      transitionedCycle,
      tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e93",
      caseId: transitionedCycle.id,
      actor: "advisor-001",
      actionItem: {
        description: "Send the client checklist",
        deadline: "2026-08-22",
      },
    });

    expect(actionItemEventPublisher.publishActionItemCreated).toHaveBeenCalledWith({
      tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e93",
      caseId: transitionedCycle.id,
      actor: "advisor-001",
      description: "Send the client checklist",
      deadline: "2026-08-22",
    });
    expect(repository.transition).not.toHaveBeenCalled();
    expect(stageChangedEventPublisher.publishStageChanged).not.toHaveBeenCalled();
  });

  test("compensates by reverting the cycle to Review when action-item publishing fails", async () => {
    const transitionedCycle: TaxPlanCycle = {
      id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e94",
      client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e95",
      stage: "Client Approval",
      owner: "advisor-001",
      priority: "high",
      due_date: "2026-08-21",
      on_hold: false,
    };
    const revertedCycle: TaxPlanCycle = {
      ...transitionedCycle,
      stage: "Review",
    };
    const repository = {
      transition: vi.fn(async () => revertedCycle),
    };
    const stageChangedEventPublisher = {
      publishStageChanged: vi.fn(async () => undefined),
    };
    const actionItemEventPublisher = {
      publishActionItemCreated: vi.fn(async () => {
        throw new Error("action-item publish failed");
      }),
    };
    const saga = createPresentToClientSaga({
      repository,
      stageChangedEventPublisher,
      actionItemEventPublisher,
    });

    await expect(
      saga.run({
        transitionedCycle,
        tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e96",
        caseId: transitionedCycle.id,
        actor: "advisor-001",
        actionItem: {
          description: "Send the client checklist",
          deadline: "2026-08-22",
        },
      }),
    ).rejects.toThrow("action-item publish failed");

    expect(repository.transition).toHaveBeenCalledWith({
      tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e96",
      caseId: transitionedCycle.id,
      toStage: "Review",
      actor: "advisor-001",
    });
    expect(stageChangedEventPublisher.publishStageChanged).toHaveBeenCalledWith({
      tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e96",
      caseId: transitionedCycle.id,
      fromStage: "Client Approval",
      toStage: "Review",
      actor: "advisor-001",
    });
  });
});
