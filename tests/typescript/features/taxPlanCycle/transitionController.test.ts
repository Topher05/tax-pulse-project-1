import { describe, expect, test, vi } from "vitest";

import {
  createTaxPlanCycleTransitionController,
  type StageChangedEventPublisher,
  type TaxPlanCycle,
  type TaxPlanCycleRepository,
} from "../../../../src/typescript/index.js";

describe("createTaxPlanCycleTransitionController", () => {
  test("publishes the stage-changed payload after a successful transition", async () => {
    const transitionedCycle: TaxPlanCycle = {
      id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e71",
      client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e72",
      stage: "Review",
      owner: "advisor-001",
      priority: "high",
      due_date: "2026-08-01",
      on_hold: false,
    };
    const repository: TaxPlanCycleRepository = {
      create: vi.fn(),
      insert: vi.fn(),
      listQueue: vi.fn(),
      transition: vi.fn(async () => transitionedCycle),
      findByCaseId: vi.fn(async () => transitionedCycle),
    };
    const publisher: StageChangedEventPublisher = {
      publishStageChanged: vi.fn(async () => undefined),
    };
    const controller = createTaxPlanCycleTransitionController(repository, {
      stageChangedEventPublisher: publisher,
    });

    const result = await controller.transition({
      tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e73",
      caseId: transitionedCycle.id,
      fromStage: "Modeling",
      toStage: "Review",
      actor: "advisor-001",
    });

    expect(result).toBe(transitionedCycle);
    expect(repository.transition).toHaveBeenCalledWith({
      tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e73",
      caseId: transitionedCycle.id,
      fromStage: "Modeling",
      toStage: "Review",
      actor: "advisor-001",
    });
    expect(publisher.publishStageChanged).toHaveBeenCalledWith({
      tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e73",
      caseId: transitionedCycle.id,
      fromStage: "Modeling",
      toStage: "Review",
      actor: "advisor-001",
    });
  });
});
