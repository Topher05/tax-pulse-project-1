import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

import {
  Matchers,
  Pact,
  SpecificationVersion,
} from "@pact-foundation/pact";
import { beforeAll, describe, expect, test } from "vitest";

import { createTaxEngineClient } from "../../../../src/typescript/index.js";

const pactsDir = resolve(process.cwd(), "pacts");
const pactFile = resolve(pactsDir, "CoreCaseService-TaxCalculationEngine.json");
const tenantId = "tenant-001";
const authorizationHeader = "Bearer synthetic-access-token";

const pact = new Pact({
  consumer: "CoreCaseService",
  provider: "TaxCalculationEngine",
  dir: pactsDir,
  spec: SpecificationVersion.SPECIFICATION_VERSION_V4,
  logLevel: "warn",
});

const calculationRequest = {
  tenantId,
  authorizationHeader,
  income: 100000,
  deductions: 12000,
  withholding: 24500,
  state: "CA",
  filing_status: "single" as const,
};

const calculationRequestBody = {
  income: 100000,
  deductions: 12000,
  withholding: 24500,
  state: "CA",
  filing_status: "single",
};

const calculationResponse = {
  income: "100000",
  deductions: "12000",
  state: "CA",
  filing_status: "single",
  taxable_income: "88000",
  federal_liability: "14072.00",
  state_liability: "4622.64",
  total_liability: "18694.64",
  effective_rate: "0.2124",
  marginal_rate: "0.3130",
  currency: "USD",
};

const scenarioComparisonRequest = {
  tenantId,
  authorizationHeader,
  baseline: {
    income: 100000,
    deductions: 12000,
    state: "CA",
    filing_status: "single" as const,
  },
  scenarios: [
    {
      name: "Increase deductions",
      typed_figures: {
        income: 100000,
        deductions: 20000,
        state: "CA",
        filing_status: "single" as const,
      },
    },
    {
      name: "Keep baseline",
      typed_figures: {
        income: 100000,
        deductions: 12000,
        state: "CA",
        filing_status: "single" as const,
      },
    },
    {
      name: "Increase income",
      typed_figures: {
        income: 110000,
        deductions: 12000,
        state: "CA",
        filing_status: "single" as const,
      },
    },
  ],
};

const scenarioComparisonRequestBody = {
  baseline: scenarioComparisonRequest.baseline,
  scenarios: scenarioComparisonRequest.scenarios,
};

const scenarioComparisonResponse = [
  {
    name: "Increase deductions",
    total_tax: "16190.64",
    delta_vs_baseline: "-2504.00",
  },
  {
    name: "Keep baseline",
    total_tax: "18694.64",
    delta_vs_baseline: "0.00",
  },
  {
    name: "Increase income",
    total_tax: "21824.64",
    delta_vs_baseline: "3130.00",
  },
];

describe("Tax Engine consumer pact", () => {
  beforeAll(() => {
    rmSync(pactFile, { force: true });
    mkdirSync(pactsDir, { recursive: true });
  });

  test("records the single calculation request and response shape", async () => {
    await pact
      .addInteraction()
      .given("the tax calculation engine can calculate a single filing")
      .uponReceiving("a tax calculation request from the Core service")
      .withRequest("POST", "/tax-calculations", (builder) => {
        builder.headers({
          authorization: authorizationHeader,
          "x-taxpulse-tenant-id": tenantId,
        });
        builder.jsonBody(calculationRequestBody);
      })
      .willRespondWith(200, (builder) => {
        builder.headers({ "Content-Type": "application/json" });
        builder.jsonBody(Matchers.like(calculationResponse));
      })
      .executeTest(async (mockServer) => {
        const client = createTaxEngineClient({
          baseUrl: mockServer.url,
          maxAttempts: 1,
          timeoutMs: 5_000,
        });

        await expect(client.calculateTax(calculationRequest)).resolves.toStrictEqual(
          calculationResponse,
        );
      });
  });

  test("records the scenario comparison request and response shape", async () => {
    await pact
      .addInteraction()
      .given("the tax calculation engine can compare three scenarios")
      .uponReceiving("a scenario comparison request from the Core service")
      .withRequest("POST", "/scenarios/comparisons", (builder) => {
        builder.headers({
          authorization: authorizationHeader,
          "x-taxpulse-tenant-id": tenantId,
        });
        builder.jsonBody(scenarioComparisonRequestBody);
      })
      .willRespondWith(200, (builder) => {
        builder.headers({ "Content-Type": "application/json" });
        builder.jsonBody(Matchers.like(scenarioComparisonResponse));
      })
      .executeTest(async (mockServer) => {
        const client = createTaxEngineClient({
          baseUrl: mockServer.url,
          maxAttempts: 1,
          timeoutMs: 5_000,
        });

        await expect(
          client.compareScenarios(scenarioComparisonRequest),
        ).resolves.toStrictEqual(scenarioComparisonResponse);
      });
  });
});
