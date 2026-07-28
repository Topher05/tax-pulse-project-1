import { z } from "zod";
import type { ZodType } from "zod";

import {
  authMfaLoginRequestSchema,
  authMfaLoginResultSchema,
} from "./authMfaLogin.js";
import {
  registrationAccountResponseSchema,
  registrationRequestSchema,
} from "./authRegistration.js";
import {
  scenarioComputedResultSchema,
  scenarioTypedFiguresSchema,
} from "./scenario.js";
import {
  scenarioModelingRequestSchema,
} from "./features/taxPlanCycle/scenarioModeling.js";
import { taxPlanCycleCreateResultSchema } from "./features/taxPlanCycle/index.js";
import {
  mfaEnrollConfirmRequestSchema,
  mfaEnrollConfirmResultSchema,
  mfaEnrollRequestSchema,
  mfaEnrollResultSchema,
} from "./mfaEnrollment.js";
import {
  taxPlanCycleCreateSchema,
  taxPlanCycleReadParamsSchema,
  taxPlanCycleSchema,
} from "./features/taxPlanCycle/index.js";

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

const scenarioOpenApiSchema = z.strictObject({
  id: z.uuid(),
  case_id: z.uuid(),
  name: z.string().min(1),
  typed_figures: scenarioTypedFiguresSchema,
  computed_result: scenarioComputedResultSchema,
  created_at: z.iso.datetime(),
});

const taxPlanCycleReadResponseOpenApiSchema = taxPlanCycleSchema.extend({
  scenarios: z.array(scenarioOpenApiSchema),
});

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
    name: "TaxPlanCycle",
    schema: taxPlanCycleSchema,
  },
  {
    name: "TaxPlanCycleReadResponse",
    schema: taxPlanCycleReadResponseOpenApiSchema,
  },
  {
    name: "TaxPlanCycleCreateAccepted",
    schema: taxPlanCycleCreateResultSchema,
  },
  {
    name: "ScenarioModelingRequest",
    schema: scenarioModelingRequestSchema,
  },
  {
    name: "Scenario",
    schema: scenarioOpenApiSchema,
  },
  {
    name: "AuthMfaLoginRequest",
    schema: authMfaLoginRequestSchema,
  },
  {
    name: "AuthMfaLoginResult",
    schema: authMfaLoginResultSchema,
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

const fakeScenarioModelingRequestExample = {
  baseline: {
    income: 250000,
    deductions: 30000,
    state: "CA",
    filing_status: "married_filing_jointly",
  },
  scenarios: [
    {
      name: "Increase deductions",
      typed_figures: {
        income: 250000,
        deductions: 36000,
        state: "CA",
        filing_status: "married_filing_jointly",
      },
    },
    {
      name: "Keep baseline",
      typed_figures: {
        income: 250000,
        deductions: 30000,
        state: "CA",
        filing_status: "married_filing_jointly",
      },
    },
  ],
};

const fakeScenarioModelingResponseExample: JsonValue[] = [
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e21",
    case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
    name: "Increase deductions",
    typed_figures: fakeScenarioModelingRequestExample.scenarios[0]!.typed_figures,
    computed_result: {
      federal_liability: 38000,
      state_liability: 12000,
      effective_rate: 0.2,
      marginal_rate: 0.32,
      quarterly_estimate: 12500,
    },
    created_at: "2026-07-27T00:00:00.000Z",
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e22",
    case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
    name: "Keep baseline",
    typed_figures: fakeScenarioModelingRequestExample.scenarios[1]!.typed_figures,
    computed_result: {
      totalTax: "53000.00",
      deltaVBaseline: "0.00",
    },
    created_at: "2026-07-27T00:00:01.000Z",
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
  refresh_token: "synthetic-opaque-refresh-token",
  refresh_expires_in: 2592000,
};

const fakeRegistrationRequestExample = {
  tenant_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
  email: "new-client@example.test",
  password: "synthetic-registration-password",
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
  const taxPlanCycleReadResponseSchema = toOpenApiSchema(
    taxPlanCycleReadResponseOpenApiSchema,
  );
  const createAcceptedSchema = toOpenApiSchema(taxPlanCycleCreateResultSchema);
  const authMfaLoginRequestOpenApiSchema = toOpenApiSchema(
    authMfaLoginRequestSchema,
  );
  const authMfaLoginResultOpenApiSchema = toOpenApiSchema(
    authMfaLoginResultSchema,
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
          summary: "Verify TOTP MFA and issue access and refresh tokens",
          description:
            "Consumes the tenant and user challenge identifiers returned from " +
            "POST /auth/login, verifies the user's enrolled TOTP factor, and " +
            "returns a signed bearer access token and opaque refresh token.",
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
                "The TOTP code was accepted and a token pair was issued.",
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
      "/v1/tax-plan-cycles": {
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
                  schema: taxPlanCycleReadResponseSchema,
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
    },
  };
}
