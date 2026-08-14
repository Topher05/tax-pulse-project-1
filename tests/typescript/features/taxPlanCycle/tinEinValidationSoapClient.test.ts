import { readFile } from "node:fs/promises";
import { createServer, type Server as HttpServer } from "node:http";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import * as soap from "soap";
import { afterEach, describe, expect, test } from "vitest";

import {
  createTinEinValidationSoapClient,
  getTinEinValidationSoapConfigFromEnv,
  type TivsVerifyTaxpayerRequest,
} from "../../../../src/typescript/features/taxPlanCycle/infrastructure/tinEinValidationSoapClient.js";

const fixtureWsdlPath = fileURLToPath(
  new URL("./fixtures/tinEinValidation.wsdl", import.meta.url),
);

async function listenOnEphemeralPort(server: HttpServer): Promise<string> {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Expected test SOAP server to listen on a TCP port.");
  }

  return `http://127.0.0.1:${address.port}/tivs`;
}

function soapText(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const textValue = record._ ?? record.$value;

  return typeof textValue === "string" ? textValue : undefined;
}

describe("TIN/EIN validation SOAP client", () => {
  let server: HttpServer | undefined;

  afterEach(async () => {
    if (!server?.listening) {
      return;
    }

    server.close();
    await once(server, "close");
    server = undefined;
  });

  test("loads TIVS configuration from env without committing credentials", () => {
    expect(
      getTinEinValidationSoapConfigFromEnv({
        TIVS_WSDL_URL: "https://tivs.example.test/tivs?wsdl",
        TIVS_ENDPOINT_URL: "https://tivs.example.test/tivs",
        TIVS_USERNAME: "synthetic-filing-service",
        TIVS_PASSWORD: "test-password",
      }),
    ).toEqual({
      wsdlUrl: "https://tivs.example.test/tivs?wsdl",
      endpointUrl: "https://tivs.example.test/tivs",
      username: "synthetic-filing-service",
      password: "test-password",
    });
  });

  test("requires the TIVS WSDL and endpoint to come from config", () => {
    expect(() =>
      getTinEinValidationSoapConfigFromEnv({
        TIVS_USERNAME: "synthetic-filing-service",
        TIVS_PASSWORD: "test-password",
      }),
    ).toThrow("TIVS_WSDL_URL is required for TIVS SOAP validation.");
  });

  test("calls VerifyTaxpayer against a stub SOAP service through the endpoint override", async () => {
    const wsdlXml = await readFile(fixtureWsdlPath, "utf8");
    const receivedRequests: TivsVerifyTaxpayerRequest[] = [];
    const receivedUsernames: string[] = [];

    server = createServer((_request, response) => {
      response.statusCode = 404;
      response.end();
    });
    const endpointUrl = await listenOnEphemeralPort(server);
    const soapServer = soap.listen(
      server,
      "/tivs",
      {
        TIVSService: {
          TIVSPort: {
            VerifyTaxpayer(input: TivsVerifyTaxpayerRequest) {
              receivedRequests.push(input);

              return {
                MatchCode: "0",
                VerifiedName: "ACME GOVERNMENT SERVICES LLC",
                TINType: "EIN",
              };
            },
          },
        },
      },
      wsdlXml,
    );

    soapServer.authenticate = (security: {
      UsernameToken?: { Username?: unknown; Password?: unknown };
    }) => {
      const username = soapText(security.UsernameToken?.Username);
      const password = soapText(security.UsernameToken?.Password);

      if (username) {
        receivedUsernames.push(username);
      }

      return username === "synthetic-filing-service" && password === "synthetic-password";
    };

    const client = await createTinEinValidationSoapClient({
      wsdlUrl: fixtureWsdlPath,
      endpointUrl,
      username: "synthetic-filing-service",
      password: "synthetic-password",
    });

    const response = await client.verifyTaxpayer({
      TIN: "12-3456789",
      TINType: "EIN",
      LegalName: "ACME GOVERNMENT SERVICES LLC",
    });

    expect(response).toEqual({
      MatchCode: "0",
      VerifiedName: "ACME GOVERNMENT SERVICES LLC",
      TINType: "EIN",
    });
    expect(receivedRequests).toEqual([
      {
        TIN: "12-3456789",
        TINType: "EIN",
        LegalName: "ACME GOVERNMENT SERVICES LLC",
      },
    ]);
    expect(receivedUsernames).toEqual(["synthetic-filing-service"]);
  });
});
