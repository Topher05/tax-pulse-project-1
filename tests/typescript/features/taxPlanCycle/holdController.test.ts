import { describe, expect, test, vi } from "vitest";

import {
  createTaxPlanCycleHoldController,
  type TaxPlanCycle,
  type TaxPlanCycleRepository,
} from "../../../../src/typescript/index.js";

const heldCycle: TaxPlanCycle = {
  id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e31",
  client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e32",
  stage: "Review",
  owner: "advisor-hold-controller",
  priority: "medium",
  due_date: "2026-12-31",
  on_hold: true,
  hold_reason: "Awaiting signed documents",
};

function createRepository(
  setHoldStatus: TaxPlanCycleRepository["setHoldStatus"],
): TaxPlanCycleRepository {
  return {
    create: vi.fn(),
    insert: vi.fn(),
    findByCaseId: vi.fn(async () => heldCycle),
    findCurrentByClientId: vi.fn(async () => null),
    transition: vi.fn(async () => heldCycle),
    setHoldStatus,
    listQueue: vi.fn(async () => []),
  };
}

describe("TaxPlanCycleHoldController", () => {
  test("updates hold state and invalidates queue cache without logging the reason", async () => {
    const setHoldStatus = vi.fn(async () => heldCycle);
    const invalidateAfterHoldChange = vi.fn(async () => undefined);
    const telemetryLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const controller = createTaxPlanCycleHoldController(createRepository(setHoldStatus), {
      queueCacheInvalidator: {
        invalidateAfterStageChange: vi.fn(),
        invalidateAfterDueDateChange: vi.fn(),
        invalidateAfterHoldChange,
      },
      telemetryLogger,
    });

    await expect(
      controller.setHoldStatus({
        tenantId: "tenant-001",
        caseId: heldCycle.id,
        onHold: true,
        holdReason: "Awaiting signed documents",
        actor: "advisor-001",
      }),
    ).resolves.toEqual(heldCycle);

    expect(setHoldStatus).toHaveBeenCalledTimes(1);
    expect(invalidateAfterHoldChange).toHaveBeenCalledWith({
      tenantId: "tenant-001",
      caseId: heldCycle.id,
    });
    expect(JSON.stringify(telemetryLogger.info.mock.calls)).not.toContain(
      "Awaiting signed documents",
    );
  });

  test("does not invalidate cache when the repository returns no cycle", async () => {
    const setHoldStatus = vi.fn(async () => null);
    const invalidateAfterHoldChange = vi.fn(async () => undefined);
    const controller = createTaxPlanCycleHoldController(createRepository(setHoldStatus), {
      queueCacheInvalidator: {
        invalidateAfterStageChange: vi.fn(),
        invalidateAfterDueDateChange: vi.fn(),
        invalidateAfterHoldChange,
      },
    });

    await expect(
      controller.setHoldStatus({
        tenantId: "tenant-001",
        caseId: heldCycle.id,
        onHold: false,
        actor: "advisor-001",
      }),
    ).resolves.toBeNull();

    expect(invalidateAfterHoldChange).not.toHaveBeenCalled();
  });

  test("keeps a successful mutation successful when cache invalidation fails", async () => {
    const setHoldStatus = vi.fn(async () => heldCycle);
    const controller = createTaxPlanCycleHoldController(createRepository(setHoldStatus), {
      queueCacheInvalidator: {
        invalidateAfterStageChange: vi.fn(),
        invalidateAfterDueDateChange: vi.fn(),
        invalidateAfterHoldChange: vi.fn(async () => {
          throw new Error("Redis unavailable");
        }),
      },
    });

    await expect(
      controller.setHoldStatus({
        tenantId: "tenant-001",
        caseId: heldCycle.id,
        onHold: true,
        holdReason: "Awaiting signed documents",
        actor: "advisor-001",
      }),
    ).resolves.toEqual(heldCycle);
  });
});
