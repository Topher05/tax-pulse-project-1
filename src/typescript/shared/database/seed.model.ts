import type {
  TaxPlanCyclePriority,
  TaxPlanCycleStage,
} from "../../features/taxPlanCycle/taxPlanCycle.js";

export type SeedTenantRow = {
  id: string;
  name: string;
  createdAt: Date;
  loginSlug: string;
  isActive: boolean;
};

export type SeedRoleRow = {
  id: number;
  role: "Firm Admin" | "Advisor" | "Client" | "TaxPulse Platform Admin";
};

export type SeedUserStatusRow = {
  id: number;
  status: "invited" | "active" | "disabled";
};

export type SeedUserRow = {
  id: string;
  tenantId: string;
  email: string;
  roleId: number;
  statusId: number;
};

export type SeedCredentialRow = {
  id: string;
  userId: string;
  passwordHash: string;
};

export type SeedMfaEnrollmentRow = {
  userId: string;
  totpSecret: string;
  isEnrolled: boolean;
};

export type SeedTaxPlanCycleRow = {
  id: string;
  clientId: string;
  tenantId: string;
  planningPeriod: string;
  stage: TaxPlanCycleStage;
  owner: string;
  priority: TaxPlanCyclePriority;
  dueDate: Date;
  onHold: boolean;
  holdReason: string | null;
};

export type SeedStageTransitionRow = {
  id: string;
  caseId: string;
  fromStage: TaxPlanCycleStage;
  toStage: TaxPlanCycleStage;
  actor: string;
  occurredAt: Date;
};

export type SeedFilingStatus =
  | "single"
  | "married_filing_jointly"
  | "married_filing_separately"
  | "head_of_household"
  | "qualifying_surviving_spouse";

export type SeedFederalTaxBracketRow = {
  taxYear: number;
  filingStatus: SeedFilingStatus;
  rate: string;
  lowerBound: string;
  upperBound: string | null;
};

export type SeedStateTaxBracketRow = SeedFederalTaxBracketRow & {
  stateCode: "CA";
};

export type SeedAuditEntryRow = {
  id: string;
  caseId: string;
  actor: string;
  action: string;
  outcome: string;
  occurredAt: Date;
};

export type SeedRefreshTokenRow = {
  id: string;
  userId: string;
  tokenHash: string;
  issuedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
};

export type SeedTaxPlanCycleInsertRow = Omit<SeedTaxPlanCycleRow, "dueDate"> & {
  dueDate: string;
  holdReason: string | null;
};

const federalRates = ["0.1000", "0.1200", "0.2200", "0.2400", "0.3200", "0.3500", "0.3700"] as const;
const californiaRates = [
  "0.0100",
  "0.0200",
  "0.0400",
  "0.0600",
  "0.0800",
  "0.0930",
  "0.1030",
  "0.1130",
  "0.1230",
] as const;

function createFederalBracketRows(
  filingStatus: SeedFilingStatus,
  bounds: readonly (readonly [string, string | null])[],
): SeedFederalTaxBracketRow[] {
  return bounds.map(([lowerBound, upperBound], index) => ({
    taxYear: 2026,
    filingStatus,
    rate: federalRates[index]!,
    lowerBound,
    upperBound,
  }));
}

function createCaliforniaBracketRows(
  filingStatus: SeedFilingStatus,
  bounds: readonly (readonly [string, string | null])[],
): SeedStateTaxBracketRow[] {
  return bounds.map(([lowerBound, upperBound], index) => ({
    taxYear: 2025,
    stateCode: "CA",
    filingStatus,
    rate: californiaRates[index]!,
    lowerBound,
    upperBound,
  }));
}

// Source: IRS Publication 505 (2026), Tax Rate Schedules.
// https://www.irs.gov/publications/p505
export const federalTaxBracketRows = [
  ...createFederalBracketRows("single", [
    ["0.00", "12400.00"],
    ["12400.00", "50400.00"],
    ["50400.00", "105700.00"],
    ["105700.00", "201775.00"],
    ["201775.00", "256225.00"],
    ["256225.00", "640600.00"],
    ["640600.00", null],
  ]),
  ...createFederalBracketRows("married_filing_jointly", [
    ["0.00", "24800.00"],
    ["24800.00", "100800.00"],
    ["100800.00", "211400.00"],
    ["211400.00", "403550.00"],
    ["403550.00", "512450.00"],
    ["512450.00", "768700.00"],
    ["768700.00", null],
  ]),
  ...createFederalBracketRows("married_filing_separately", [
    ["0.00", "12400.00"],
    ["12400.00", "50400.00"],
    ["50400.00", "105700.00"],
    ["105700.00", "201775.00"],
    ["201775.00", "256225.00"],
    ["256225.00", "384350.00"],
    ["384350.00", null],
  ]),
  ...createFederalBracketRows("head_of_household", [
    ["0.00", "17700.00"],
    ["17700.00", "67450.00"],
    ["67450.00", "105700.00"],
    ["105700.00", "201750.00"],
    ["201750.00", "256200.00"],
    ["256200.00", "640600.00"],
    ["640600.00", null],
  ]),
  ...createFederalBracketRows("qualifying_surviving_spouse", [
    ["0.00", "24800.00"],
    ["24800.00", "100800.00"],
    ["100800.00", "211400.00"],
    ["211400.00", "403550.00"],
    ["403550.00", "512450.00"],
    ["512450.00", "768700.00"],
    ["768700.00", null],
  ]),
] satisfies readonly SeedFederalTaxBracketRow[];

// Source: California 2025 Form 540 tax rate schedules. California's 2026
// estimated-tax instructions direct taxpayers to use the 2025 tax table.
// https://www.ftb.ca.gov/forms/2025/2025-540-booklet.html
export const californiaTaxBracketRows = [
  ...createCaliforniaBracketRows("single", [
    ["0.00", "11079.00"], ["11079.00", "26264.00"], ["26264.00", "41452.00"],
    ["41452.00", "57542.00"], ["57542.00", "72724.00"], ["72724.00", "371479.00"],
    ["371479.00", "445771.00"], ["445771.00", "742953.00"], ["742953.00", null],
  ]),
  ...createCaliforniaBracketRows("married_filing_separately", [
    ["0.00", "11079.00"], ["11079.00", "26264.00"], ["26264.00", "41452.00"],
    ["41452.00", "57542.00"], ["57542.00", "72724.00"], ["72724.00", "371479.00"],
    ["371479.00", "445771.00"], ["445771.00", "742953.00"], ["742953.00", null],
  ]),
  ...createCaliforniaBracketRows("married_filing_jointly", [
    ["0.00", "22158.00"], ["22158.00", "52528.00"], ["52528.00", "82904.00"],
    ["82904.00", "115084.00"], ["115084.00", "145448.00"], ["145448.00", "742958.00"],
    ["742958.00", "891542.00"], ["891542.00", "1485906.00"], ["1485906.00", null],
  ]),
  ...createCaliforniaBracketRows("head_of_household", [
    ["0.00", "22173.00"], ["22173.00", "52530.00"], ["52530.00", "67716.00"],
    ["67716.00", "83805.00"], ["83805.00", "98990.00"], ["98990.00", "505208.00"],
    ["505208.00", "606251.00"], ["606251.00", "1010417.00"], ["1010417.00", null],
  ]),
  ...createCaliforniaBracketRows("qualifying_surviving_spouse", [
    ["0.00", "22158.00"], ["22158.00", "52528.00"], ["52528.00", "82904.00"],
    ["82904.00", "115084.00"], ["115084.00", "145448.00"], ["145448.00", "742958.00"],
    ["742958.00", "891542.00"], ["891542.00", "1485906.00"], ["1485906.00", null],
  ]),
] satisfies readonly SeedStateTaxBracketRow[];

export const tenantRows = [
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
    name: "North Shore Advisors",
    createdAt: new Date("2026-06-29T12:00:00Z"),
    loginSlug: "north-shore-advisors",
    isActive: true,
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d02",
    name: "Harbor View Planning",
    createdAt: new Date("2026-06-29T12:30:00Z"),
    loginSlug: "harbor-view-planning",
    isActive: true,
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d03",
    name: "Summit Ridge Tax",
    createdAt: new Date("2026-06-29T13:00:00Z"),
    loginSlug: "summit-ridge-tax",
    isActive: true,
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d04",
    name: "Blue Harbor Tax",
    createdAt: new Date("2026-06-29T13:30:00Z"),
    loginSlug: "blue-harbor-tax",
    isActive: true,
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d05",
    name: "North Star Planning",
    createdAt: new Date("2026-06-29T14:00:00Z"),
    loginSlug: "north-star-planning",
    isActive: true,
  },
] as const satisfies readonly SeedTenantRow[];

export const roleRows = [
  { id: 1, role: "Firm Admin" },
  { id: 2, role: "Advisor" },
  { id: 3, role: "Client" },
  { id: 4, role: "TaxPulse Platform Admin" },
] as const satisfies readonly SeedRoleRow[];

export const userStatusRows = [
  { id: 1, status: "invited" },
  { id: 2, status: "active" },
  { id: 3, status: "disabled" },
] as const satisfies readonly SeedUserStatusRow[];

export const userRows = [
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
    tenantId: tenantRows[0].id,
    email: "alex@example.com",
    roleId: roleRows[0].id,
    statusId: userStatusRows[0].id,
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d62",
    tenantId: tenantRows[1].id,
    email: "brianna@example.com",
    roleId: roleRows[1].id,
    statusId: userStatusRows[1].id,
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d63",
    tenantId: tenantRows[2].id,
    email: "casey@example.com",
    roleId: roleRows[2].id,
    statusId: userStatusRows[0].id,
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d64",
    tenantId: tenantRows[3].id,
    email: "devon@example.com",
    roleId: roleRows[3].id,
    statusId: userStatusRows[1].id,
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d65",
    tenantId: tenantRows[4].id,
    email: "elliot@example.com",
    roleId: roleRows[1].id,
    statusId: userStatusRows[2].id,
  },
] as const satisfies readonly SeedUserRow[];

export const credentialRows = [
  {
    id: "cm7zq8f4k0000a1b2c3d4e5f6",
    userId: userRows[0].id,
    passwordHash:
      "$argon2id$v=19$m=65536,t=3,p=4$c2FsdC1vbmUtZm9yLWF1dGgtMQ$YXV0aC1oYXNoLW9uZS0wMQ",
  },
  {
    id: "cm7zq8f4k0001a1b2c3d4e5f6",
    userId: userRows[1].id,
    passwordHash:
      "$argon2id$v=19$m=65536,t=3,p=4$c2FsdC1vbmUtZm9yLWF1dGgtMg$YXV0aC1oYXNoLW9uZS0wMg",
  },
  {
    id: "cm7zq8f4k0002a1b2c3d4e5f6",
    userId: userRows[2].id,
    passwordHash:
      "$argon2id$v=19$m=65536,t=3,p=4$c2FsdC1vbmUtZm9yLWF1dGgtMw$YXV0aC1oYXNoLW9uZS0wMw",
  },
  {
    id: "cm7zq8f4k0003a1b2c3d4e5f6",
    userId: userRows[3].id,
    passwordHash:
      "$argon2id$v=19$m=65536,t=3,p=4$c2FsdC1vbmUtZm9yLWF1dGgtNA$YXV0aC1oYXNoLW9uZS0wNA",
  },
  {
    id: "cm7zq8f4k0004a1b2c3d4e5f6",
    userId: userRows[4].id,
    passwordHash:
      "$argon2id$v=19$m=65536,t=3,p=4$c2FsdC1vbmUtZm9yLWF1dGgtNQ$YXV0aC1oYXNoLW9uZS0wNQ",
  },
] as const satisfies readonly SeedCredentialRow[];

export const mfaEnrollmentRows = [
  {
    userId: userRows[0].id,
    totpSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
    isEnrolled: false,
  },
  {
    userId: userRows[1].id,
    totpSecret: "KRSXG5DSNFXGOIDSMVZXI2LOM5XXE3DE",
    isEnrolled: true,
  },
  {
    userId: userRows[2].id,
    totpSecret: "NBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXQ",
    isEnrolled: true,
  },
  {
    userId: userRows[3].id,
    totpSecret: "OVSWY3DPEHPK3PXPJBSWY3DPEHPK3PXR",
    isEnrolled: false,
  },
  {
    userId: userRows[4].id,
    totpSecret: "PBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXS",
    isEnrolled: true,
  },
] as const satisfies readonly SeedMfaEnrollmentRow[];

export const taxPlanCycleRows = [
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d11",
    clientId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d21",
    tenantId: tenantRows[0].id,
    planningPeriod: "2026-Q3",
    stage: "Review",
    owner: "advisor-001",
    priority: "high",
    dueDate: new Date("2026-07-15T00:00:00Z"),
    onHold: false,
    holdReason: null,
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d12",
    clientId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d22",
    tenantId: tenantRows[1].id,
    planningPeriod: "2026-Q4",
    stage: "Intake",
    owner: "advisor-002",
    priority: "medium",
    dueDate: new Date("2026-08-15T00:00:00Z"),
    onHold: true,
    holdReason: "Awaiting client documents",
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d13",
    clientId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d23",
    tenantId: tenantRows[2].id,
    planningPeriod: "2027-Q1",
    stage: "Modeling",
    owner: "advisor-003",
    priority: "low",
    dueDate: new Date("2026-09-30T00:00:00Z"),
    onHold: false,
    holdReason: null,
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d14",
    clientId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d24",
    tenantId: tenantRows[3].id,
    planningPeriod: "2027-Q2",
    stage: "Client Approval",
    owner: "advisor-004",
    priority: "medium",
    dueDate: new Date("2026-10-15T00:00:00Z"),
    onHold: false,
    holdReason: null,
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d15",
    clientId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d25",
    tenantId: tenantRows[4].id,
    planningPeriod: "2027-Q3",
    stage: "Archived",
    owner: "advisor-005",
    priority: "high",
    dueDate: new Date("2026-11-30T00:00:00Z"),
    onHold: true,
    holdReason: "Archived workpapers pending review",
  },
] as const satisfies readonly SeedTaxPlanCycleRow[];

export const stageTransitionRows = [
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d31",
    caseId: taxPlanCycleRows[0].id,
    fromStage: "Intake",
    toStage: "Data Aggregation",
    actor: "advisor-001",
    occurredAt: new Date("2026-07-01T14:00:00Z"),
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d32",
    caseId: taxPlanCycleRows[1].id,
    fromStage: "Data Aggregation",
    toStage: "Modeling",
    actor: "advisor-002",
    occurredAt: new Date("2026-07-02T14:00:00Z"),
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d33",
    caseId: taxPlanCycleRows[2].id,
    fromStage: "Modeling",
    toStage: "Review",
    actor: "advisor-003",
    occurredAt: new Date("2026-07-03T14:00:00Z"),
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d34",
    caseId: taxPlanCycleRows[3].id,
    fromStage: "Review",
    toStage: "Client Approval",
    actor: "advisor-004",
    occurredAt: new Date("2026-07-04T14:00:00Z"),
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d35",
    caseId: taxPlanCycleRows[4].id,
    fromStage: "Client Approval",
    toStage: "Executed",
    actor: "advisor-005",
    occurredAt: new Date("2026-07-05T14:00:00Z"),
  },
] as const satisfies readonly SeedStageTransitionRow[];

export function buildTaxPlanCycleInsertRows(): SeedTaxPlanCycleInsertRow[] {
  return taxPlanCycleRows.map((row) => ({
    ...row,
    dueDate: row.dueDate.toISOString().replace(/T.+/, ""),
  }));
}
