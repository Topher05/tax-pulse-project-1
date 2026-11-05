import { describe, expect, test, vi } from "vitest";

import {
  TaxpayerIdentifierSoapFaultError,
  createTinEinValidationAcl,
  translateSoapFault,
  type TinEinValidationSoapClient,
} from "../../../../src/typescript/index.js";

describe("TIN/EIN validation ACL", () => {
  test("maps TIVS match codes into clean TaxPulse validation outcomes", async () => {
    const soapClient: TinEinValidationSoapClient = {
      verifyTaxpayer: vi.fn(async () => ({
        MatchCode: "3",
        VerifiedName: "ACME GOVERNMENT SERVICES LLC",
        TINType: "EIN",
      } as const)),
      getTaxpayerStatus: vi.fn(),
    };
    const validator = createTinEinValidationAcl(soapClient);

    await expect(
      validator.validateTaxpayerIdentifier({
        tin: "12-3456789",
        tin_type: "EIN",
        legal_name: "ACME GOVERNMENT SERVICES INC",
      }),
    ).resolves.toEqual({
      tinType: "ein",
      result: "name_mismatch",
      verifiedName: "ACME GOVERNMENT SERVICES LLC",
      provider: "tivs",
    });

    expect(soapClient.verifyTaxpayer).toHaveBeenCalledWith({
      TIN: "12-3456789",
      TINType: "EIN",
      LegalName: "ACME GOVERNMENT SERVICES INC",
    });
  });

  test("normalizes unknown taxpayer code into the same clean not-found concept", async () => {
    const soapClient: TinEinValidationSoapClient = {
      verifyTaxpayer: vi.fn(async () => ({
        MatchCode: "2",
        TINType: "SSN",
      } as const)),
      getTaxpayerStatus: vi.fn(),
    };
    const validator = createTinEinValidationAcl(soapClient);

    await expect(
      validator.validateTaxpayerIdentifier({
        tin: "00-0000000",
        tin_type: "SSN",
        legal_name: "Synthetic Client",
      }),
    ).resolves.toEqual({
      tinType: "ssn",
      result: "tin_not_found",
      provider: "tivs",
    });
  });

  test("translates an injected SOAP fault envelope into a typed TaxpayerIdentifierSoapFaultError", async () => {
    const rawSoapFault = {
      root: {
        Envelope: {
          Body: {
            Fault: {
              faultcode: "soap:Server",
              faultstring: "TIVS backend unavailable during maintenance window",
              detail: "ERR-MAINT-4021",
            },
          },
        },
      },
    };

    const soapClient: TinEinValidationSoapClient = {
      verifyTaxpayer: vi.fn(async () => {
        throw rawSoapFault;
      }),
      getTaxpayerStatus: vi.fn(),
    };
    const validator = createTinEinValidationAcl(soapClient);

    let caughtError: unknown;
    try {
      await validator.validateTaxpayerIdentifier({
        tin: "12-3456789",
        tin_type: "EIN",
        legal_name: "ACME GOVERNMENT SERVICES LLC",
      });
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(TaxpayerIdentifierSoapFaultError);
    const domainError = caughtError as TaxpayerIdentifierSoapFaultError;
    expect(domainError.name).toBe("TaxpayerIdentifierSoapFaultError");
    expect(domainError.faultCode).toBe("soap:Server");
    expect(domainError.faultReason).toBe(
      "TIVS backend unavailable during maintenance window",
    );
    expect(domainError.detail).toBe("ERR-MAINT-4021");
    expect(domainError.provider).toBe("tivs");
    expect(domainError.message).toBe(
      "TIVS SOAP fault [soap:Server]: TIVS backend unavailable during maintenance window",
    );
  });

  test("translates WSDL TaxpayerNotFoundFault structure into typed domain error", () => {
    const faultError = {
      faultcode: "tns:TaxpayerNotFoundFault",
      faultstring: "Taxpayer record was not found in IRS master file",
      detail: { TIN: "12-3456789", Reason: "Master file record missing" },
    };

    const domainError = translateSoapFault(faultError);

    expect(domainError).toBeInstanceOf(TaxpayerIdentifierSoapFaultError);
    expect(domainError.faultCode).toBe("tns:TaxpayerNotFoundFault");
    expect(domainError.faultReason).toBe(
      "Taxpayer record was not found in IRS master file",
    );
    expect(domainError.provider).toBe("tivs");
  });

  test("translates generic Error instances into typed domain error with fallback code", () => {
    const networkError = new Error("Connection reset by peer");
    const domainError = translateSoapFault(networkError);

    expect(domainError).toBeInstanceOf(TaxpayerIdentifierSoapFaultError);
    expect(domainError.faultCode).toBe("soap:Server");
    expect(domainError.faultReason).toBe("Connection reset by peer");
    expect(domainError.provider).toBe("tivs");
  });
});

