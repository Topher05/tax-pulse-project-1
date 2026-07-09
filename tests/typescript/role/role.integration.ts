// scaffold-only integration coverage kept as a placeholder for
// eventual role repository work; do not expand this file until that refactor lands.
import type { Client } from "pg";
import { describe, test } from "vitest";

import { withDockerDrizzleSeededDatabase } from "../bootstrap/migrationTestUtils.js";

async function stubRoleIntegrationState(_client: Client): Promise<void> {
  return;
}

async function withRoleIntegrationDatabase<T>(
  callback: (client: Client) => Promise<T>,
): Promise<T> {
  return withDockerDrizzleSeededDatabase(async (client) => {
    await stubRoleIntegrationState(client);
    return callback(client);
  });
}

describe.skip("role integration tests", () => {
  test("keeps the role module scaffold ready for future relationship coverage", async () => {
    await withRoleIntegrationDatabase(async () => undefined);
  });
});
