import { describe, expect, test, vi } from "vitest";

import {
  createIncomeEventService,
  type IncomeEventRepository,
} from "../../../../src/typescript/index.js";

describe("createIncomeEventService", () => {
  test("assigns the current UTC date and preserves not-found results", async () => {
    const create = vi.fn(async () => null);
    const repository: IncomeEventRepository = {
      listByCase: async () => null,
      create,
    };
    const service = createIncomeEventService(repository, {
      clock: () => new Date("2026-08-31T23:59:59.000Z"),
    });

    await expect(
      service.listByCase({ tenantId: "tenant-1", caseId: "case-1" }),
    ).resolves.toBeNull();
    await service.create({
      tenantId: "tenant-1",
      caseId: "case-1",
      source: "Acme Corporation",
      type: "w2",
      amount: 1000,
      withholding: 200,
    });

    expect(create).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      caseId: "case-1",
      date: "2026-08-31",
      source: "Acme Corporation",
      type: "w2",
      amount: 1000,
      withholding: 200,
    });
  });
});
