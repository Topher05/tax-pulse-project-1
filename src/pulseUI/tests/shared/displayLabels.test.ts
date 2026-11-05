import { describe, expect, test } from "vitest";

import {
  buildTaxPlanCycleLabels,
  displayClientName,
  displayDocumentTitle,
  displayPersonName,
  displaySectionPath,
  formatPlanningPeriod,
  formatTaxPlanLabel,
  removeTechnicalIdentifiers,
} from "../../shared/displayLabels.ts";

describe("display labels", () => {
  test("formats quarterly and custom planning periods", () => {
    expect(formatPlanningPeriod("2026-Q2")).toBe("Q2 2026");
    expect(formatPlanningPeriod("2026 Annual Review")).toBe("2026 Annual Review");
  });

  test("builds a tax plan name without exposing an identifier", () => {
    expect(formatTaxPlanLabel({
      clientName: "North Shore Family Office",
      planningPeriod: "2026-Q2",
    })).toBe("North Shore Family Office · Q2 2026 Tax Plan");
  });

  test("replaces unresolved identifiers with clear unavailable labels", () => {
    const identifier = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01";
    expect(displayClientName(identifier)).toBe("Client unavailable");
    expect(displayPersonName(identifier)).toBe("User unavailable");
    expect(displayPersonName("advisor-001")).toBe("User unavailable");
  });

  test("removes internal identifiers from application-generated text", () => {
    expect(removeTechnicalIdentifiers("Updated case-001 from record-22")).toBe(
      "Updated tax plan from record",
    );
    expect(
      removeTechnicalIdentifiers("Loaded 018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01"),
    ).toBe("Loaded record");
    expect(displayDocumentTitle("document-4100")).toBe("Document unavailable");
    expect(displaySectionPath("section-alpha")).toBe("Section unavailable");
  });

  test("uses event dates or deterministic plan numbers for duplicate labels", () => {
    const dated = buildTaxPlanCycleLabels([
      { id: "b", clientKey: "client", clientName: "Client", planningPeriod: "2026-Q2", earliestEventAt: "2026-02-02" },
      { id: "a", clientKey: "client", clientName: "Client", planningPeriod: "2026-Q2", earliestEventAt: "2026-01-01" },
    ]);
    expect(dated.get("a")).toBe("Client · Q2 2026 Tax Plan · Created 2026-01-01");
    expect(dated.get("b")).toBe("Client · Q2 2026 Tax Plan · Created 2026-02-02");

    const numbered = buildTaxPlanCycleLabels([
      { id: "b", clientKey: "client", clientName: "Client", planningPeriod: "Annual" },
      { id: "a", clientKey: "client", clientName: "Client", planningPeriod: "Annual" },
    ]);
    expect(numbered.get("a")).toBe("Client · Annual Tax Plan · Plan 1");
    expect(numbered.get("b")).toBe("Client · Annual Tax Plan · Plan 2");
  });
});
