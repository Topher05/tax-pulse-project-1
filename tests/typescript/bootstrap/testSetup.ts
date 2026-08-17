import { createRequire } from "node:module";

import { vi } from "vitest";

const require = createRequire(import.meta.url);
const workerThreads = require("node:worker_threads") as {
  markAsUncloneable?: (value: unknown) => void;
};

interface SoapTivsPort {
  VerifyTaxpayer(input: unknown): unknown | Promise<unknown>;
  GetTaxpayerStatus(input: unknown): unknown | Promise<unknown>;
}

interface SoapTivsService {
  TIVSPort: SoapTivsPort;
}

interface SoapRegistryEntry {
  services: {
    TIVSService: SoapTivsService;
  };
  authenticate?: (security: unknown) => boolean;
}

if (typeof workerThreads.markAsUncloneable !== "function") {
  workerThreads.markAsUncloneable = () => undefined;
}

const soapRegistry = new Map<string, SoapRegistryEntry>();

vi.mock("soap", () => {
  class WSSecurity {
    constructor(
      public username: string,
      public password: string,
      public options?: { passwordType?: string },
    ) {}
  }

  return {
    createClientAsync: async () => {
      let endpointUrl = "";
      let security: WSSecurity | undefined;

      return {
        setEndpoint(url: string) {
          endpointUrl = url;
        },
        setSecurity(nextSecurity: WSSecurity) {
          security = nextSecurity;
        },
        async VerifyTaxpayerAsync(input: unknown) {
          const record = soapRegistry.get(endpointUrl);

          if (!record) {
            throw new Error(`No SOAP service is registered for ${endpointUrl}`);
          }

          if (
            record.authenticate &&
            !record.authenticate({
              UsernameToken: {
                Username: security?.username,
                Password: security?.password,
              },
            })
          ) {
            throw new Error("SOAP authentication failed.");
          }

          const response =
            await record.services.TIVSService.TIVSPort.VerifyTaxpayer(input);

          return [response];
        },
        async GetTaxpayerStatusAsync(input: unknown) {
          const record = soapRegistry.get(endpointUrl);

          if (!record) {
            throw new Error(`No SOAP service is registered for ${endpointUrl}`);
          }

          if (
            record.authenticate &&
            !record.authenticate({
              UsernameToken: {
                Username: security?.username,
                Password: security?.password,
              },
            })
          ) {
            throw new Error("SOAP authentication failed.");
          }

          const response =
            await record.services.TIVSService.TIVSPort.GetTaxpayerStatus(input);

          return [response];
        },
      };
    },
    listen(
      server: import("node:http").Server,
      path: string,
      services: SoapRegistryEntry["services"],
    ) {
      const address = server.address();

      if (!address || typeof address === "string") {
        throw new Error("Expected a listening SOAP test server.");
      }

      const endpointUrl = `http://${address.address}:${address.port}${path}`;
      const record: SoapRegistryEntry = { services };

      soapRegistry.set(endpointUrl, record);
      return record;
    },
    WSSecurity,
  };
});
