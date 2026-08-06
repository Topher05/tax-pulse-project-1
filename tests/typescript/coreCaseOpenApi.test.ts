import { once } from "node:events";
import type { AddressInfo } from "node:net";

import { describe, expect, test } from "vitest";

import {
  authMfaLoginRequestSchema,
  authSessionTokenResponseSchema,
  clientRosterListResponseSchema,
  clientRosterRowSchema,
  coreCaseOpenApiSchemaRegistrations,
  createApp,
  createCoreCaseOpenApiDocument,
  createCoreCaseOpenApiRouter,
  createLogger,
  deductionCreateSchema,
  deductionTableRowSchema,
  mfaChallengeResponseSchema,
  mfaEnrollConfirmRequestSchema,
  mfaEnrollConfirmResultSchema,
  mfaEnrollRequestSchema,
  mfaEnrollResultSchema,
  passwordLoginRequestSchema,
  registrationAccountResponseSchema,
  registrationRequestSchema,
  taxPlanCycleCreateResultSchema,
  taxPlanCycleCreateSchema,
  taxPlanCycleReadParamsSchema,
  taxPlanCycleSchema,
} from "../../src/typescript/index.js";

const silentLogger = createLogger({ level: "silent" });

type JsonObject = Record<string, unknown>;

async function withOpenApiServer(
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = createApp({
    logger: silentLogger,
    registerRoutes: (app) => {
      app.use(createCoreCaseOpenApiRouter());
    },
  });

  const server = app.listen(0);
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

function asRecord(value: unknown, label: string): JsonObject {
  expect(value, label).toEqual(expect.any(Object));
  expect(Array.isArray(value), label).toBe(false);

  return value as JsonObject;
}

function asRecordArray(value: unknown, label: string): JsonObject[] {
  expect(Array.isArray(value), label).toBe(true);

  return value as JsonObject[];
}

function requiredRecord(parent: JsonObject, key: string): JsonObject {
  return asRecord(parent[key], key);
}

function validateOpenApiDocument(document: JsonObject): void {
  expect(document.openapi).toMatch(/^3\.0\.\d+$/);
  expect(requiredRecord(document, "info").title).toEqual(expect.any(String));

  const paths = requiredRecord(document, "paths");

  for (const [path, pathItem] of Object.entries(paths)) {
    expect(path.startsWith("/")).toBe(true);

    const operations = Object.entries(asRecord(pathItem, path)).filter(
      ([method]) => ["get", "post", "put", "patch", "delete"].includes(method),
    );

    expect(operations.length).toBeGreaterThan(0);

    for (const [method, operationValue] of operations) {
      const operation = asRecord(operationValue, `${method} ${path}`);

      expect(operation.operationId).toEqual(expect.any(String));
      expect(operation.summary).toEqual(expect.any(String));
      expect(Array.isArray(operation.tags)).toBe(true);
      validateParameters(operation.parameters);
      validateRequestBody(operation.requestBody);
      validateResponses(requiredRecord(operation, "responses"));
    }
  }
}

function validateParameters(parametersValue: unknown): void {
  if (parametersValue === undefined) {
    return;
  }

  for (const parameter of asRecordArray(parametersValue, "parameters")) {
    expect(parameter.name).toEqual(expect.any(String));
    expect(parameter.in).toEqual(
      expect.stringMatching(/^(path|query|header|cookie)$/),
    );
    expect(parameter.schema).toEqual(expect.any(Object));
  }
}

function validateRequestBody(requestBodyValue: unknown): void {
  if (requestBodyValue === undefined) {
    return;
  }

  const requestBody = asRecord(requestBodyValue, "requestBody");
  validateContent(requiredRecord(requestBody, "content"));
}

function validateResponses(responses: JsonObject): void {
  expect(Object.keys(responses).length).toBeGreaterThan(0);

  for (const [statusCode, responseValue] of Object.entries(responses)) {
    expect(statusCode).toMatch(/^[1-5]\d\d$/);

    const response = asRecord(responseValue, `response ${statusCode}`);

    expect(response.description).toEqual(expect.any(String));

    if (response.content !== undefined) {
      validateContent(asRecord(response.content, "response content"));
    }
  }
}

function validateContent(content: JsonObject): void {
  for (const [mediaType, mediaTypeValue] of Object.entries(content)) {
    expect(mediaType).toMatch(/^[\w.+-]+\/[\w.+-]+$/);
    expect(
      requiredRecord(asRecord(mediaTypeValue, mediaType), "schema"),
    ).toBeDefined();
  }
}

describe("Core Case Service OpenAPI document", () => {
  test("serves OpenAPI JSON at GET /openapi.json", async () => {
    await withOpenApiServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/openapi.json`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");
      expect(await response.json()).toMatchObject({
        openapi: "3.0.3",
        info: {
          title: "TaxPulse Core Case Service API",
        },
      });
    });
  });

  test("documents create and read operations", () => {
    const document = createCoreCaseOpenApiDocument();
    const paths = requiredRecord(document, "paths");
    const queueOperation = requiredRecord(
      requiredRecord(paths, "/v1/tax-plan-cycles"),
      "get",
    );
    const createOperation = requiredRecord(
      requiredRecord(paths, "/v1/tax-plan-cycles"),
      "post",
    );
    const readOperation = requiredRecord(
      requiredRecord(paths, "/v1/tax-plan-cycles/{caseId}"),
      "get",
    );
    const clientRosterOperation = requiredRecord(
      requiredRecord(paths, "/v1/clients"),
      "get",
    );

    expect(queueOperation.operationId).toBe("listTaxPlanCycleQueue");
    expect(createOperation.operationId).toBe("createTaxPlanCycle");
    expect(readOperation.operationId).toBe("readTaxPlanCycle");
    expect(clientRosterOperation.operationId).toBe("listClientRoster");
    expect(queueOperation.tags).toEqual(["Core Case Service"]);
    expect(createOperation.tags).toEqual(["Core Case Service"]);
    expect(readOperation.tags).toEqual(["Core Case Service"]);
    expect(clientRosterOperation.tags).toEqual(["Core Case Service"]);
  });

  test("documents MFA enrollment operations using challenge identifiers", () => {
    const document = createCoreCaseOpenApiDocument();
    const paths = requiredRecord(document, "paths");
    const loginMfaOperation = requiredRecord(
      requiredRecord(paths, "/auth/login/mfa"),
      "post",
    );
    const enrollOperation = requiredRecord(
      requiredRecord(paths, "/mfa/enroll"),
      "post",
    );
    const confirmOperation = requiredRecord(
      requiredRecord(paths, "/mfa/enroll/confirm"),
      "post",
    );
    const enrollRequestBody = requiredRecord(enrollOperation, "requestBody");
    const enrollContent = requiredRecord(enrollRequestBody, "content");
    const enrollJson = requiredRecord(enrollContent, "application/json");
    const enrollExample = requiredRecord(enrollJson, "example");
    const confirmRequestBody = requiredRecord(confirmOperation, "requestBody");
    const confirmContent = requiredRecord(confirmRequestBody, "content");
    const confirmJson = requiredRecord(confirmContent, "application/json");
    const confirmExample = requiredRecord(confirmJson, "example");
    const loginMfaResponses = requiredRecord(loginMfaOperation, "responses");
    const loginMfaOkResponse = requiredRecord(loginMfaResponses, "200");
    const loginMfaOkContent = requiredRecord(loginMfaOkResponse, "content");
    const loginMfaOkJson = requiredRecord(
      loginMfaOkContent,
      "application/json",
    );
    const loginMfaExample = requiredRecord(loginMfaOkJson, "example");

    expect(loginMfaOperation.operationId).toBe("verifyLoginMfaTotp");
    expect(loginMfaOperation.tags).toEqual(["Authentication"]);
    expect(loginMfaOperation.description).toContain("POST /auth/login");
    expect(loginMfaExample).toMatchObject({
      access_token: expect.any(String),
      token_type: "Bearer",
      expires_in: expect.any(Number),
      refresh_expires_in: expect.any(Number),
    });
    expect(enrollOperation.operationId).toBe("enrollMfaTotp");
    expect(confirmOperation.operationId).toBe("confirmMfaTotpEnrollment");
    expect(enrollOperation.tags).toEqual(["MFA Enrollment"]);
    expect(confirmOperation.tags).toEqual(["MFA Enrollment"]);
    expect(enrollOperation.description).toContain("POST /auth/login");
    expect(enrollExample).toMatchObject({
      tenant_id: expect.any(String),
      user_id: expect.any(String),
    });
    expect(confirmExample).toMatchObject({
      tenant_id: enrollExample.tenant_id,
      user_id: enrollExample.user_id,
      code: "123456",
    });
  });

  test("documents hostname-scoped password login without tenant_id", () => {
    const document = createCoreCaseOpenApiDocument();
    const paths = requiredRecord(document, "paths");
    const loginOperation = requiredRecord(
      requiredRecord(paths, "/auth/login"),
      "post",
    );
    const requestBody = requiredRecord(loginOperation, "requestBody");
    const requestContent = requiredRecord(requestBody, "content");
    const requestJson = requiredRecord(requestContent, "application/json");
    const requestSchema = requiredRecord(requestJson, "schema");
    const requestProperties = requiredRecord(requestSchema, "properties");
    const requestExample = requiredRecord(requestJson, "example");
    const responses = requiredRecord(loginOperation, "responses");
    const acceptedResponse = requiredRecord(responses, "202");
    const acceptedContent = requiredRecord(acceptedResponse, "content");
    const acceptedJson = requiredRecord(acceptedContent, "application/json");
    const acceptedExample = requiredRecord(acceptedJson, "example");

    expect(loginOperation.operationId).toBe("startPasswordLogin");
    expect(loginOperation.tags).toEqual(["Authentication"]);
    expect(loginOperation.description).toContain("hostname");
    expect(requestProperties).toMatchObject({
      email: expect.any(Object),
      password: expect.any(Object),
    });
    expect(requestProperties.tenant_id).toBeUndefined();
    expect(requestExample.tenant_id).toBeUndefined();
    expect(Object.keys(responses)).toEqual(
      expect.arrayContaining(["202", "400", "401", "404"]),
    );
    expect(acceptedExample).toMatchObject({
      status: "mfa_challenge_required",
      tenant_id: expect.any(String),
      email: requestExample.email,
      user_id: expect.any(String),
    });
  });

  test("documents registration with safe account output and duplicate-email conflict", () => {
    const document = createCoreCaseOpenApiDocument();
    const paths = requiredRecord(document, "paths");
    const registrationOperation = requiredRecord(
      requiredRecord(paths, "/auth/register"),
      "post",
    );
    const requestBody = requiredRecord(registrationOperation, "requestBody");
    const requestContent = requiredRecord(requestBody, "content");
    const requestJson = requiredRecord(requestContent, "application/json");
    const requestExample = requiredRecord(requestJson, "example");
    const responses = requiredRecord(registrationOperation, "responses");
    const createdResponse = requiredRecord(responses, "201");
    const createdContent = requiredRecord(createdResponse, "content");
    const createdJson = requiredRecord(createdContent, "application/json");
    const createdExample = requiredRecord(createdJson, "example");
    const conflictResponse = requiredRecord(responses, "409");
    const conflictContent = requiredRecord(conflictResponse, "content");
    const conflictJson = requiredRecord(conflictContent, "application/problem+json");
    const conflictExample = requiredRecord(conflictJson, "example");

    expect(registrationOperation.operationId).toBe("registerUser");
    expect(registrationOperation.tags).toEqual(["Authentication"]);
    expect(requestExample).toMatchObject({
      tenant_id: expect.any(String),
      email: expect.any(String),
      password: expect.any(String),
    });
    expect(createdExample).toMatchObject({
      id: expect.any(String),
      tenant_id: requestExample.tenant_id,
      email: requestExample.email,
      role: "Client",
      status: "invited",
    });
    expect(createdExample.password).toBeUndefined();
    expect(createdExample.passwordHash).toBeUndefined();
    expect(conflictExample).toMatchObject({
      status: 409,
      code: "EMAIL_ALREADY_REGISTERED",
    });
  });

  test("generates case schemas from zod without a separate status field", () => {
    const document = createCoreCaseOpenApiDocument();
    const paths = requiredRecord(document, "paths");
    const createOperation = requiredRecord(
      requiredRecord(paths, "/v1/tax-plan-cycles"),
      "post",
    );
    const requestBody = requiredRecord(createOperation, "requestBody");
    const content = requiredRecord(requestBody, "content");
    const jsonContent = requiredRecord(content, "application/json");
    const createSchema = requiredRecord(jsonContent, "schema");
    const properties = requiredRecord(createSchema, "properties");
    const parameters = createOperation.parameters as unknown[];

    expect(Object.keys(properties)).toEqual(
      expect.arrayContaining([
        "client_id",
        "planning_period",
        "owner",
        "priority",
        "due_date",
      ]),
    );
    expect(properties.stage).toBeUndefined();
    expect(properties.on_hold).toBeUndefined();
    expect(properties.status).toBeUndefined();
    expect(parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Idempotency-Key",
          in: "header",
          required: true,
        }),
      ]),
    );
  });

  test("documents read responses with stage and due_date but no status field", () => {
    const document = createCoreCaseOpenApiDocument();
    const paths = requiredRecord(document, "paths");
    const readOperation = requiredRecord(
      requiredRecord(paths, "/v1/tax-plan-cycles/{caseId}"),
      "get",
    );
    const responses = requiredRecord(readOperation, "responses");
    const okResponse = requiredRecord(responses, "200");
    const content = requiredRecord(okResponse, "content");
    const jsonContent = requiredRecord(content, "application/json");
    const schema = requiredRecord(jsonContent, "schema");
    const properties = requiredRecord(schema, "properties");
    const example = requiredRecord(jsonContent, "example");

    expect(Object.keys(properties)).toEqual(
      expect.arrayContaining(["id", "client_id", "stage", "due_date"]),
    );
    expect(properties.status).toBeUndefined();
    expect(example.stage).toBe("Intake");
    expect(example.due_date).toBe("2026-12-31");
    expect(example.status).toBeUndefined();
  });

  test("documents client roster rows for the future TanStack Table", () => {
    const document = createCoreCaseOpenApiDocument();
    const paths = requiredRecord(document, "paths");
    const operation = requiredRecord(requiredRecord(paths, "/v1/clients"), "get");
    const responses = requiredRecord(operation, "responses");
    const okResponse = requiredRecord(responses, "200");
    const content = requiredRecord(okResponse, "content");
    const jsonContent = requiredRecord(content, "application/json");
    const schema = requiredRecord(jsonContent, "schema");
    const items = requiredRecord(schema, "items");
    const properties = requiredRecord(items, "properties");
    const example = asRecordArray(jsonContent.example, "example");

    expect(Object.keys(properties)).toEqual(
      expect.arrayContaining([
        "id",
        "clientName",
        "filingStatus",
        "ytdIncome",
        "estimatedTax",
        "quarterlyStatus",
      ]),
    );
    expect(properties.tenantId).toBeUndefined();
    expect(example[0]).toMatchObject({
      clientName: "Avery Chen",
      filingStatus: "Single - 1099",
      ytdIncome: 108500,
      estimatedTax: 32100,
      quarterlyStatus: "Q2 due Jun 15",
    });
  });

  test("documents creating a deduction for a selected case", () => {
    const document = createCoreCaseOpenApiDocument();
    const paths = requiredRecord(document, "paths");
    const deductionPath = requiredRecord(paths, "/v1/cases/{caseId}/deductions");
    const createOperation = requiredRecord(deductionPath, "post");
    const requestBody = requiredRecord(createOperation, "requestBody");
    const requestContent = requiredRecord(requestBody, "content");
    const requestJson = requiredRecord(requestContent, "application/json");
    const requestExample = requiredRecord(requestJson, "example");
    const responses = requiredRecord(createOperation, "responses");
    const createdResponse = requiredRecord(responses, "201");
    const createdContent = requiredRecord(createdResponse, "content");
    const createdJson = requiredRecord(createdContent, "application/json");
    const createdExample = requiredRecord(createdJson, "example");

    expect(createOperation.operationId).toBe("createCaseDeduction");
    expect(createOperation.tags).toEqual(["Core Case Service"]);
    expect(requestExample).toMatchObject({
      date: "2026-08-01",
      description: "Advisor conference fee",
      category: "Education",
      amount: 900,
    });
    expect(createdExample).toMatchObject({
      date: requestExample.date,
      description: requestExample.description,
      category: requestExample.category,
      amount: "900.00",
      tax_impact: "225.00",
    });
  });

  test("registers the same zod schema objects used by routes and domain exports", () => {
    expect(coreCaseOpenApiSchemaRegistrations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "AuthMfaLoginRequest",
          schema: authMfaLoginRequestSchema,
        }),
        expect.objectContaining({
          name: "AuthMfaLoginResult",
          schema: authSessionTokenResponseSchema,
        }),
        expect.objectContaining({
          name: "PasswordLoginRequest",
          schema: passwordLoginRequestSchema,
        }),
        expect.objectContaining({
          name: "MfaChallengeResponse",
          schema: mfaChallengeResponseSchema,
        }),
        expect.objectContaining({
          name: "RegistrationRequest",
          schema: registrationRequestSchema,
        }),
        expect.objectContaining({
          name: "RegistrationAccountResponse",
          schema: registrationAccountResponseSchema,
        }),
        expect.objectContaining({
          name: "TaxPlanCycleCreateRequest",
          schema: taxPlanCycleCreateSchema,
        }),
        expect.objectContaining({
          name: "TaxPlanCycleReadParams",
          schema: taxPlanCycleReadParamsSchema,
        }),
        expect.objectContaining({
          name: "TaxPlanCycle",
          schema: taxPlanCycleSchema,
        }),
        expect.objectContaining({
          name: "TaxPlanCycleCreateAccepted",
          schema: taxPlanCycleCreateResultSchema,
        }),
        expect.objectContaining({
          name: "ClientRosterRow",
          schema: clientRosterRowSchema,
        }),
        expect.objectContaining({
          name: "ClientRosterListResponse",
          schema: clientRosterListResponseSchema,
        }),
        expect.objectContaining({
          name: "DeductionCreateRequest",
          schema: deductionCreateSchema,
        }),
        expect.objectContaining({
          name: "DeductionRow",
          schema: deductionTableRowSchema,
        }),
        expect.objectContaining({
          name: "MfaEnrollRequest",
          schema: mfaEnrollRequestSchema,
        }),
        expect.objectContaining({
          name: "MfaEnrollAccepted",
          schema: mfaEnrollResultSchema,
        }),
        expect.objectContaining({
          name: "MfaEnrollConfirmRequest",
          schema: mfaEnrollConfirmRequestSchema,
        }),
        expect.objectContaining({
          name: "MfaEnrollConfirmed",
          schema: mfaEnrollConfirmResultSchema,
        }),
      ]),
    );
  });

  test("validates the generated document structure required by OpenAPI 3.0", () => {
    validateOpenApiDocument(createCoreCaseOpenApiDocument());
  });
});
