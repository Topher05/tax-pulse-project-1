import { once } from "node:events";
import type { AddressInfo } from "node:net";

import { describe, expect, test, vi } from "vitest";

import { assistPromptLeakCanary } from "../../../src/typescript/assist/explanation.js";
import { loadAssistPromptInjectionFixtures } from "../../../src/typescript/assist/promptInjectionFixtures.js";
import {
  createApp,
  createLogger,
} from "../../../src/typescript/index.js";
import {
  createTaxPlanCycleRouter,
  createTaxPlanDetailsAssistantController,
} from "../../../src/typescript/features/taxPlanCycle/index.js";

const caseId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d12";
const tenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01";
const refusalProblemDetails = {
  type: "https://taxpulse.example/problems/assistant-prompt-injection-detected",
  title: "Assistant Request Rejected",
  status: 422,
  detail: "The assistant request could not be processed safely.",
};

describe("assist prompt-injection endpoint", () => {
  test("refuses every checked-in attack without leaking policy or cross-tenant data", async () => {
    const fixtures = loadAssistPromptInjectionFixtures();
    const retrieve = vi.fn(async () => {
      throw new Error("prompt-injection requests must be rejected before retrieval");
    });
    const explain = vi.fn(async () => {
      throw new Error("prompt-injection requests must be rejected before explanation");
    });
    const assistantController = createTaxPlanDetailsAssistantController({
      taxPlanCycleRepository: {
        async findByCaseId() {
          return { id: caseId };
        },
      },
      tenantScopeMap: new Map([[tenantId, "tenant-alpha"]]),
      retriever: { retrieve },
      explanationProvider: { explain },
    });
    const app = createApp({
      logger: createLogger({ level: "silent" }),
      registerRoutes(app) {
        app.use((req, _res, next) => {
          req.tenant = { id: tenantId };
          req.user = { id: "advisor-001", role: "Advisor" };
          next();
        });
        app.use(
          "/v1",
          createTaxPlanCycleRouter({
            assistantController,
            controller: {
              create: vi.fn(),
              findByCaseId: vi.fn(async () => null),
            },
          }),
        );
      },
    });
    const server = app.listen(0);
    await once(server, "listening");

    try {
      const address = server.address() as AddressInfo;
      const endpoint = `http://127.0.0.1:${address.port}/v1/tax-plan-cycles/${caseId}/assist`;

      for (const fixture of fixtures) {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            recommendation_context: {
              recommendation: fixture.recommendation,
              ...(fixture.question === undefined ? {} : { question: fixture.question }),
            },
          }),
        });
        const body = (await response.json()) as unknown;
        const serializedBody = JSON.stringify(body).toLowerCase();

        expect(response.status, fixture.id).toBe(422);
        expect(response.headers.get("content-type"), fixture.id).toContain(
          "application/problem+json",
        );
        expect(body, fixture.id).toEqual(refusalProblemDetails);

        for (const forbiddenMarker of [
          assistPromptLeakCanary,
          "system prompt",
          "system instructions",
          "developer instructions",
          "hidden policy",
          "tenant-alpha",
          "tenant-beta",
          "syn-pb-03",
          "syn-tc-4120",
          "syn-tc-4300",
        ]) {
          expect(serializedBody, `${fixture.id} leaked ${forbiddenMarker}`).not.toContain(
            forbiddenMarker.toLowerCase(),
          );
        }
      }
    } finally {
      server.close();
      await once(server, "close");
    }

    expect(retrieve).not.toHaveBeenCalled();
    expect(explain).not.toHaveBeenCalled();
  });
});
