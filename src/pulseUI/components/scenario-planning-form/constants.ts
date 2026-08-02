export const scenarioPlanningMinCount = 2;
export const scenarioPlanningMaxCount = 5;

export const scenarioPlanningIncomeTypeOptions = [
  { value: "rt", label: "Rental" },
  { value: "cg", label: "Capital Gains" },
  { value: "se", label: "1099/Self-Employment" },
  { value: "w2", label: "W-2 Employment" },
] as const;

export function createScenarioPlanningEntry() {
  return {
    scenarioName: "",
    description: "",
    additionalIncome: undefined,
    additionalDeductions: undefined,
    incomeType: "w2" as const,
  };
}

