import { expect, test, type Page } from "@playwright/test";

import { pulseAccessTokenStorageKey } from "../app/authSession.ts";

const selectedCaseId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d12";

const advisorAccessToken = createSyntheticAccessToken({
  sub: "user-synthetic-001",
  role: "Advisor",
  tenant_id: "tenant-synthetic-001",
  exp: Math.floor(Date.now() / 1_000) + 3_600,
});

const authenticatedSessionResponse = {
  access_token: advisorAccessToken,
  token_type: "Bearer" as const,
  expires_in: 900,
  refresh_expires_in: 2_592_000,
};

const queueRows = [
  {
    id: selectedCaseId,
    client_id: "North Shore Family Office",
    stage: "Modeling",
    owner: "Maya Reed",
    priority: "high",
    due_date: "2026-05-12",
    on_hold: false,
    hold_reason: null,
    is_overdue: true,
    updated_at: "2026-05-11T00:00:00Z",
  },
  {
    id: "TP-24021",
    client_id: "Harbor Point Advisors",
    stage: "Review",
    owner: "Jordan Kim",
    priority: "medium",
    due_date: "2026-06-03",
    on_hold: false,
    hold_reason: null,
    is_overdue: false,
    updated_at: "2026-05-29T00:00:00Z",
  },
  {
    id: "TP-24027",
    client_id: "Cedar Ridge Wealth",
    stage: "Modeling",
    owner: "Avery Chen",
    priority: "low",
    due_date: "2026-06-06",
    on_hold: false,
    hold_reason: null,
    is_overdue: false,
    updated_at: "2026-05-31T00:00:00Z",
  },
  {
    id: "TP-24033",
    client_id: "Summit View Partners",
    stage: "Executed",
    owner: "Noah Patel",
    priority: "high",
    due_date: "2026-06-09",
    on_hold: false,
    hold_reason: null,
    is_overdue: false,
    updated_at: "2026-06-01T00:00:00Z",
  },
  {
    id: "TP-24038",
    client_id: "Beacon Street Group",
    stage: "Review",
    owner: "Isla Torres",
    priority: "medium",
    due_date: "2026-06-12",
    on_hold: false,
    hold_reason: null,
    is_overdue: false,
    updated_at: "2026-06-04T00:00:00Z",
  },
] as const;

const detailResponse = {
  id: selectedCaseId,
  client_id: "North Shore Family Office",
  stage: "Review",
  owner: "Maya Reed",
  priority: "high",
  due_date: "2026-05-12",
  on_hold: false,
  hold_reason: null,
  scenarios: [],
} as const;

function createSyntheticAccessToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");

  return `${header}.${body}.synthetic-signature`;
}

async function prepareAdvisorSession(page: Page): Promise<void> {
  await page.addInitScript(
    ({ storageKey, accessToken }) => {
      localStorage.setItem(storageKey, accessToken);
    },
    {
      storageKey: pulseAccessTokenStorageKey,
      accessToken: advisorAccessToken,
    },
  );

  await page.route("**/auth/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      json: authenticatedSessionResponse,
    });
  });

  await page.route("**/v1/tax-plan-cycles", async (route) => {
    await route.fulfill({
      status: 200,
      json: queueRows,
    });
  });

  await page.route(`**/v1/tax-plan-cycles/${selectedCaseId}`, async (route) => {
    await route.fulfill({
      status: 200,
      json: detailResponse,
    });
  });
}

test("advisor can open the queue, open a case, and submit a scenario", async ({ page }) => {
  await prepareAdvisorSession(page);

  await page.goto("/cycles/queue");

  await expect(page.getByRole("heading", { name: "Tax Plan Cycle Queue" })).toBeVisible();
  await page.getByRole("button", { name: "Open" }).first().click();
  await expect(
    page.getByRole("heading", { name: "North Shore Family Office - Q2 2026 Tax Plan" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Scenario Planner" }).click();
  await page.goto(`/scenarios?caseId=${selectedCaseId}`);
  await expect(page.getByRole("heading", { name: "Scenario Planner", level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "New scenario" })).toBeEnabled();
  await page.getByRole("button", { name: "New scenario" }).click();
  await expect(page.getByRole("dialog", { name: "New What-If Scenario" })).toBeVisible();

  await page.getByLabel("Scenario Name").fill("Freelance consulting engagement");
  await page.getByLabel("Description").fill("Add a synthetic advisory project for Q3 planning.");
  await page.getByLabel("Additional Income").fill("25000");
  await page.getByLabel("Additional Deductions").fill("4200");
  await page.getByLabel("Income Type").selectOption("se");
  await page.getByRole("button", { name: "Add additional scenario" }).click();

  const scenarioNameInputs = page.getByLabel("Scenario Name");
  const descriptionInputs = page.getByLabel("Description");
  const incomeInputs = page.getByLabel("Additional Income");
  const deductionInputs = page.getByLabel("Additional Deductions");
  const incomeTypeSelects = page.getByLabel("Income Type");

  await scenarioNameInputs.nth(1).fill("Sell a rental property");
  await descriptionInputs.nth(1).fill("Capture a capital gain event.");
  await incomeInputs.nth(1).fill("12000");
  await deductionInputs.nth(1).fill("2500");
  await incomeTypeSelects.nth(1).selectOption("cg");

  await page.getByRole("button", { name: "Create Scenario" }).click();

  await expect(page.getByRole("dialog", { name: "New What-If Scenario" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Scenario Planner", level: 1 })).toBeVisible();
});
