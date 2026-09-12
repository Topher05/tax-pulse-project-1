import { z } from "zod";
import type { ZodType } from "zod";

import {
  authMfaLoginRequestSchema,
} from "../../features/auth/application/authMfaLogin.js";
import { authSessionTokenResponseSchema } from "../../features/auth/http/authSessionRoutes.js";
import {
  mfaChallengeResponseSchema,
  passwordLoginRequestSchema,
} from "../../features/auth/http/authRoutes.js";
import {
  registrationAccountResponseSchema,
  registrationRequestSchema,
} from "../../features/auth/domain/authRegistration.js";
import {
  scenarioComputedResultSchema,
  scenarioTypedFiguresSchema,
} from "../../features/taxPlanCycle/domain/scenario.js";
import {
  deductionCreateSchema,
  deductionReadParamsSchema,
  deductionTableRowSchema,
  deductionTableRowsSchema,
} from "../../features/deductions/repositories/deduction.js";
import {
  incomeEventCreateSchema,
  incomeEventReadParamsSchema,
  incomeEventRowSchema,
  incomeEventRowsSchema,
} from "../../features/incomeEvents/index.js";
import {
  quarterlyEstimateReadParamsSchema,
  quarterlyEstimateRowsSchema,
} from "../../features/quarterlyPayments/repositories/quarterlyPayments.js";
import {
  scenarioModelingRequestSchema,
} from "../../features/taxPlanCycle/scenarioModeling.js";
import { taxPlanCycleCreateResultSchema } from "../../features/taxPlanCycle/index.js";
import {
  mfaEnrollConfirmRequestSchema,
  mfaEnrollConfirmResultSchema,
  mfaEnrollRequestSchema,
  mfaEnrollResultSchema,
} from "../../features/auth/application/mfaEnrollment.js";
import {
  taxPlanCycleCreateSchema,
  taxPlanCycleCommentCreateRequestSchema,
  taxPlanCycleCommentSchema,
  taxPlanCycleCommentsResponseSchema,
  taxPlanCycleHoldParamsSchema,
  taxPlanCycleHoldSchema,
  taxPlanCycleReadParamsSchema,
  taxPlanCycleQueueItemSchema,
  taxPlanCycleQueueGetResponseSchema,
  taxPlanCycleSchema,
  taxPlanCycleTransitionParamsSchema,
  taxPlanCycleTransitionSchema,
} from "../../features/taxPlanCycle/index.js";
import { auditEntryOutputSchema } from "../../features/audit/domain/auditEntryOutput.js";
import { taxPlanCycleReadResponseSchema } from "../../features/taxPlanCycle/taxPlanCycle.js";
import {
  clientRosterListResponseSchema,
  clientRosterRowSchema,
} from "../../features/clientRoster/index.js";
import {
  firmUserRoleUpdateParamsSchema,
  firmUserRoleUpdateRequestSchema,
  firmUsersListResponseSchema,
  firmUserRowSchema,
} from "../../features/firmUsers/index.js";
import {
  platformAuditLogEntrySchema,
  platformAuditLogResponseSchema,
  platformPermissionMatrixResponseSchema,
  platformPermissionMatrixSectionSchema,
  platformTenantUserCreateParamsSchema,
  platformTenantUserCreateRequestSchema,
  platformTenantUserRowSchema,
  platformTenantUsersListResponseSchema,
  platformTenantUsersTenantSchema,
} from "../../features/platformAdministration/index.js";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type JsonObject = { [key: string]: JsonValue };

export interface CoreCaseOpenApiSchemaRegistration {
  name: string;
  schema: ZodType;
}

export const coreCaseOpenApiSchemaRegistrations = [
  {
    name: "TaxPlanCycleCreateRequest",
    schema: taxPlanCycleCreateSchema,
  },
  {
    name: "TaxPlanCycleReadParams",
    schema: taxPlanCycleReadParamsSchema,
  },
  {
    name: "TaxPlanCycleHoldParams",
    schema: taxPlanCycleHoldParamsSchema,
  },
  {
    name: "TaxPlanCycleHoldRequest",
    schema: taxPlanCycleHoldSchema,
  },
  {
    name: "TaxPlanCycleTransitionParams",
    schema: taxPlanCycleTransitionParamsSchema,
  },
  {
    name: "TaxPlanCycleTransitionRequest",
    schema: taxPlanCycleTransitionSchema,
  },
  {
    name: "TaxPlanCycle",
    schema: taxPlanCycleSchema,
  },
  {
    name: "TaxPlanCycleReadResponse",
    schema: taxPlanCycleReadResponseSchema,
  },
  {
    name: "TaxPlanCycleQueueItem",
    schema: taxPlanCycleQueueItemSchema,
  },
  {
    name: "TaxPlanCycleQueueGetResponse",
    schema: taxPlanCycleQueueGetResponseSchema,
  },
  {
    name: "TaxPlanCycleCreateAccepted",
    schema: taxPlanCycleCreateResultSchema,
  },
  {
    name: "TaxPlanCycleCommentCreateRequest",
    schema: taxPlanCycleCommentCreateRequestSchema,
  },
  {
    name: "TaxPlanCycleComment",
    schema: taxPlanCycleCommentSchema,
  },
  {
    name: "TaxPlanCycleCommentsResponse",
    schema: taxPlanCycleCommentsResponseSchema,
  },
  {
    name: "TaxPlanCycleAuditEntry",
    schema: auditEntryOutputSchema,
  },
  {
    name: "ClientRosterRow",
    schema: clientRosterRowSchema,
  },
  {
    name: "ClientRosterListResponse",
    schema: clientRosterListResponseSchema,
  },
  {
    name: "FirmUserRow",
    schema: firmUserRowSchema,
  },
  {
    name: "FirmUsersListResponse",
    schema: firmUsersListResponseSchema,
  },
  {
    name: "FirmUserRoleUpdateParams",
    schema: firmUserRoleUpdateParamsSchema,
  },
  {
    name: "FirmUserRoleUpdateRequest",
    schema: firmUserRoleUpdateRequestSchema,
  },
  {
    name: "PlatformTenantUserRow",
    schema: platformTenantUserRowSchema,
  },
  {
    name: "PlatformTenantUsersTenant",
    schema: platformTenantUsersTenantSchema,
  },
  {
    name: "PlatformTenantUsersListResponse",
    schema: platformTenantUsersListResponseSchema,
  },
  {
    name: "PlatformPermissionMatrixSection",
    schema: platformPermissionMatrixSectionSchema,
  },
  {
    name: "PlatformPermissionMatrixResponse",
    schema: platformPermissionMatrixResponseSchema,
  },
  {
    name: "PlatformAuditLogEntry",
    schema: platformAuditLogEntrySchema,
  },
  {
    name: "PlatformAuditLogResponse",
    schema: platformAuditLogResponseSchema,
  },
  {
    name: "PlatformTenantUserCreateParams",
    schema: platformTenantUserCreateParamsSchema,
  },
  {
    name: "PlatformTenantUserCreateRequest",
    schema: platformTenantUserCreateRequestSchema,
  },
  {
    name: "DeductionReadParams",
    schema: deductionReadParamsSchema,
  },
  {
    name: "DeductionRows",
    schema: deductionTableRowsSchema,
  },
  {
    name: "DeductionCreateRequest",
    schema: deductionCreateSchema,
  },
  {
    name: "DeductionRow",
    schema: deductionTableRowSchema,
  },
  {
    name: "IncomeEventReadParams",
    schema: incomeEventReadParamsSchema,
  },
  {
    name: "IncomeEventRows",
    schema: incomeEventRowsSchema,
  },
  {
    name: "IncomeEventCreateRequest",
    schema: incomeEventCreateSchema,
  },
  {
    name: "IncomeEventRow",
    schema: incomeEventRowSchema,
  },
  {
    name: "QuarterlyEstimateReadParams",
    schema: quarterlyEstimateReadParamsSchema,
  },
  {
    name: "QuarterlyEstimateRows",
    schema: quarterlyEstimateRowsSchema,
  },
  {
    name: "AuthMfaLoginRequest",
    schema: authMfaLoginRequestSchema,
  },
  {
    name: "AuthMfaLoginResult",
    schema: authSessionTokenResponseSchema,
  },
  {
    name: "PasswordLoginRequest",
    schema: passwordLoginRequestSchema,
  },
  {
    name: "MfaChallengeResponse",
    schema: mfaChallengeResponseSchema,
  },
  {
    name: "RegistrationRequest",
    schema: registrationRequestSchema,
  },
  {
    name: "RegistrationAccountResponse",
    schema: registrationAccountResponseSchema,
  },
  {
    name: "MfaEnrollRequest",
    schema: mfaEnrollRequestSchema,
  },
  {
    name: "MfaEnrollAccepted",
    schema: mfaEnrollResultSchema,
  },
  {
    name: "MfaEnrollConfirmRequest",
    schema: mfaEnrollConfirmRequestSchema,
  },
  {
    name: "MfaEnrollConfirmed",
    schema: mfaEnrollConfirmResultSchema,
  },
] as const satisfies readonly CoreCaseOpenApiSchemaRegistration[];

const fakeTaxPlanCycleCreateExample = {
  client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e11",
  planning_period: "2026-Q4",
  owner: "advisor-123",
  priority: "medium",
  due_date: "2026-12-31",
};

const fakeTaxPlanCycleExample = {
  id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
  client_id: fakeTaxPlanCycleCreateExample.client_id,
  stage: "Intake",
  owner: fakeTaxPlanCycleCreateExample.owner,
  priority: fakeTaxPlanCycleCreateExample.priority,
  due_date: fakeTaxPlanCycleCreateExample.due_date,
  on_hold: false,
  scenarios: [],
};

const fakeTaxPlanCycleQueueExample = [
  {
    ...fakeTaxPlanCycleExample,
    is_overdue: false,
    updated_at: "2026-07-01T12:00:00.000Z",
  },
];

const fakeTaxPlanCycleCommentExample = {
  id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9f92",
  case_id: fakeTaxPlanCycleExample.id,
  actor_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d75",
  actor_role: "Advisor",
  author_display_name: "Dana Cohen, CPA",
  body: "I've narrowed it down to the combined Roth + DAF strategy.",
  created_at: "2026-08-31T15:08:00.000Z",
};

const fakeTaxPlanCycleAuditEntryExample = {
  id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d43",
  case_id: fakeTaxPlanCycleExample.id,
  actor: "advisor-001",
  action: "Scenario modeling requested with income [REDACTED_AMOUNT].",
  outcome: "deduction amount [REDACTED_AMOUNT] queued for review.",
  occurred_at: "2026-07-03T16:45:00.000Z",
};

const fakeClientRosterExample = [
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e81",
    clientName: "Avery Chen",
    filingStatus: "Single - 1099",
    ytdIncome: 108500,
    estimatedTax: 32100,
    quarterlyStatus: "Q2 due Jun 15",
  },
];

const fakeFirmUsersExample = [
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
    name: "Alex Rivera",
    email: "alex@example.com",
    role: "Firm Admin",
    status: "Inactive",
    lastLoginAt: null,
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d66",
    name: "Jordan Lee",
    email: "jordan.lee@example.com",
    role: "Advisor",
    status: "Active",
    lastLoginAt: "2026-08-05T14:30:00.000Z",
  },
];

const fakeFirmUserRoleUpdateRequestExample = {
  role: "Firm Admin",
};

const fakePlatformTenantUsersExample = [
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
    name: "North Shore Advisors",
    loginSlug: "north-shore-advisors",
    isActive: true,
    users: [
      {
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
        name: "Alex Rivera",
        email: "alex@example.com",
        role: "Firm Admin",
        status: "Inactive",
        lastLoginAt: null,
      },
      {
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d66",
        name: "Avery Chen",
        email: "avery.client@example.com",
        role: "Client",
        status: "Active",
        lastLoginAt: "2026-08-02T13:00:00.000Z",
      },
    ],
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d02",
    name: "Harbor View Planning",
    loginSlug: "harbor-view-planning",
    isActive: true,
    users: [
      {
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d62",
        name: "Brianna Cole",
        email: "brianna@example.com",
        role: "Advisor",
        status: "Active",
        lastLoginAt: "2026-08-05T14:30:00.000Z",
      },
    ],
  },
];

const fakePlatformTenantUserCreateRequestExample = {
  displayName: "Jordan Client",
  email: "jordan.client@example.test",
  role: "Client",
  status: "Inactive",
};

const fakePlatformPermissionMatrixExample = [
  {
    id: "internal-firm-staff",
    title: "Internal - Firm Staff",
    description:
      "An Advisor cannot sign off their own work; Firm Admin review is required before a plan is presented or sealed.",
    roles: ["TaxPulse Platform Admin", "Firm Admin", "Advisor", "Client"],
    rows: [
      {
        feature: "Plan Cycle Queue",
        access: {
          "TaxPulse Platform Admin": "Full",
          "Firm Admin": "Full",
          Advisor: "Scoped",
          Client: null,
        },
      },
    ],
  },
  {
    id: "external-clients",
    title: "External - Clients",
    description: "Client portal capabilities available outside the firm workspace.",
    roles: ["TaxPulse Platform Admin", "Firm Admin", "Advisor", "Client"],
    rows: [
      {
        feature: "Client Portal Dashboard",
        access: {
          "TaxPulse Platform Admin": "Full",
          "Firm Admin": null,
          Advisor: null,
          Client: "Full",
        },
      },
    ],
  },
];

const fakePlatformAuditLogExample = [
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d42",
    occurredAt: "2026-07-02T15:30:00.000Z",
    user: "advisor-001",
    role: "Advisor",
    action: "income amount [REDACTED_AMOUNT] recorded",
    resource:
      "North Shore Advisors - 2026-Q3 - Case 018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d11",
  },
];

const scenarioOpenApiSchema = z.strictObject({
  id: z.uuid(),
  case_id: z.uuid(),
  name: z.string().min(1),
  typed_figures: scenarioTypedFiguresSchema,
  computed_result: scenarioComputedResultSchema,
  created_at: z.iso.datetime(),
});

const fakeScenarioModelingRequestExample = {
  baseline: {
    income: 100000,
    deductions: 12000,
    state: "CA",
    filing_status: "single",
  },
  scenarios: [
    {
      name: "Increase deductions",
      typed_figures: {
        income: 100000,
        deductions: 18000,
        state: "CA",
        filing_status: "single",
      },
    },
    {
      name: "Increase income",
      typed_figures: {
        income: 112000,
        deductions: 12000,
        state: "CA",
        filing_status: "single",
      },
    },
  ],
};

const fakeScenarioModelingResponseExample = [
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e21",
    case_id: fakeTaxPlanCycleExample.id,
    name: "Increase deductions",
    typed_figures: fakeScenarioModelingRequestExample.scenarios[0]!.typed_figures,
    computed_result: {
      federal_liability: 12000,
      state_liability: 3500,
      effective_rate: 0.155,
      marginal_rate: 0.24,
      quarterly_estimate: 3875,
      total_tax: 15500,
      delta_vs_baseline: -2500,
    },
    created_at: "2026-07-01T12:00:00.000Z",
  },
];

const fakeMfaEnrollRequestExample = {
  tenant_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
  user_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
};

const fakeMfaConfirmRequestExample = {
  ...fakeMfaEnrollRequestExample,
  code: "123456",
};

const fakeAuthMfaLoginResultExample = {
  access_token:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
    "eyJzdWIiOiIwMThkNmMxYS0zZjliLTdjMjgtOGQxYS0wZjRhM2I4YzlkNjEiLCJ0ZW5hbnRfaWQiOiIwMThkNmMxYS0zZjliLTdjMjgtOGQxYS0wZjRhM2I4YzlkMDEiLCJpc3MiOiJUYXhQdWxzZSBDb3JlIENhc2UgU2VydmljZSIsImlhdCI6MTc4MDAwMDAwMCwiZXhwIjoxNzgwMDAwOTAwfQ." +
    "synthetic-signature-example",
  token_type: "Bearer",
  expires_in: 900,
  refresh_expires_in: 2592000,
};

const fakeRegistrationRequestExample = {
  tenant_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
  email: "new-client@example.test",
  password: "synthetic-registration-password",
};

const fakePasswordLoginRequestExample = {
  email: "advisor@example.test",
  password: "synthetic-password",
};

const fakeMfaChallengeResponseExample = {
  status: "mfa_challenge_required",
  tenant_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
  email: fakePasswordLoginRequestExample.email,
  user_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
};

const fakeRegistrationAccountResponseExample = {
  id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e02",
  tenant_id: fakeRegistrationRequestExample.tenant_id,
  email: fakeRegistrationRequestExample.email,
  role: "Client",
  status: "invited",
};

const validationErrorExample = {
  type: "https://taxpulse.example/problems/validation-error",
  title: "Validation Error",
  status: 400,
  detail: "Request body failed validation.",
  code: "VALIDATION_ERROR",
  issues: [
    {
      path: ["owner"],
      message: "Too small: expected string to have >=1 characters",
      code: "too_small",
    },
  ],
};

const problemDetailsSchema = {
  type: "object",
  required: ["type", "title", "status", "detail"],
  properties: {
    type: { type: "string" },
    title: { type: "string" },
    status: { type: "integer" },
    detail: { type: "string" },
  },
  additionalProperties: true,
} satisfies JsonObject;

function toOpenApiSchema(schema: ZodType): JsonObject {
  return z.toJSONSchema(schema, {
    target: "openapi-3.0",
    io: "input",
  }) as JsonObject;
}

function requireObjectProperty(
  schema: JsonObject,
  propertyName: string,
): JsonObject {
  const properties = schema.properties;

  if (
    properties === null ||
    typeof properties !== "object" ||
    Array.isArray(properties)
  ) {
    throw new Error("Expected generated schema to include object properties.");
  }

  const property = properties[propertyName];

  if (
    property === null ||
    typeof property !== "object" ||
    Array.isArray(property)
  ) {
    throw new Error(`Expected generated schema property ${propertyName}.`);
  }

  return property;
}

export function createCoreCaseOpenApiDocument(): JsonObject {
  const createRequestSchema = toOpenApiSchema(taxPlanCycleCreateSchema);
  const readParamsSchema = toOpenApiSchema(taxPlanCycleReadParamsSchema);
  const taxPlanCycleResponseSchema = toOpenApiSchema(taxPlanCycleSchema);
  const taxPlanCycleCommentCreateRequestOpenApiSchema = toOpenApiSchema(
    taxPlanCycleCommentCreateRequestSchema,
  );
  const taxPlanCycleCommentOpenApiSchema = toOpenApiSchema(taxPlanCycleCommentSchema);
  const taxPlanCycleCommentsResponseOpenApiSchema = toOpenApiSchema(
    taxPlanCycleCommentsResponseSchema,
  );
  const taxPlanCycleAuditEntryOpenApiSchema = toOpenApiSchema(auditEntryOutputSchema);
  const taxPlanCycleHoldRequestSchema = toOpenApiSchema(taxPlanCycleHoldSchema);
  const taxPlanCycleTransitionRequestSchema = toOpenApiSchema(
    taxPlanCycleTransitionSchema,
  );
  const clientRosterListOpenApiSchema = toOpenApiSchema(
    clientRosterListResponseSchema,
  );
  const firmUsersListOpenApiSchema = toOpenApiSchema(firmUsersListResponseSchema);
  const firmUserRoleUpdateParamsOpenApiSchema = toOpenApiSchema(
    firmUserRoleUpdateParamsSchema,
  );
  const firmUserRoleUpdateUserIdSchema = requireObjectProperty(
    firmUserRoleUpdateParamsOpenApiSchema,
    "userId",
  );
  const firmUserRoleUpdateRequestOpenApiSchema = toOpenApiSchema(
    firmUserRoleUpdateRequestSchema,
  );
  const platformTenantUsersListOpenApiSchema = toOpenApiSchema(
    platformTenantUsersListResponseSchema,
  );
  const platformPermissionMatrixOpenApiSchema = toOpenApiSchema(
    platformPermissionMatrixResponseSchema,
  );
  const platformAuditLogOpenApiSchema = toOpenApiSchema(
    platformAuditLogResponseSchema,
  );
  const platformTenantUserCreateParamsOpenApiSchema = toOpenApiSchema(
    platformTenantUserCreateParamsSchema,
  );
  const platformTenantUserCreateTenantIdSchema = requireObjectProperty(
    platformTenantUserCreateParamsOpenApiSchema,
    "tenantId",
  );
  const platformTenantUserCreateRequestOpenApiSchema = toOpenApiSchema(
    platformTenantUserCreateRequestSchema,
  );
  const createAcceptedSchema = toOpenApiSchema(taxPlanCycleCreateResultSchema);
  const deductionReadCaseIdSchema = requireObjectProperty(
    toOpenApiSchema(deductionReadParamsSchema),
    "caseId",
  );
  const deductionCreateRequestSchema = toOpenApiSchema(deductionCreateSchema);
  const deductionRowResponseSchema = toOpenApiSchema(deductionTableRowSchema);
  const deductionRowsResponseSchema = toOpenApiSchema(deductionTableRowsSchema);
  const incomeEventReadCaseIdSchema = requireObjectProperty(
    toOpenApiSchema(incomeEventReadParamsSchema),
    "caseId",
  );
  const incomeEventCreateRequestSchema = toOpenApiSchema(incomeEventCreateSchema);
  const incomeEventRowResponseSchema = toOpenApiSchema(incomeEventRowSchema);
  const incomeEventRowsResponseSchema = toOpenApiSchema(incomeEventRowsSchema);
  const quarterlyEstimateParamsSchema = requireObjectProperty(
    toOpenApiSchema(quarterlyEstimateReadParamsSchema),
    "caseId",
  );
  const quarterlyEstimateRowsResponseSchema = toOpenApiSchema(quarterlyEstimateRowsSchema);
  const authMfaLoginRequestOpenApiSchema = toOpenApiSchema(
    authMfaLoginRequestSchema,
  );
  const authMfaLoginResultOpenApiSchema = toOpenApiSchema(
    authSessionTokenResponseSchema,
  );
  const passwordLoginRequestOpenApiSchema = toOpenApiSchema(
    passwordLoginRequestSchema,
  );
  const mfaChallengeResponseOpenApiSchema = toOpenApiSchema(
    mfaChallengeResponseSchema,
  );
  const registrationRequestOpenApiSchema = toOpenApiSchema(registrationRequestSchema);
  const registrationAccountResponseOpenApiSchema = toOpenApiSchema(
    registrationAccountResponseSchema,
  );
  const mfaEnrollRequestOpenApiSchema = toOpenApiSchema(mfaEnrollRequestSchema);
  const mfaEnrollAcceptedSchema = toOpenApiSchema(mfaEnrollResultSchema);
  const mfaEnrollConfirmRequestOpenApiSchema = toOpenApiSchema(
    mfaEnrollConfirmRequestSchema,
  );
  const mfaEnrollConfirmedSchema = toOpenApiSchema(
    mfaEnrollConfirmResultSchema,
  );
  const caseIdSchema = requireObjectProperty(readParamsSchema, "caseId");

  return {
    openapi: "3.0.3",
    info: {
      title: "TaxPulse Core Case Service API",
      version: "0.1.0",
      description:
        "Tenant-scoped Tax Plan Cycle create and read operations for the Core Case Service.",
    },
    tags: [
      {
        name: "Core Case Service",
        description: "Tenant-scoped Tax Plan Cycle operations.",
      },
      {
        name: "Authentication",
        description: "Registration, password, and MFA login operations.",
      },
      {
        name: "MFA Enrollment",
        description: "TOTP second-factor enrollment operations.",
      },
    ],
    paths: {
      "/auth/login": {
        post: {
          operationId: "startPasswordLogin",
          tags: ["Authentication"],
          summary: "Verify a password and start an MFA challenge",
          description:
            "Resolves the tenant from workspace_slug for shared-host deployments, " +
            "or from the firm-specific login hostname when workspace_slug is omitted. " +
            "Clients must not send tenant_id.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: passwordLoginRequestOpenApiSchema,
                example: fakePasswordLoginRequestExample,
              },
            },
          },
          responses: {
            "202": {
              description: "The password was accepted and an MFA challenge is required.",
              content: {
                "application/json": {
                  schema: mfaChallengeResponseOpenApiSchema,
                  example: fakeMfaChallengeResponseExample,
                },
              },
            },
            "400": {
              description: "The login request body failed validation.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    ...validationErrorExample,
                    issues: [{ path: ["email"], message: "Invalid email address", code: "invalid_format" }],
                  },
                },
              },
            },
            "401": {
              description: "The submitted email or password was invalid.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "https://taxpulse.example/problems/invalid-credentials",
                    title: "Invalid Credentials",
                    status: 401,
                    detail: "The email or password is invalid.",
                  },
                },
              },
            },
            "404": {
              description: "The login hostname does not identify an active workspace.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "https://taxpulse.example/problems/tenant-login-not-found",
                    title: "Login Workspace Not Found",
                    status: 404,
                    detail: "The requested login workspace was not found.",
                  },
                },
              },
            },
          },
        },
      },
      "/auth/register": {
        post: {
          operationId: "registerUser",
          tags: ["Authentication"],
          summary: "Register a new tenant-scoped account",
          description:
            "Creates a new account with server-controlled Client and invited defaults. " +
            "The password is never returned or exposed as a hash.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: registrationRequestOpenApiSchema,
                example: fakeRegistrationRequestExample,
              },
            },
          },
          responses: {
            "201": {
              description: "The account was registered.",
              content: {
                "application/json": {
                  schema: registrationAccountResponseOpenApiSchema,
                  example: fakeRegistrationAccountResponseExample,
                },
              },
            },
            "400": {
              description: "The registration request body failed validation.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    ...validationErrorExample,
                    issues: [
                      {
                        path: ["email"],
                        message: "Invalid email address",
                        code: "invalid_format",
                      },
                    ],
                  },
                },
              },
            },
            "409": {
              description: "An account with the email already exists in the tenant.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "https://taxpulse.example/problems/email-already-registered",
                    title: "Email Already Registered",
                    status: 409,
                    detail:
                      "An account with this email is already registered for this tenant.",
                    code: "EMAIL_ALREADY_REGISTERED",
                  },
                },
              },
            },
            "500": {
              description: "An unexpected service error occurred.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "about:blank",
                    title: "Internal Server Error",
                    status: 500,
                    detail: "An unexpected error occurred.",
                  },
                },
              },
            },
          },
        },
      },
      "/auth/login/mfa": {
        post: {
          operationId: "verifyLoginMfaTotp",
          tags: ["Authentication"],
          summary: "Verify TOTP MFA and establish a browser session",
          description:
            "Consumes the tenant and user challenge identifiers returned from " +
            "POST /auth/login, verifies the user's enrolled TOTP factor, and " +
            "returns a signed bearer access token and sets the opaque refresh token in a Secure, HttpOnly cookie.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: authMfaLoginRequestOpenApiSchema,
                example: fakeMfaConfirmRequestExample,
              },
            },
          },
          responses: {
            "200": {
              description:
                "The TOTP code was accepted and a browser session was established.",
              content: {
                "application/json": {
                  schema: authMfaLoginResultOpenApiSchema,
                  example: fakeAuthMfaLoginResultExample,
                },
              },
            },
            "400": {
              description:
                "The MFA login verification request body failed validation.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    ...validationErrorExample,
                    issues: [
                      {
                        path: ["code"],
                        message: "TOTP code must be exactly 6 digits.",
                        code: "invalid_format",
                      },
                    ],
                  },
                },
              },
            },
            "401": {
              description:
                "The MFA challenge identifiers or submitted TOTP code were invalid.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "https://taxpulse.example/problems/authentication-failed",
                    title: "Authentication Failed",
                    status: 401,
                    detail: "The submitted MFA challenge or code is invalid.",
                  },
                },
              },
            },
            "500": {
              description: "An unexpected service error occurred.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "about:blank",
                    title: "Internal Server Error",
                    status: 500,
                    detail: "An unexpected error occurred.",
                  },
                },
              },
            },
          },
        },
      },
      "/mfa/enroll": {
        post: {
          operationId: "enrollMfaTotp",
          tags: ["MFA Enrollment"],
          summary: "Begin TOTP MFA enrollment",
          description:
            "Generates a TOTP secret and provisioning URI for the tenant-scoped " +
            "user identified by the MFA challenge fields returned from POST /auth/login.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: mfaEnrollRequestOpenApiSchema,
                example: fakeMfaEnrollRequestExample,
              },
            },
          },
          responses: {
            "202": {
              description:
                "A pending TOTP enrollment was created and can be confirmed with a current code.",
              content: {
                "application/json": {
                  schema: mfaEnrollAcceptedSchema,
                  example: {
                    provisioning_uri:
                      "otpauth://totp/TaxPulse%20Advisory:alex%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=TaxPulse%20Advisory",
                  },
                },
              },
            },
            "400": {
              description: "The enrollment request body failed validation.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: validationErrorExample,
                },
              },
            },
            "401": {
              description:
                "No tenant and user MFA challenge context was provided.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "https://taxpulse.example/problems/authentication-required",
                    title: "Authentication Required",
                    status: 401,
                    detail: "An authenticated tenant and user context is required.",
                  },
                },
              },
            },
            "404": {
              description:
                "No user was found for the supplied tenant-scoped challenge identifiers.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "https://taxpulse.example/problems/mfa-user-not-found",
                    title: "MFA User Not Found",
                    status: 404,
                    detail:
                      "No tenant-scoped user was found for MFA enrollment.",
                  },
                },
              },
            },
            "409": {
              description: "The user already has an active MFA enrollment.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "https://taxpulse.example/problems/mfa-already-enrolled",
                    title: "MFA Already Enrolled",
                    status: 409,
                    detail: "The user already has an active MFA enrollment.",
                  },
                },
              },
            },
          },
        },
      },
      "/mfa/enroll/confirm": {
        post: {
          operationId: "confirmMfaTotpEnrollment",
          tags: ["MFA Enrollment"],
          summary: "Confirm TOTP MFA enrollment",
          description:
            "Activates a pending TOTP enrollment after the user submits a valid current code.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: mfaEnrollConfirmRequestOpenApiSchema,
                example: fakeMfaConfirmRequestExample,
              },
            },
          },
          responses: {
            "200": {
              description: "The pending MFA enrollment was confirmed.",
              content: {
                "application/json": {
                  schema: mfaEnrollConfirmedSchema,
                  example: { enrolled: true },
                },
              },
            },
            "400": {
              description:
                "The confirmation request body failed validation.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: validationErrorExample,
                },
              },
            },
            "401": {
              description:
                "The MFA challenge context is missing or the submitted TOTP code is invalid.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "https://taxpulse.example/problems/mfa-invalid-code",
                    title: "Invalid MFA Code",
                    status: 401,
                    detail: "The submitted MFA code is invalid.",
                  },
                },
              },
            },
            "404": {
              description:
                "No pending MFA enrollment or tenant-scoped user was found.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "https://taxpulse.example/problems/mfa-enrollment-not-found",
                    title: "MFA Enrollment Not Found",
                    status: 404,
                    detail:
                      "No pending MFA enrollment was found for the user.",
                  },
                },
              },
            },
            "409": {
              description: "The user already has an active MFA enrollment.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "https://taxpulse.example/problems/mfa-already-enrolled",
                    title: "MFA Already Enrolled",
                    status: 409,
                    detail: "The user already has an active MFA enrollment.",
                  },
                },
              },
            },
          },
        },
      },
      "/v1/cases/{caseId}/deductions": {
        get: {
          operationId: "readCaseDeductions",
          tags: ["Core Case Service"],
          summary: "Read the case deduction rows",
          description:
            "Returns the deduction table rows for the requested case as a JSON array. Date and numeric fields are serialized as strings so clients can consume them without special parsing.",
          parameters: [
            {
              name: "caseId",
              in: "path",
              required: true,
              description:
                "Case identifier scoped by the authenticated request tenant.",
              schema: deductionReadCaseIdSchema,
              example: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d22",
            },
          ],
          responses: {
            "200": {
              description: "The case deduction rows were returned.",
              content: {
                "application/json": {
                  schema: deductionRowsResponseSchema,
                  example: [
                    {
                      id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e91",
                      case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d12",
                      date: "2026-07-16",
                      description: "State filing fee",
                      category: "Other",
                      amount: "135.00",
                      tax_impact: "33.75",
                      deleted: false,
                    },
                  ],
                },
              },
            },
            "401": {
              description:
                "The request did not include a valid shared JWT access token.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "https://taxpulse.example/problems/authentication-required",
                    title: "Authentication Required",
                    status: 401,
                    detail: "A valid access token is required.",
                  },
                },
              },
            },
          },
        },
        post: {
          operationId: "createCaseDeduction",
          tags: ["Core Case Service"],
          summary: "Create a case deduction row",
          description:
            "Creates a tenant-scoped deduction for the requested case and returns the created row. Tax impact is estimated from the recorded deduction amount.",
          parameters: [
            {
              name: "caseId",
              in: "path",
              required: true,
              description:
                "Case identifier scoped by the authenticated request tenant.",
              schema: deductionReadCaseIdSchema,
              example: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d22",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: deductionCreateRequestSchema,
                example: {
                  date: "2026-08-01",
                  description: "Advisor conference fee",
                  category: "Education",
                  amount: 900,
                },
              },
            },
          },
          responses: {
            "201": {
              description: "The deduction row was created.",
              content: {
                "application/json": {
                  schema: deductionRowResponseSchema,
                  example: {
                    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e92",
                    case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d12",
                    date: "2026-08-01",
                    description: "Advisor conference fee",
                    category: "Education",
                    amount: "900.00",
                    tax_impact: "225.00",
                    deleted: false,
                  },
                },
              },
            },
            "400": {
              description: "The request body failed validation.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    ...validationErrorExample,
                    detail: "Request body failed validation.",
                    issues: [
                      {
                        path: ["amount"],
                        message: "Too small: expected number to be >=0",
                        code: "too_small",
                      },
                    ],
                  },
                },
              },
            },
            "401": {
              description:
                "The request did not include a valid shared JWT access token.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "https://taxpulse.example/problems/authentication-required",
                    title: "Authentication Required",
                    status: 401,
                    detail: "A valid access token is required.",
                  },
                },
              },
            },
            "404": {
              description:
                "No tenant-scoped Tax Plan Cycle was found for the requested case.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "https://taxpulse.example/problems/tax-plan-cycle-not-found",
                    title: "Tax Plan Cycle Not Found",
                    status: 404,
                    detail: "No tax plan cycle was found for the requested case ID.",
                  },
                },
              },
            },
          },
        },
      },
      "/v1/cases/{caseId}/income-events": {
        get: {
          operationId: "readCaseIncomeEvents",
          tags: ["Core Case Service"],
          summary: "Read the case income-event rows",
          description:
            "Returns tenant-scoped persisted income events ordered by date and ID. Numeric fields are serialized as decimal strings.",
          parameters: [
            {
              name: "caseId",
              in: "path",
              required: true,
              description:
                "Case identifier scoped by the authenticated request tenant.",
              schema: incomeEventReadCaseIdSchema,
              example: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d12",
            },
          ],
          responses: {
            "200": {
              description: "The case income-event rows were returned.",
              content: {
                "application/json": {
                  schema: incomeEventRowsResponseSchema,
                  example: [
                    {
                      id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8ca218",
                      case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d12",
                      date: "2026-01-31",
                      source: "Synthetic W-2 wages",
                      type: "w2",
                      amount: "125000.50",
                      withholding: "21500.25",
                    },
                  ],
                },
              },
            },
            "401": {
              description:
                "The request did not include a valid shared JWT access token.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "https://taxpulse.example/problems/authentication-required",
                    title: "Authentication Required",
                    status: 401,
                    detail: "A valid access token is required.",
                  },
                },
              },
            },
            "404": {
              description:
                "No tenant-scoped Tax Plan Cycle was found for the requested case.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "https://taxpulse.example/problems/tax-plan-cycle-not-found",
                    title: "Tax Plan Cycle Not Found",
                    status: 404,
                    detail: "No tax plan cycle was found for the requested case ID.",
                  },
                },
              },
            },
          },
        },
        post: {
          operationId: "createCaseIncomeEvent",
          tags: ["Core Case Service"],
          summary: "Create a case income event",
          description:
            "Creates a tenant-scoped income event using the current UTC calendar date and returns the persisted row.",
          parameters: [
            {
              name: "caseId",
              in: "path",
              required: true,
              description:
                "Case identifier scoped by the authenticated request tenant.",
              schema: incomeEventReadCaseIdSchema,
              example: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d12",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: incomeEventCreateRequestSchema,
                example: {
                  source: "Acme Corporation",
                  type: "w2",
                  amount: 125000.5,
                  withholding: 21500.25,
                },
              },
            },
          },
          responses: {
            "201": {
              description: "The income-event row was created.",
              content: {
                "application/json": {
                  schema: incomeEventRowResponseSchema,
                  example: {
                    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8ca219",
                    case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d12",
                    date: "2026-08-31",
                    source: "Acme Corporation",
                    type: "w2",
                    amount: "125000.50",
                    withholding: "21500.25",
                  },
                },
              },
            },
            "400": {
              description: "The request body failed validation.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    ...validationErrorExample,
                    detail: "Request body failed validation.",
                  },
                },
              },
            },
            "401": {
              description:
                "The request did not include a valid shared JWT access token.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "https://taxpulse.example/problems/authentication-required",
                    title: "Authentication Required",
                    status: 401,
                    detail: "A valid access token is required.",
                  },
                },
              },
            },
            "404": {
              description:
                "No tenant-scoped Tax Plan Cycle was found for the requested case.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "https://taxpulse.example/problems/tax-plan-cycle-not-found",
                    title: "Tax Plan Cycle Not Found",
                    status: 404,
                    detail: "No tax plan cycle was found for the requested case ID.",
                  },
                },
              },
            },
          },
        },
      },
      "/v1/tax-plan-cycles": {
        get: {
          operationId: "listTaxPlanCycleQueue",
          tags: ["Core Case Service"],
          summary: "List the tenant-scoped Tax Plan Cycle queue",
          description:
            "Returns the request tenant's queue ordered by due date. " +
            "The response is the read model used by the queue screen.",
          responses: {
            "200": {
              description: "The tenant-scoped queue was returned.",
              content: {
                "application/json": {
                  schema: toOpenApiSchema(taxPlanCycleQueueGetResponseSchema),
                  example: fakeTaxPlanCycleQueueExample,
                },
              },
            },
            "401": {
              description:
                "The request did not include a valid shared JWT access token.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "https://taxpulse.example/problems/authentication-required",
                    title: "Authentication Required",
                    status: 401,
                    detail: "A valid access token is required.",
                  },
                },
              },
            },
            "500": {
              description: "An unexpected service error occurred.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "about:blank",
                    title: "Internal Server Error",
                    status: 500,
                    detail: "An unexpected error occurred.",
                  },
                },
              },
            },
          },
        },
        post: {
          operationId: "createTaxPlanCycle",
          tags: ["Core Case Service"],
          summary: "Create a tenant-scoped Tax Plan Cycle",
          description:
            "Accepts a Tax Plan Cycle create payload with a required retry key. " +
            "New cycles enter Intake; no separate status field is used.",
          parameters: [
            {
              name: "Idempotency-Key",
              in: "header",
              required: true,
              description:
                "Required retry key. Reusing the same key for the same tenant returns the original case ID.",
              schema: {
                type: "string",
              },
              example: "case-create-key-001",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: createRequestSchema,
                example: fakeTaxPlanCycleCreateExample,
              },
            },
          },
          responses: {
            "202": {
              description: "The Tax Plan Cycle was created.",
              content: {
                "application/json": {
                  schema: createAcceptedSchema,
                  example: { case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01" },
                },
              },
            },
            "400": {
              description:
                "The create request body failed validation or the Idempotency-Key header was missing.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: validationErrorExample,
                },
              },
            },
            "409": {
              description:
                "The requested Tax Plan Cycle conflicts with current service state.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "https://taxpulse.example/problems/cycle-conflict",
                    title: "Cycle Conflict",
                    status: 409,
                    detail: "The requested tax plan cycle is already locked.",
                  },
                },
              },
            },
            "500": {
              description: "An unexpected service error occurred.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "about:blank",
                    title: "Internal Server Error",
                    status: 500,
                    detail: "An unexpected error occurred.",
                  },
                },
              },
            },
          },
        },
      },
      "/v1/clients": {
        get: {
          operationId: "listClientRoster",
          tags: ["Core Case Service"],
          summary: "List the tenant-scoped Client Roster",
          description:
            "Returns the authenticated advisor or firm's client roster. " +
            "Tenant scope is derived from the shared JWT; clients must not send tenant_id.",
          responses: {
            "200": {
              description: "The tenant-scoped client roster.",
              content: {
                "application/json": {
                  schema: clientRosterListOpenApiSchema,
                  example: fakeClientRosterExample,
                },
              },
            },
            "401": {
              description:
                "The request did not include a valid shared JWT access token.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                },
              },
            },
          },
        },
      },
      "/v1/firm/users": {
        get: {
          operationId: "listFirmUsers",
          tags: ["Core Case Service"],
          summary: "List the tenant-scoped firm users",
          description:
            "Returns users for the authenticated firm tenant. Tenant scope is derived " +
            "from the shared JWT; clients must not send tenant_id.",
          responses: {
            "200": {
              description: "The authenticated tenant's firm user roster.",
              content: {
                "application/json": {
                  schema: firmUsersListOpenApiSchema,
                  example: fakeFirmUsersExample,
                },
              },
            },
            "401": {
              description:
                "The request did not include a valid shared JWT access token.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                },
              },
            },
          },
        },
      },
      "/v1/firm/users/{userId}/role": {
        patch: {
          operationId: "updateFirmUserRole",
          tags: ["Core Case Service"],
          summary: "Update a tenant-scoped firm user role",
          description:
            "Lets a Firm Admin change a user's role within the authenticated firm tenant. " +
            "Tenant scope is derived from the shared JWT; clients must not send tenant_id.",
          parameters: [
            {
              name: "userId",
              in: "path",
              required: true,
              description:
                "User identifier scoped by the authenticated request tenant.",
              schema: firmUserRoleUpdateUserIdSchema,
              example: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d66",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: firmUserRoleUpdateRequestOpenApiSchema,
                example: fakeFirmUserRoleUpdateRequestExample,
              },
            },
          },
          responses: {
            "200": {
              description: "The firm user's tenant-scoped role was updated.",
              content: {
                "application/json": {
                  schema: toOpenApiSchema(firmUserRowSchema),
                  example: {
                    ...fakeFirmUsersExample[1],
                    role: fakeFirmUserRoleUpdateRequestExample.role,
                  },
                },
              },
            },
            "400": {
              description: "The role update request failed validation.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: validationErrorExample,
                },
              },
            },
            "401": {
              description:
                "The request did not include a valid shared JWT access token.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                },
              },
            },
            "403": {
              description:
                "The authenticated user is not a Firm Admin.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                },
              },
            },
            "404": {
              description:
                "No tenant-scoped firm user was found for the requested user ID.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                },
              },
            },
          },
        },
      },
      "/v1/administration/tenants-users": {
        get: {
          operationId: "listPlatformTenantsUsers",
          tags: ["Core Case Service"],
          summary: "List all tenants and their users",
          description:
            "Returns every tenant with its user roster for TaxPulse Platform Admins. " +
            "This endpoint is intentionally separate from the tenant-scoped firm users route.",
          responses: {
            "200": {
              description: "All tenants with users sectioned under each tenant.",
              content: {
                "application/json": {
                  schema: platformTenantUsersListOpenApiSchema,
                  example: fakePlatformTenantUsersExample,
                },
              },
            },
            "401": {
              description:
                "The request did not include a valid shared JWT access token.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                },
              },
            },
            "403": {
              description:
                "The authenticated user is not a TaxPulse Platform Admin.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                },
              },
            },
          },
        },
      },
      "/v1/administration/roles-permissions": {
        get: {
          operationId: "listPlatformRolesPermissions",
          tags: ["Core Case Service"],
          summary: "List platform role permissions",
          description:
            "Returns the read-only permission matrix for TaxPulse Platform Admins.",
          responses: {
            "200": {
              description: "The platform role permission matrix.",
              content: {
                "application/json": {
                  schema: platformPermissionMatrixOpenApiSchema,
                  example: fakePlatformPermissionMatrixExample,
                },
              },
            },
            "401": {
              description:
                "The request did not include a valid shared JWT access token.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                },
              },
            },
            "403": {
              description:
                "The authenticated user is not a TaxPulse Platform Admin.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                },
              },
            },
          },
        },
      },
      "/v1/administration/audit-log": {
        get: {
          operationId: "listPlatformAuditLog",
          tags: ["Core Case Service"],
          summary: "List platform-wide audit events",
          description:
            "Returns append-only audit entries across tenants for TaxPulse Platform Admins, " +
            "with financial figures redacted before output.",
          responses: {
            "200": {
              description: "The platform-wide audit log.",
              content: {
                "application/json": {
                  schema: platformAuditLogOpenApiSchema,
                  example: fakePlatformAuditLogExample,
                },
              },
            },
            "401": {
              description:
                "The request did not include a valid shared JWT access token.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                },
              },
            },
            "403": {
              description:
                "The authenticated user is not a TaxPulse Platform Admin.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                },
              },
            },
          },
        },
      },
      "/v1/administration/tenants/{tenantId}/users": {
        post: {
          operationId: "createPlatformTenantUser",
          tags: ["Core Case Service"],
          summary: "Create a user under a chosen tenant",
          description:
            "Lets a TaxPulse Platform Admin create a user under the selected tenant " +
            "without creating an impersonation control or session switch.",
          parameters: [
            {
              name: "tenantId",
              in: "path",
              required: true,
              description: "Tenant identifier that will own the created user.",
              schema: platformTenantUserCreateTenantIdSchema,
              example: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: platformTenantUserCreateRequestOpenApiSchema,
                example: fakePlatformTenantUserCreateRequestExample,
              },
            },
          },
          responses: {
            "201": {
              description: "The tenant user was created.",
              content: {
                "application/json": {
                  schema: toOpenApiSchema(platformTenantUserRowSchema),
                  example: {
                    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e02",
                    name: fakePlatformTenantUserCreateRequestExample.displayName,
                    email: fakePlatformTenantUserCreateRequestExample.email,
                    role: fakePlatformTenantUserCreateRequestExample.role,
                    status: fakePlatformTenantUserCreateRequestExample.status,
                    lastLoginAt: null,
                  },
                },
              },
            },
            "400": {
              description: "The create request failed validation.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: validationErrorExample,
                },
              },
            },
            "401": {
              description:
                "The request did not include a valid shared JWT access token.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                },
              },
            },
            "403": {
              description:
                "The authenticated user is not a TaxPulse Platform Admin.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                },
              },
            },
            "404": {
              description: "The requested tenant was not found.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                },
              },
            },
            "409": {
              description: "The tenant already has a user with this email.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                },
              },
            },
          },
        },
      },
      "/v1/tax-plan-cycles/{caseId}/comments": {
        get: {
          operationId: "listTaxPlanCycleComments",
          tags: ["Core Case Service"],
          summary: "List persisted comments for a Tax Plan Cycle",
          description:
            "Returns append-only comments for the tenant-scoped case in chronological order. " +
            "Only Firm Admin and Advisor users can access this operator workspace view.",
          parameters: [
            {
              name: "caseId",
              in: "path",
              required: true,
              description:
                "Synthetic UUID case identifier scoped by the request tenant.",
              schema: caseIdSchema,
              example: fakeTaxPlanCycleExample.id,
            },
          ],
          responses: {
            "200": {
              description: "The case comments were returned oldest-first.",
              content: {
                "application/json": {
                  schema: taxPlanCycleCommentsResponseOpenApiSchema,
                  example: { comments: [fakeTaxPlanCycleCommentExample] },
                },
              },
            },
            "400": {
              description: "The case ID path parameter failed validation.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: validationErrorExample,
                },
              },
            },
            "401": {
              description: "The request did not include a valid shared JWT access token.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                },
              },
            },
            "403": {
              description: "The authenticated user cannot access operator comments.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                },
              },
            },
            "404": {
              description: "No tenant-scoped Tax Plan Cycle was found for the requested case.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                },
              },
            },
          },
        },
        post: {
          operationId: "createTaxPlanCycleComment",
          tags: ["Core Case Service"],
          summary: "Create an append-only Tax Plan Cycle comment",
          description:
            "Stores a trimmed, non-empty case comment with the authenticated actor, role, " +
            "author display-name snapshot, and created timestamp. Comment creation also records a comment_created audit entry.",
          parameters: [
            {
              name: "caseId",
              in: "path",
              required: true,
              description:
                "Synthetic UUID case identifier scoped by the request tenant.",
              schema: caseIdSchema,
              example: fakeTaxPlanCycleExample.id,
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: taxPlanCycleCommentCreateRequestOpenApiSchema,
                example: { body: "Walk through Roth and DAF timing on the next review call." },
              },
            },
          },
          responses: {
            "201": {
              description: "The comment was persisted.",
              content: {
                "application/json": {
                  schema: taxPlanCycleCommentOpenApiSchema,
                  example: fakeTaxPlanCycleCommentExample,
                },
              },
            },
            "400": {
              description: "The comment request failed validation.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: validationErrorExample,
                },
              },
            },
            "401": {
              description: "The request did not include a valid shared JWT access token.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                },
              },
            },
            "403": {
              description:
                "The authenticated user is not a Firm Admin or Advisor, or the actor is unavailable in the tenant.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                },
              },
            },
            "404": {
              description: "No tenant-scoped Tax Plan Cycle was found for the requested case.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                },
              },
            },
          },
        },
      },
      "/v1/tax-plan-cycles/{caseId}/audit-entries": {
        get: {
          operationId: "listTaxPlanCycleAuditEntries",
          tags: ["Core Case Service"],
          summary: "List persisted audit entries for a Tax Plan Cycle",
          description:
            "Returns tenant-scoped, read-only audit entries in chronological order with income and deduction dollar figures redacted before output.",
          parameters: [
            {
              name: "caseId",
              in: "path",
              required: true,
              description:
                "Synthetic UUID case identifier scoped by the request tenant.",
              schema: caseIdSchema,
              example: fakeTaxPlanCycleExample.id,
            },
          ],
          responses: {
            "200": {
              description: "The case audit entries were returned oldest-first.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["audit_entries"],
                    properties: {
                      audit_entries: {
                        type: "array",
                        items: taxPlanCycleAuditEntryOpenApiSchema,
                      },
                    },
                  },
                  example: { audit_entries: [fakeTaxPlanCycleAuditEntryExample] },
                },
              },
            },
            "400": {
              description: "The case ID path parameter failed validation.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: validationErrorExample,
                },
              },
            },
            "401": {
              description: "The request did not include a valid shared JWT access token.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                },
              },
            },
            "403": {
              description: "The authenticated user cannot access operator audit entries.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                },
              },
            },
            "404": {
              description: "No tenant-scoped Tax Plan Cycle was found for the requested case.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                },
              },
            },
          },
        },
      },
      "/v1/tax-plan-cycles/{caseId}/scenarios": {
        post: {
          operationId: "modelTaxPlanCycleScenarios",
          tags: ["Core Case Service"],
          summary: "Model and persist Tax Plan Cycle scenarios",
          description:
            "Accepts a scenario modeling payload while the case is in Modeling stage, " +
            "calls the Tax Engine, and stores the returned scenario figures.",
          parameters: [
            {
              name: "caseId",
              in: "path",
              required: true,
              description:
                "Synthetic UUID case identifier scoped by the request tenant.",
              schema: caseIdSchema,
              example: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: toOpenApiSchema(scenarioModelingRequestSchema),
                example: fakeScenarioModelingRequestExample,
              },
            },
          },
          responses: {
            "201": {
              description: "The scenario modeling request was persisted.",
              content: {
                "application/json": {
                  schema: toOpenApiSchema(z.array(scenarioOpenApiSchema)),
                  example: fakeScenarioModelingResponseExample,
                },
              },
            },
            "400": {
              description: "The scenario modeling request body failed validation.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: validationErrorExample,
                },
              },
            },
            "401": {
              description:
                "The request did not include a valid shared JWT access token.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "https://taxpulse.example/problems/authentication-required",
                    title: "Authentication Required",
                    status: 401,
                    detail: "A valid access token is required.",
                  },
                },
              },
            },
            "409": {
              description:
                "The requested case is not in Modeling stage.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "https://taxpulse.example/problems/scenario-modeling-unavailable",
                    title: "Scenario Modeling Unavailable",
                    status: 409,
                    detail:
                      "Scenario modeling is only available while the case is in Modeling stage.",
                  },
                },
              },
            },
            "502": {
              description:
                "The liability engine could not be reached or returned an invalid result after retries.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "https://taxpulse.example/problems/tax-engine-unavailable",
                    title: "Tax Engine Unavailable",
                    status: 502,
                    detail: "The liability engine request failed after retries.",
                  },
                },
              },
            },
          },
        },
      },
      "/v1/tax-plan-cycles/{caseId}/quarterly-estimates": {
        get: {
          operationId: "readQuarterlyEstimates",
          tags: ["Core Case Service"],
          summary: "Read the quarterly estimates for a case",
          description:
            "Returns the read-only quarterly estimate schedule for the requested case as a JSON array.",
          parameters: [
            {
              name: "caseId",
              in: "path",
              required: true,
              description:
                "Synthetic UUID case identifier scoped by the request tenant.",
              schema: quarterlyEstimateParamsSchema,
              example: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d22",
            },
          ],
          responses: {
            "200": {
              description: "The quarterly estimates were returned.",
              content: {
                "application/json": {
                  schema: quarterlyEstimateRowsResponseSchema,
                  example: [
                    {
                      case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d12",
                      quarter: "Q1",
                      due_date: "2026-04-15",
                      estimated_payment: "3620.00",
                      withholding_applied: "2140.00",
                      covered_amount: "2140.00",
                      remaining_due: "1480.00",
                    },
                  ],
                },
              },
            },
            "401": {
              description:
                "The request did not include a valid shared JWT access token.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "https://taxpulse.example/problems/authentication-required",
                    title: "Authentication Required",
                    status: 401,
                    detail: "A valid access token is required.",
                  },
                },
              },
            },
          },
        },
      },
      "/v1/tax-plan-cycles/{caseId}": {
        get: {
          operationId: "readTaxPlanCycle",
          tags: ["Core Case Service"],
          summary: "Read a tenant-scoped Tax Plan Cycle by case ID",
          description:
            "Returns a Tax Plan Cycle only when it belongs to the request tenant. " +
            "Missing and cross-tenant cases both return 404.",
          parameters: [
            {
              name: "caseId",
              in: "path",
              required: true,
              description:
                "Synthetic UUID case identifier scoped by the request tenant.",
              schema: caseIdSchema,
              example: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
            },
          ],
          responses: {
            "200": {
              description: "The tenant-scoped Tax Plan Cycle was found.",
              content: {
                "application/json": {
                  schema: taxPlanCycleResponseSchema,
                  example: fakeTaxPlanCycleExample,
                },
              },
            },
            "400": {
              description: "The case ID path parameter failed validation.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    ...validationErrorExample,
                    detail: "Request path parameters failed validation.",
                    issues: [
                      {
                        path: ["caseId"],
                        message:
                          "Invalid UUID",
                        code: "invalid_format",
                      },
                    ],
                  },
                },
              },
            },
            "404": {
              description:
                "No Tax Plan Cycle was found for the requested case ID in the request tenant.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "https://taxpulse.example/problems/tax-plan-cycle-not-found",
                    title: "Tax Plan Cycle Not Found",
                    status: 404,
                    detail: "No tax plan cycle was found for the requested case ID.",
                  },
                },
              },
            },
            "500": {
              description: "An unexpected service error occurred.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "about:blank",
                    title: "Internal Server Error",
                    status: 500,
                    detail: "An unexpected error occurred.",
                  },
                },
              },
            },
          },
        },
      },
      "/v1/tax-plan-cycles/{caseId}/hold": {
        patch: {
          operationId: "updateTaxPlanCycleHold",
          tags: ["Core Case Service"],
          summary: "Update the hold state of a Tax Plan Cycle",
          description:
            "Places or removes a hold on a Tax Plan Cycle. When on_hold is true, a non-empty hold_reason is required.",
          parameters: [
            {
              name: "caseId",
              in: "path",
              required: true,
              description: "Synthetic UUID case identifier scoped by the request tenant.",
              schema: caseIdSchema,
              example: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: taxPlanCycleHoldRequestSchema,
                examples: {
                  hold: {
                    summary: "Place hold",
                    value: { on_hold: true, hold_reason: "Awaiting signed documents" },
                  },
                  unhold: {
                    summary: "Remove hold",
                    value: { on_hold: false },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "The Tax Plan Cycle hold state was updated.",
              content: {
                "application/json": {
                  schema: taxPlanCycleResponseSchema,
                  example: { ...fakeTaxPlanCycleExample, on_hold: true, hold_reason: "Awaiting signed documents" },
                },
              },
            },
            "400": {
              description: "The case ID or request body failed validation.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: validationErrorExample,
                },
              },
            },
            "401": {
              description: "The request did not include a valid shared JWT access token.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "https://taxpulse.example/problems/authentication-required",
                    title: "Authentication Required",
                    status: 401,
                    detail: "A valid access token is required.",
                  },
                },
              },
            },
            "403": {
              description: "The authenticated role is not permitted to change hold state.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "https://taxpulse.example/problems/operator-access-required",
                    title: "Operator Access Required",
                    status: 403,
                    detail: "Client users can access plan progress only through the My Tax Plan view.",
                  },
                },
              },
            },
            "404": {
              description: "No Tax Plan Cycle was found for the requested case ID in the request tenant.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "https://taxpulse.example/problems/tax-plan-cycle-not-found",
                    title: "Tax Plan Cycle Not Found",
                    status: 404,
                    detail: "No tax plan cycle was found for the requested case ID.",
                  },
                },
              },
            },
          },
        },
      },
      "/v1/tax-plan-cycles/{caseId}/transition": {
        patch: {
          operationId: "transitionTaxPlanCycle",
          tags: ["Core Case Service"],
          summary: "Transition a Tax Plan Cycle stage",
          description:
            "Transitions a Tax Plan Cycle to the requested stage. Held cycles return 409 until the hold is removed.",
          parameters: [
            {
              name: "caseId",
              in: "path",
              required: true,
              description: "Synthetic UUID case identifier scoped by the request tenant.",
              schema: caseIdSchema,
              example: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: taxPlanCycleTransitionRequestSchema,
                example: { to_stage: "Modeling" },
              },
            },
          },
          responses: {
            "200": {
              description: "The Tax Plan Cycle stage was updated.",
              content: {
                "application/json": {
                  schema: taxPlanCycleResponseSchema,
                  example: { ...fakeTaxPlanCycleExample, stage: "Modeling" },
                },
              },
            },
            "400": {
              description: "The case ID or request body failed validation.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: validationErrorExample,
                },
              },
            },
            "401": {
              description: "The request did not include a valid shared JWT access token.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "https://taxpulse.example/problems/authentication-required",
                    title: "Authentication Required",
                    status: 401,
                    detail: "A valid access token is required.",
                  },
                },
              },
            },
            "403": {
              description: "The authenticated role is not permitted to perform this transition.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "https://taxpulse.example/problems/forbidden-transition",
                    title: "Forbidden",
                    status: 403,
                    detail: "The current role is not authorized to perform this transition.",
                  },
                },
              },
            },
            "404": {
              description: "No Tax Plan Cycle was found for the requested case ID in the request tenant.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "https://taxpulse.example/problems/tax-plan-cycle-not-found",
                    title: "Tax Plan Cycle Not Found",
                    status: 404,
                    detail: "No tax plan cycle was found for the requested case ID.",
                  },
                },
              },
            },
            "409": {
              description: "The Tax Plan Cycle is on hold and cannot advance stages.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "https://taxpulse.example/problems/tax-plan-cycle-on-hold",
                    title: "Tax Plan Cycle On Hold",
                    status: 409,
                    detail: "Remove the hold before advancing this Tax Plan Cycle.",
                  },
                },
              },
            },
            "422": {
              description: "The requested stage transition is not legal.",
              content: {
                "application/problem+json": {
                  schema: problemDetailsSchema,
                  example: {
                    type: "https://taxpulse.example/problems/invalid-transition",
                    title: "Invalid Transition",
                    status: 422,
                    detail: "The requested stage transition is not legal.",
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}
