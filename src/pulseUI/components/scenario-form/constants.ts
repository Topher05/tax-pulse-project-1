export const scenarioMinCount = 2;
export const scenarioMaxCount = 5;

export const incomeTypeOptions = [
  { value: "rt", label: "Rental" },
  { value: "cg", label: "Capital Gains" },
  { value: "se", label: "1099/Self-Employment" },
  { value: "w2", label: "W-2 Employment" },
] as const;

export function createScenarioEntry() {
  return {
    scenarioName: "",
    description: "",
    additionalIncome: undefined,
    additionalDeductions: undefined,
    incomeType: "w2" as const,
  };
}

