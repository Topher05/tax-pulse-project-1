import { describe, expect, test, vi } from "vitest";

import {
  createTinEinValidationAcl,
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
});
