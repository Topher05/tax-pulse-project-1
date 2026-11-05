import type {
  TinEinValidationSoapClient,
  TivsMatchCode,
  TivsTinType,
} from "./tinEinValidationSoapClient.js";
import {
  TaxpayerIdentifierSoapFaultError,
  type TaxpayerIdentifierInput,
  type TaxpayerIdentifierType,
  type TaxpayerIdentifierValidationResult,
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

function extractFaultCode(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "soap:Server";
  }

  const record = error as Record<string, unknown>;
  const fault =
    (record.root as Record<string, unknown> | undefined)?.Envelope as Record<string, unknown> | undefined;
  const bodyFault = (fault?.Body as Record<string, unknown> | undefined)?.Fault as Record<string, unknown> | undefined;
  const targetFault = bodyFault ?? (record.Fault as Record<string, unknown> | undefined) ?? record;

  const rawCode =
    targetFault.faultcode ??
    targetFault.faultCode ??
    targetFault.FaultCode ??
    (targetFault.Code as Record<string, unknown> | undefined)?.Value ??
    record.faultcode ??
    record.code;

  if (typeof rawCode === "string" && rawCode.trim().length > 0) {
    return rawCode.trim();
  }

  return "soap:Server";
}

function extractFaultReason(error: unknown): string {
  if (typeof error === "string" && error.trim().length > 0) {
    return error.trim();
  }

  if (!error || typeof error !== "object") {
    return "An unknown SOAP fault occurred.";
  }

  const record = error as Record<string, unknown>;
  const fault =
    (record.root as Record<string, unknown> | undefined)?.Envelope as Record<string, unknown> | undefined;
  const bodyFault = (fault?.Body as Record<string, unknown> | undefined)?.Fault as Record<string, unknown> | undefined;
  const targetFault = bodyFault ?? (record.Fault as Record<string, unknown> | undefined) ?? record;

  const rawReason =
    targetFault.faultstring ??
    targetFault.faultString ??
    targetFault.FaultReason ??
    (targetFault.Reason as Record<string, unknown> | undefined)?.Text ??
    record.faultstring ??
    record.message;

  if (typeof rawReason === "string" && rawReason.trim().length > 0) {
    return rawReason.trim();
  }

  return "An unknown SOAP fault occurred.";
}

function extractFaultDetail(error: unknown): string | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const record = error as Record<string, unknown>;
  const fault =
    (record.root as Record<string, unknown> | undefined)?.Envelope as Record<string, unknown> | undefined;
  const bodyFault = (fault?.Body as Record<string, unknown> | undefined)?.Fault as Record<string, unknown> | undefined;
  const targetFault = bodyFault ?? (record.Fault as Record<string, unknown> | undefined) ?? record;

  const rawDetail = targetFault.detail ?? targetFault.Detail ?? record.detail;

  if (typeof rawDetail === "string" && rawDetail.trim().length > 0) {
    return rawDetail.trim();
  }

  if (rawDetail && typeof rawDetail === "object") {
    try {
      return JSON.stringify(rawDetail);
    } catch {
      return undefined;
    }
  }

  return undefined;
}

export function translateSoapFault(error: unknown): TaxpayerIdentifierSoapFaultError {
  if (error instanceof TaxpayerIdentifierSoapFaultError) {
    return error;
  }

  const faultCode = extractFaultCode(error);
  const faultReason = extractFaultReason(error);
  const detail = extractFaultDetail(error);

  return new TaxpayerIdentifierSoapFaultError({
    faultCode,
    faultReason,
    detail,
    provider: "tivs",
    cause: error,
  });
}

export function createTinEinValidationAcl(
  soapClient: TinEinValidationSoapClient,
): TaxpayerIdentifierValidator {
  return {
    async validateTaxpayerIdentifier(input) {
      try {
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
      } catch (error) {
        throw translateSoapFault(error);
      }
    },
  };
}

