import { describe, expect, test, vi } from "vitest";

import {
  createTaxPlanCycleTransitionController,
  type TaxPlanCycle,
  type TaxPlanCycleRepository,
} from "../../../../src/typescript/index.js";

const originalCycle: TaxPlanCycle = {
  id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91",
  client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e92",
  stage: "Intake",
  owner: "advisor-controller-001",
  priority: "medium",
  due_date: "2026-12-31",
  on_hold: false,
};

const transitionedCycle: TaxPlanCycle = {
  ...originalCycle,
  stage: "Data Aggregation",
};

function createRepository(
  transition: TaxPlanCycleRepository["transition"],
): TaxPlanCycleRepository {
  return {
    create: vi.fn(),
    insert: vi.fn(),
    findByCaseId: vi.fn(async () => originalCycle),
    transition,
    listQueue: vi.fn(async () => []),
  };
}

describe("TaxPlanCycleTransitionController", () => {
  test("publishes a stage-changed event after a successful repository transition", async () => {
    const publishStageChanged = vi.fn(async () => undefined);
    const transition = vi.fn(async () => transitionedCycle);
    const controller = createTaxPlanCycleTransitionController(
      createRepository(transition),
      {
        stageChangedEventPublisher: { publishStageChanged },
      },
    );

    await expect(
      controller.transition({
        tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e93",
        caseId: originalCycle.id,
        fromStage: "Intake",
        toStage: "Data Aggregation",
        actor: "advisor-controller-001",
      }),
    ).resolves.toEqual(transitionedCycle);

    expect(transition).toHaveBeenCalledTimes(1);
    expect(publishStageChanged).toHaveBeenCalledWith({
      tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e93",
      caseId: originalCycle.id,
      fromStage: "Intake",
      toStage: "Data Aggregation",
      actor: "advisor-controller-001",
    });
  });

  test("does not publish when the repository reports a missing case", async () => {
    const publishStageChanged = vi.fn(async () => undefined);
    const controller = createTaxPlanCycleTransitionController(
      createRepository(vi.fn(async () => null)),
      {
        stageChangedEventPublisher: { publishStageChanged },
      },
    );

    await expect(
      controller.transition({
        tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e93",
        caseId: originalCycle.id,
        fromStage: "Intake",
        toStage: "Data Aggregation",
        actor: "advisor-controller-001",
      }),
    ).resolves.toBeNull();

    expect(publishStageChanged).not.toHaveBeenCalled();
  });

  test("keeps a committed transition successful when SNS publishing fails", async () => {
    const publishError = new Error("SNS publish failed");
    const publishStageChanged = vi.fn(async () => {
      throw publishError;
    });
    const controller = createTaxPlanCycleTransitionController(
      createRepository(vi.fn(async () => transitionedCycle)),
      {
        stageChangedEventPublisher: { publishStageChanged },
      },
    );

    await expect(
      controller.transition({
        tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e93",
        caseId: originalCycle.id,
        fromStage: "Intake",
        toStage: "Data Aggregation",
        actor: "advisor-controller-001",
      }),
    ).resolves.toEqual(transitionedCycle);
    expect(publishStageChanged).toHaveBeenCalledTimes(1);
  });
});
