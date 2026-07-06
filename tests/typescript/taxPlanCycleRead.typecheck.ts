import type { Client } from "pg";

import { createTaxPlanCycleReadHelper } from "../../src/typescript/index.js";

declare const client: Pick<Client, "query">;

const readHelper = createTaxPlanCycleReadHelper(client);

// @ts-expect-error tenantId is required for every cycle read
readHelper.findByCaseId({ caseId: "case-123" });

void readHelper.findByCaseId({
  tenantId: "tenant-123",
  caseId: "case-123",
});
