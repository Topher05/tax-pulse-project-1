import { once } from "node:events";
import type { AddressInfo } from "node:net";

import { SignJWT } from "jose";
import { afterEach, describe, expect, test, vi } from "vitest";

const repository = vi.hoisted(() => ({
  create: vi.fn(async () => "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91"),
  insert: vi.fn(),
  findByCaseId: vi.fn(async () => ({
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91",
    client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e11",
    stage: "Intake",
    owner: "postman-test-owner",
    priority: "high",
    due_date: "2026-12-31",
    on_hold: false,
  })),
  listQueue: vi.fn(),
}));
const createTaxPlanCycleRepository = vi.hoisted(() => vi.fn(() => repository));

vi.mock("pg", () => ({
  default: {
    Client: class {
      async connect(): Promise<void> {}
    },
  },
}));

vi.mock("../../src/typescript/taxPlanCycleRepository.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/typescript/taxPlanCycleRepository.js")>()),
  createTaxPlanCycleRepository,
}));

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
  vi.clearAllMocks();
});

async function createAccessToken(): Promise<string> {
  return await new SignJWT({
    role: "Advisor",
    tenant_id: "tenant-from-jwt",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject("user-from-jwt")
    .setIssuer(process.env.JWT_ISSUER!)
    .setExpirationTime("15m")
    .sign(new TextEncoder().encode(process.env.JWT_SIGNING_SECRET!));
}

describe("main Tax Plan Cycle composition", () => {
  test("uses the repository-backed controller for protected creates and reads", async () => {
    process.env = {
      ...originalEnvironment,
      DATABASE_URL: "postgresql://test:test@localhost:5432/taxpulse",
      JWT_ISSUER: "https://auth.taxpulse.example",
      JWT_SIGNING_SECRET: "a-unique-test-secret-that-is-more-than-32-bytes",
      JWT_ACCESS_TOKEN_TTL_SECONDS: "900",
      JWT_REFRESH_TOKEN_TTL_SECONDS: "1200",
      LOG_LEVEL: "silent",
      PORT: "0",
    };
    const { main } = await import("../../src/typescript/index.js");
    const server = await main();
    const address = server.address() as AddressInfo;
    const token = await createAccessToken();

    try {
      const createResponse = await fetch(`http://127.0.0.1:${address.port}/v1/tax-plan-cycles`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e11",
          planning_period: "2026-Q4",
          owner: "postman-test-owner",
          priority: "high",
          due_date: "2026-12-31",
        }),
      });
      const readResponse = await fetch(
        `http://127.0.0.1:${address.port}/v1/tax-plan-cycles/018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91`,
        { headers: { authorization: `Bearer ${token}` } },
      );
      const unversionedResponse = await fetch(
        `http://127.0.0.1:${address.port}/tax-plan-cycles`,
      );
      const unknownVersionResponse = await fetch(
        `http://127.0.0.1:${address.port}/v2/tax-plan-cycles`,
      );

      expect(createResponse.status).toBe(202);
      expect(readResponse.status).toBe(200);
      expect(unversionedResponse.status).toBe(404);
      expect(unknownVersionResponse.status).toBe(404);
      expect(createTaxPlanCycleRepository).toHaveBeenCalledTimes(1);
      expect(repository.create).toHaveBeenCalledWith({
        tenantId: "tenant-from-jwt",
        planningPeriod: "2026-Q4",
        clientId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e11",
        owner: "postman-test-owner",
        priority: "high",
        dueDate: "2026-12-31",
        actor: "user-from-jwt",
      });
      expect(repository.findByCaseId).toHaveBeenCalledWith({
        tenantId: "tenant-from-jwt",
        caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91",
      });
    } finally {
      server.close();
      await once(server, "close");
    }
  });
});
