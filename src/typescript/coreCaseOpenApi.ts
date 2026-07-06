import { z } from "zod";
import type { ZodType } from "zod";

import { taxPlanCycleCreateResultSchema } from "./taxPlanCycleCreateController.js";
import {
  taxPlanCycleCreateSchema,
  taxPlanCycleReadParamsSchema,
  taxPlanCycleSchema,
} from "./taxPlanCycle.js";

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
    name: "TaxPlanCycle",
    schema: taxPlanCycleSchema,
  },
  {
    name: "TaxPlanCycleCreateAccepted",
    schema: taxPlanCycleCreateResultSchema,
  },
] as const satisfies readonly CoreCaseOpenApiSchemaRegistration[];

const fakeTaxPlanCycleExample = {
  case_id: "case-123",
  client_id: "client-123",
  stage: "Intake",
  owner: "advisor-123",
  priority: "medium",
  due_date: "2026-12-31",
  on_hold: false,
};

const validationErrorExample = {
  type: "https://taxpulse.example/problems/validation-error",
  title: "Validation Error",
  status: 400,
  detail: "Request body failed validation.",
  code: "VALIDATION_ERROR",
  issues: [
    {
      path: ["stage"],
      message: "Invalid option: expected one of the canonical stages",
      code: "invalid_value",
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
  const createAcceptedSchema = toOpenApiSchema(taxPlanCycleCreateResultSchema);
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
    ],
    paths: {
      "/tax-plan-cycles": {
        post: {
          operationId: "createTaxPlanCycle",
          tags: ["Core Case Service"],
          summary: "Create a tenant-scoped Tax Plan Cycle",
          description:
            "Accepts a Tax Plan Cycle create payload. Workflow condition is represented by stage; " +
            "no separate status field is used.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: createRequestSchema,
                example: fakeTaxPlanCycleExample,
              },
            },
          },
          responses: {
            "202": {
              description: "The Tax Plan Cycle create request was accepted.",
              content: {
                "application/json": {
                  schema: createAcceptedSchema,
                  example: { accepted: true },
                },
              },
            },
            "400": {
              description: "The create request body failed validation.",
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
      "/tax-plan-cycles/{caseId}": {
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
                "Synthetic case identifier scoped by the request tenant.",
              schema: caseIdSchema,
              example: "case-123",
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
                          "Too small: expected string to have >=1 characters",
                        code: "too_small",
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
