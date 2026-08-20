import type {
  TaxpayerIdentifierSoapFaultError,
  TaxpayerIdentifierValidation,
  TaxpayerIdentifierValidationOutcome,
  TaxpayerIdentifierValidator,
  TivsVerifyTaxpayerRawResponse,
} from "../../../../src/typescript/index.js";

declare const validator: TaxpayerIdentifierValidator;

const validationPromise = validator.validateTaxpayerIdentifier({
  tin: "12-3456789",
  tin_type: "EIN",
  legal_name: "ACME GOVERNMENT SERVICES LLC",
});

validationPromise satisfies Promise<TaxpayerIdentifierValidationOutcome>;

// @ts-expect-error public ACL signatures must not expose raw SOAP response shapes
const leakedSoapResponse: Promise<TivsVerifyTaxpayerRawResponse> =
  validationPromise;

declare const validationRecord: TaxpayerIdentifierValidation;

// @ts-expect-error domain validation records use validation_result, not SOAP MatchCode
validationRecord.MatchCode;

// @ts-expect-error domain validation records use tin_type, not SOAP TINType
validationRecord.TINType;

declare const faultError: TaxpayerIdentifierSoapFaultError;
const faultCode: string = faultError.faultCode;
const faultReason: string = faultError.faultReason;
const faultProvider: "tivs" = faultError.provider;

// @ts-expect-error domain fault errors must not leak raw SOAP envelope properties
faultError.Envelope;

// @ts-expect-error domain fault errors must not leak raw SOAP body properties
faultError.Body;

void leakedSoapResponse;
void faultCode;
void faultReason;
void faultProvider;
