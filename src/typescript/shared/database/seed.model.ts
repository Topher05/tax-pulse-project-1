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
  displayName: string;
  roleId: number;
  statusId: number;
  lastLoginAt: Date | null;
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

export type SeedClientRosterRow = {
  id: string;
  tenantId: string;
  clientName: string;
  filingStatus: string;
  ytdIncome: string;
  estimatedTax: string;
  quarterlyStatus: string | null;
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

export type SeedActionItemRow = {
  caseId: string;
  description: string;
  deadline: Date;
  completed: boolean;
};

export type SeedDeductionRow = {
  caseId: string;
  date: string;
  description: string;
  category:
    | "Business Expense"
    | "Home Office"
    | "Charitable Giving"
    | "Health & Medical"
    | "Education"
    | "Retirement Contribution"
    | "Other";
  amount: string;
  taxImpact: string;
  deleted: boolean;
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
    displayName: "Alex Rivera",
    roleId: roleRows[0].id,
    statusId: userStatusRows[0].id,
    lastLoginAt: null,
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d62",
    tenantId: tenantRows[1].id,
    email: "brianna@example.com",
    displayName: "Brianna Cole",
    roleId: roleRows[1].id,
    statusId: userStatusRows[1].id,
    lastLoginAt: new Date("2026-08-05T14:30:00Z"),
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d63",
    tenantId: tenantRows[2].id,
    email: "casey@example.com",
    displayName: "Casey Morgan",
    roleId: roleRows[2].id,
    statusId: userStatusRows[0].id,
    lastLoginAt: null,
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d64",
    tenantId: tenantRows[3].id,
    email: "devon@example.com",
    displayName: "Devon Park",
    roleId: roleRows[3].id,
    statusId: userStatusRows[1].id,
    lastLoginAt: new Date("2026-08-04T19:15:00Z"),
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d65",
    tenantId: tenantRows[4].id,
    email: "elliot@example.com",
    displayName: "Elliot Shaw",
    roleId: roleRows[1].id,
    statusId: userStatusRows[2].id,
    lastLoginAt: new Date("2026-07-29T16:00:00Z"),
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d66",
    tenantId: tenantRows[0].id,
    email: "avery.client@example.com",
    displayName: "Avery Chen",
    roleId: roleRows[2].id,
    statusId: userStatusRows[1].id,
    lastLoginAt: new Date("2026-08-02T13:00:00Z"),
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d67",
    tenantId: tenantRows[1].id,
    email: "riley.client@example.com",
    displayName: "Riley Khan",
    roleId: roleRows[2].id,
    statusId: userStatusRows[0].id,
    lastLoginAt: null,
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d68",
    tenantId: tenantRows[2].id,
    email: "marisol.admin@example.com",
    displayName: "Marisol Vega",
    roleId: roleRows[0].id,
    statusId: userStatusRows[1].id,
    lastLoginAt: new Date("2026-08-03T18:10:00Z"),
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d69",
    tenantId: tenantRows[3].id,
    email: "nolan.advisor@example.com",
    displayName: "Nolan Brooks",
    roleId: roleRows[1].id,
    statusId: userStatusRows[1].id,
    lastLoginAt: new Date("2026-08-01T15:45:00Z"),
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d70",
    tenantId: tenantRows[4].id,
    email: "piper.client@example.com",
    displayName: "Piper Stone",
    roleId: roleRows[2].id,
    statusId: userStatusRows[0].id,
    lastLoginAt: null,
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d71",
    tenantId: tenantRows[2].id,
    email: "test-client@example.com",
    displayName: "Test Client",
    roleId: roleRows[2].id,
    statusId: userStatusRows[1].id,
    lastLoginAt: null,
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
      "$argon2id$v=19$m=65536,t=3,p=4$LB6kDJl7/qVUyjm9pG8b/A$bHlhCBx1qF+pWKaE4NoQP5eog9iaqryE/Oba3m4zF4Y",
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
  {
    id: "cm7zq8f4k0005a1b2c3d4e5f6",
    userId: userRows[5].id,
    passwordHash:
      "$argon2id$v=19$m=65536,t=3,p=4$c2FsdC1vbmUtZm9yLWF1dGgtNg$YXV0aC1oYXNoLW9uZS0wNg",
  },
  {
    id: "cm7zq8f4k0006a1b2c3d4e5f6",
    userId: userRows[6].id,
    passwordHash:
      "$argon2id$v=19$m=65536,t=3,p=4$c2FsdC1vbmUtZm9yLWF1dGgtNw$YXV0aC1oYXNoLW9uZS0wNw",
  },
  {
    id: "cm7zq8f4k0007a1b2c3d4e5f6",
    userId: userRows[7].id,
    passwordHash:
      "$argon2id$v=19$m=65536,t=3,p=4$c2FsdC1vbmUtZm9yLWF1dGgtOA$YXV0aC1oYXNoLW9uZS0wOA",
  },
  {
    id: "cm7zq8f4k0008a1b2c3d4e5f6",
    userId: userRows[8].id,
    passwordHash:
      "$argon2id$v=19$m=65536,t=3,p=4$c2FsdC1vbmUtZm9yLWF1dGgtOQ$YXV0aC1oYXNoLW9uZS0wOQ",
  },
  {
    id: "cm7zq8f4k0009a1b2c3d4e5f6",
    userId: userRows[9].id,
    passwordHash:
      "$argon2id$v=19$m=65536,t=3,p=4$c2FsdC1vbmUtZm9yLWF1dGgtMTA$YXV0aC1oYXNoLTEw",
  },
  {
    id: "cm7zq8f4k0010a1b2c3d4e5f6",
    userId: userRows[10].id,
    passwordHash:
      "$argon2id$v=19$m=65536,t=3,p=4$c3ludGhldGljLXRlc3QtY2xpZW50LXNlZWQtMDE$+IPCTtDIPAJDcHuRvZpGqvDAGYJbpeiK1gKMg6SSV6E",
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
  {
    userId: userRows[5].id,
    totpSecret: "QBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXT",
    isEnrolled: true,
  },
  {
    userId: userRows[6].id,
    totpSecret: "RBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXU",
    isEnrolled: false,
  },
  {
    userId: userRows[7].id,
    totpSecret: "SBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXV",
    isEnrolled: true,
  },
  {
    userId: userRows[8].id,
    totpSecret: "TBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXW",
    isEnrolled: true,
  },
  {
    userId: userRows[9].id,
    totpSecret: "UBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXX",
    isEnrolled: false,
  },
  {
    userId: userRows[10].id,
    totpSecret: "6XF5UF2Y7SUVJ3CJ24GVE2QV7GT4UFGQ",
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
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d16",
    clientId: userRows[10].id,
    tenantId: tenantRows[2].id,
    planningPeriod: "2026-Q4",
    stage: "Client Approval",
    owner: "Jordan Patel",
    priority: "high",
    dueDate: new Date("2026-12-31T00:00:00Z"),
    onHold: false,
    holdReason: null,
  },
] as const satisfies readonly SeedTaxPlanCycleRow[];

export const actionItemRows = [
  {
    caseId: taxPlanCycleRows[1].id,
    description: "Collect signed planning authorization",
    deadline: new Date("2026-08-01T00:00:00Z"),
    completed: false,
  },
  {
    caseId: taxPlanCycleRows[1].id,
    description: "Review current estimated payments",
    deadline: new Date("2026-08-02T00:00:00Z"),
    completed: false,
  },
  {
    caseId: taxPlanCycleRows[1].id,
    description: "Draft present-to-client talking points",
    deadline: new Date("2026-08-03T00:00:00Z"),
    completed: false,
  },
  {
    caseId: taxPlanCycleRows[1].id,
    description: "Confirm client document intake",
    deadline: new Date("2026-08-04T00:00:00Z"),
    completed: false,
  },
  {
    caseId: taxPlanCycleRows[1].id,
    description: "Prepare follow-up questions for advisor",
    deadline: new Date("2026-08-05T00:00:00Z"),
    completed: false,
  },
  {
    caseId: taxPlanCycleRows[1].id,
    description: "Send updated action-item summary",
    deadline: new Date("2026-10-07T00:00:00Z"),
    completed: false,
  },
  {
    caseId: taxPlanCycleRows[1].id,
    description: "Schedule client review call",
    deadline: new Date("2026-10-07T00:00:00Z"),
    completed: false,
  },
  {
    caseId: taxPlanCycleRows[1].id,
    description: "Upload client-facing planning notes",
    deadline: new Date("2026-10-07T00:00:00Z"),
    completed: false,
  },
  {
    caseId: taxPlanCycleRows[1].id,
    description: "Verify projected tax savings packet",
    deadline: new Date("2026-10-07T00:00:00Z"),
    completed: false,
  },
  {
    caseId: taxPlanCycleRows[1].id,
    description: "Finalize present-to-client checklist",
    deadline: new Date("2026-10-07T00:00:00Z"),
    completed: false,
  },
  {
    caseId: taxPlanCycleRows[5].id,
    description: "Review your estimated tax payment schedule",
    deadline: new Date("2026-10-15T00:00:00Z"),
    completed: false,
  },
  {
    caseId: taxPlanCycleRows[5].id,
    description: "Upload your year-to-date income statement",
    deadline: new Date("2026-10-22T00:00:00Z"),
    completed: false,
  },
  {
    caseId: taxPlanCycleRows[5].id,
    description: "Confirm the proposed quarterly payment amount",
    deadline: new Date("2026-10-31T00:00:00Z"),
    completed: false,
  },
] as const satisfies readonly SeedActionItemRow[];

export const clientRosterRows = [
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e81",
    tenantId: tenantRows[0].id,
    clientName: "Avery Chen",
    filingStatus: "Single - 1099",
    ytdIncome: "108500.00",
    estimatedTax: "32100.00",
    quarterlyStatus: "Q2 due Jun 15",
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e82",
    tenantId: tenantRows[0].id,
    clientName: "Morgan Acme",
    filingStatus: "MFJ - W-2 + RSU",
    ytdIncome: "414000.00",
    estimatedTax: "138400.00",
    quarterlyStatus: "Q2 due Jun 15",
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e83",
    tenantId: tenantRows[1].id,
    clientName: "Riley Khan",
    filingStatus: "HoH - W-2",
    ytdIncome: "72500.00",
    estimatedTax: "11140.00",
    quarterlyStatus: null,
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e84",
    tenantId: tenantRows[2].id,
    clientName: "Casey Morgan",
    filingStatus: "MFJ - K-1",
    ytdIncome: "286000.00",
    estimatedTax: "84200.00",
    quarterlyStatus: "Q3 due Sep 15",
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e85",
    tenantId: tenantRows[3].id,
    clientName: "Taylor Reed",
    filingStatus: "Single - Schedule C",
    ytdIncome: "152750.00",
    estimatedTax: "46900.00",
    quarterlyStatus: "Q3 due Sep 15",
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e86",
    tenantId: tenantRows[4].id,
    clientName: "Piper Stone",
    filingStatus: "HoH - W-2 + 1099",
    ytdIncome: "96300.00",
    estimatedTax: "18450.00",
    quarterlyStatus: null,
  },
] as const satisfies readonly SeedClientRosterRow[];

export const deductionRows = [
  {
    caseId: taxPlanCycleRows[1].id,
    date: "2026-07-30",
    description: "Business development travel and meals",
    category: "Business Expense",
    amount: "780.00",
    taxImpact: "195.00",
    deleted: false,
  },
  {
    caseId: taxPlanCycleRows[1].id,
    date: "2026-07-29",
    description: "Home office internet allocation",
    category: "Home Office",
    amount: "120.00",
    taxImpact: "30.00",
    deleted: false,
  },
  {
    caseId: taxPlanCycleRows[1].id,
    date: "2026-07-28",
    description: "Charitable cash contribution",
    category: "Charitable Giving",
    amount: "500.00",
    taxImpact: "125.00",
    deleted: false,
  },
  {
    caseId: taxPlanCycleRows[1].id,
    date: "2026-07-27",
    description: "Annual physical and labs",
    category: "Health & Medical",
    amount: "310.00",
    taxImpact: "77.50",
    deleted: false,
  },
  {
    caseId: taxPlanCycleRows[1].id,
    date: "2026-07-26",
    description: "Course fees for continuing education",
    category: "Education",
    amount: "950.00",
    taxImpact: "237.50",
    deleted: false,
  },
  {
    caseId: taxPlanCycleRows[1].id,
    date: "2026-07-25",
    description: "Retirement plan contribution",
    category: "Retirement Contribution",
    amount: "6000.00",
    taxImpact: "1500.00",
    deleted: false,
  },
  {
    caseId: taxPlanCycleRows[1].id,
    date: "2026-07-24",
    description: "Miscellaneous deductible expense",
    category: "Other",
    amount: "215.00",
    taxImpact: "53.75",
    deleted: false,
  },
  {
    caseId: taxPlanCycleRows[1].id,
    date: "2026-07-23",
    description: "Office supplies and postage",
    category: "Business Expense",
    amount: "89.00",
    taxImpact: "22.25",
    deleted: false,
  },
  {
    caseId: taxPlanCycleRows[1].id,
    date: "2026-07-22",
    description: "Dedicated workspace utilities",
    category: "Home Office",
    amount: "164.00",
    taxImpact: "41.00",
    deleted: false,
  },
  {
    caseId: taxPlanCycleRows[1].id,
    date: "2026-07-21",
    description: "Food bank donation",
    category: "Charitable Giving",
    amount: "250.00",
    taxImpact: "62.50",
    deleted: false,
  },
  {
    caseId: taxPlanCycleRows[1].id,
    date: "2026-07-20",
    description: "Prescription and therapy expenses",
    category: "Health & Medical",
    amount: "420.00",
    taxImpact: "105.00",
    deleted: false,
  },
  {
    caseId: taxPlanCycleRows[1].id,
    date: "2026-07-19",
    description: "Professional certification renewal",
    category: "Education",
    amount: "675.00",
    taxImpact: "168.75",
    deleted: false,
  },
  {
    caseId: taxPlanCycleRows[1].id,
    date: "2026-07-18",
    description: "IRA contribution",
    category: "Retirement Contribution",
    amount: "5000.00",
    taxImpact: "1250.00",
    deleted: false,
  },
  {
    caseId: taxPlanCycleRows[1].id,
    date: "2026-07-17",
    description: "Client welcome gift supplies",
    category: "Business Expense",
    amount: "74.00",
    taxImpact: "18.50",
    deleted: false,
  },
  {
    caseId: taxPlanCycleRows[1].id,
    date: "2026-07-16",
    description: "State filing fee",
    category: "Other",
    amount: "135.00",
    taxImpact: "33.75",
    deleted: false,
  },
] as const satisfies readonly SeedDeductionRow[];

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

export const auditEntryRows = [
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d41",
    caseId: taxPlanCycleRows[0].id,
    actor: "advisor-001",
    action: "stage_transition:Intake->Data Aggregation",
    outcome: "succeeded",
    occurredAt: new Date("2026-07-01T14:00:00Z"),
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d42",
    caseId: taxPlanCycleRows[0].id,
    actor: "advisor-001",
    action: "Collected synthetic wage, self-employment, and withholding inputs for client 018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d21.",
    outcome: "gross income 185000 and withholding 42000 recorded for modeling.",
    occurredAt: new Date("2026-07-02T15:30:00Z"),
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d43",
    caseId: taxPlanCycleRows[0].id,
    actor: "advisor-001",
    action: "Scenario modeling requested for Roth conversion and charitable giving strategy.",
    outcome: "estimated tax impact $8420 queued for review.",
    occurredAt: new Date("2026-07-03T16:45:00Z"),
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d44",
    caseId: taxPlanCycleRows[0].id,
    actor: "firm-admin-001",
    action: "Review packet opened for synthetic case TP-Seed-001.",
    outcome: "deductions 27500 and quarterly payment 6250 approved for advisor follow-up.",
    occurredAt: new Date("2026-07-04T17:00:00Z"),
  },
] as const satisfies readonly SeedAuditEntryRow[];

export function buildTaxPlanCycleInsertRows(): SeedTaxPlanCycleInsertRow[] {
  return taxPlanCycleRows.map((row) => ({
    ...row,
    dueDate: row.dueDate.toISOString().replace(/T.+/, ""),
  }));
}

export function buildActionItemInsertRows(): Array<
  Omit<SeedActionItemRow, "deadline"> & { deadline: string }
> {
  return actionItemRows.map((row) => ({
    ...row,
    deadline: row.deadline.toISOString().replace(/T.+/, ""),
  }));
}
