import type {
  TinEinValidationSoapClient,
  TivsMatchCode,
  TivsTinType,
} from "./tinEinValidationSoapClient.js";
import type {
  TaxpayerIdentifierInput,
  TaxpayerIdentifierType,
  TaxpayerIdentifierValidationResult,
} from "../taxpayerIdentifierValidation.js";

export interface TaxpayerIdentifierValidationOutcome {
  tinType: TaxpayerIdentifierType;
  result: TaxpayerIdentifierValidationResult;
  verifiedName?: string;
  provider: "tivs";
}

export interface TaxpayerIdentifierValidator {
  validateTaxpayerIdentifier(
    input: TaxpayerIdentifierInput,
  ): Promise<TaxpayerIdentifierValidationOutcome>;
}

const matchCodeResults: Record<TivsMatchCode, TaxpayerIdentifierValidationResult> = {
  "0": "match",
  "1": "tin_not_issued",
  "2": "tin_not_found",
  "3": "name_mismatch",
};

function toTaxpayerIdentifierType(tinType: TivsTinType): TaxpayerIdentifierType {
  return tinType.toLowerCase() as TaxpayerIdentifierType;
}

export function createTinEinValidationAcl(
  soapClient: TinEinValidationSoapClient,
): TaxpayerIdentifierValidator {
  return {
    async validateTaxpayerIdentifier(input) {
      const response = await soapClient.verifyTaxpayer({
        TIN: input.tin,
        TINType: input.tin_type,
        LegalName: input.legal_name,
      });

      return {
        tinType: toTaxpayerIdentifierType(response.TINType),
        result: matchCodeResults[response.MatchCode],
        ...(response.VerifiedName ? { verifiedName: response.VerifiedName } : {}),
        provider: "tivs",
      };
    },
  };
}
