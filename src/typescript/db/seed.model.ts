import type {
  TaxPlanCyclePriority,
  TaxPlanCycleStage,
} from "../taxPlanCycle.js";

export type SeedTenantRow = {
  id: string;
  name: string;
  createdAt: Date;
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
  holdReason?: string | null;
};

export type SeedStageTransitionRow = {
  id: string;
  caseId: string;
  fromStage: TaxPlanCycleStage;
  toStage: TaxPlanCycleStage;
  actor: string;
  occurredAt: Date;
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

export const tenantRows = [
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
    name: "North Shore Advisors",
    createdAt: new Date("2026-06-29T12:00:00Z"),
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d02",
    name: "Harbor View Planning",
    createdAt: new Date("2026-06-29T12:30:00Z"),
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d03",
    name: "Summit Ridge Tax",
    createdAt: new Date("2026-06-29T13:00:00Z"),
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d04",
    name: "Blue Harbor Tax",
    createdAt: new Date("2026-06-29T13:30:00Z"),
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d05",
    name: "North Star Planning",
    createdAt: new Date("2026-06-29T14:00:00Z"),
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
    holdReason: row.holdReason ?? null,
  }));
}
