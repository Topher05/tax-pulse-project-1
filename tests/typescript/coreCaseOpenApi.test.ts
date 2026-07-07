import { once } from "node:events";
import type { AddressInfo } from "node:net";

import { describe, expect, test } from "vitest";

import {
  coreCaseOpenApiSchemaRegistrations,
  createApp,
  createCoreCaseOpenApiDocument,
  createCoreCaseOpenApiRouter,
  createLogger,
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
    const createOperation = requiredRecord(
      requiredRecord(paths, "/tax-plan-cycles"),
      "post",
    );
    const readOperation = requiredRecord(
      requiredRecord(paths, "/tax-plan-cycles/{caseId}"),
      "get",
    );

    expect(createOperation.operationId).toBe("createTaxPlanCycle");
    expect(readOperation.operationId).toBe("readTaxPlanCycle");
    expect(createOperation.tags).toEqual(["Core Case Service"]);
    expect(readOperation.tags).toEqual(["Core Case Service"]);
  });

  test("generates case schemas from zod without a separate status field", () => {
    const document = createCoreCaseOpenApiDocument();
    const paths = requiredRecord(document, "paths");
    const createOperation = requiredRecord(
      requiredRecord(paths, "/tax-plan-cycles"),
      "post",
    );
    const requestBody = requiredRecord(createOperation, "requestBody");
    const content = requiredRecord(requestBody, "content");
    const jsonContent = requiredRecord(content, "application/json");
    const createSchema = requiredRecord(jsonContent, "schema");
    const properties = requiredRecord(createSchema, "properties");

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
  });

  test("documents read responses with stage and due_date but no status field", () => {
    const document = createCoreCaseOpenApiDocument();
    const paths = requiredRecord(document, "paths");
    const readOperation = requiredRecord(
      requiredRecord(paths, "/tax-plan-cycles/{caseId}"),
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

  test("registers the same zod schema objects used by routes and domain exports", () => {
    expect(coreCaseOpenApiSchemaRegistrations).toEqual(
      expect.arrayContaining([
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
      ]),
    );
  });

  test("validates the generated document structure required by OpenAPI 3.0", () => {
    validateOpenApiDocument(createCoreCaseOpenApiDocument());
  });
});
