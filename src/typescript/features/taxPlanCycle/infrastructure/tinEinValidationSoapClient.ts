import * as soap from "soap";
import type { Client, IOptions } from "soap";

export type TivsTinType = "EIN" | "SSN";
export type TivsMatchCode = "0" | "1" | "2" | "3";
export type TivsStandingCode = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface TivsVerifyTaxpayerRequest {
  TIN: string;
  TINType: TivsTinType;
  LegalName: string;
}

export interface TivsVerifyTaxpayerRawResponse {
  MatchCode: TivsMatchCode;
  VerifiedName?: string;
  TINType: TivsTinType;
}

export interface TivsGetTaxpayerStatusRequest {
  TIN: string;
  TINType: TivsTinType;
}

export interface TivsGetTaxpayerStatusRawResponse {
  Standing: TivsStandingCode;
  AsOfDate: string;
}

export interface TinEinValidationSoapClient {
  verifyTaxpayer(
    input: TivsVerifyTaxpayerRequest,
  ): Promise<TivsVerifyTaxpayerRawResponse>;
  getTaxpayerStatus(
    input: TivsGetTaxpayerStatusRequest,
  ): Promise<TivsGetTaxpayerStatusRawResponse>;
}

export interface TinEinValidationSoapClientOptions {
  wsdlUrl?: string;
  endpointUrl?: string;
  username?: string;
  password?: string;
  soapOptions?: IOptions;
}

type TivsSoapClient = Client & {
  VerifyTaxpayerAsync(
    input: TivsVerifyTaxpayerRequest,
  ): Promise<[TivsVerifyTaxpayerRawResponse]>;
  GetTaxpayerStatusAsync(
    input: TivsGetTaxpayerStatusRequest,
  ): Promise<[TivsGetTaxpayerStatusRawResponse]>;
};

function requireConfigValue(name: string, value: string | undefined): string {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    throw new Error(`${name} is required for TIVS SOAP validation.`);
  }

  return trimmedValue;
}

export function getTinEinValidationSoapConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): Required<Omit<TinEinValidationSoapClientOptions, "soapOptions">> {
  return {
    wsdlUrl: requireConfigValue("TIVS_WSDL_URL", env.TIVS_WSDL_URL),
    endpointUrl: requireConfigValue("TIVS_ENDPOINT_URL", env.TIVS_ENDPOINT_URL),
    username: requireConfigValue("TIVS_USERNAME", env.TIVS_USERNAME),
    password: requireConfigValue("TIVS_PASSWORD", env.TIVS_PASSWORD),
  };
}

export async function createTinEinValidationSoapClient(
  options: TinEinValidationSoapClientOptions = {},
): Promise<TinEinValidationSoapClient> {
  const envConfig =
    options.wsdlUrl &&
    options.endpointUrl &&
    options.username &&
    options.password
      ? undefined
      : getTinEinValidationSoapConfigFromEnv();

  const wsdlUrl = requireConfigValue(
    "TIVS_WSDL_URL",
    options.wsdlUrl ?? envConfig?.wsdlUrl,
  );
  const endpointUrl = requireConfigValue(
    "TIVS_ENDPOINT_URL",
    options.endpointUrl ?? envConfig?.endpointUrl,
  );
  const username = requireConfigValue(
    "TIVS_USERNAME",
    options.username ?? envConfig?.username,
  );
  const password = requireConfigValue(
    "TIVS_PASSWORD",
    options.password ?? envConfig?.password,
  );

  const soapClient = (await soap.createClientAsync(
    wsdlUrl,
    options.soapOptions,
  )) as TivsSoapClient;

  soapClient.setEndpoint(endpointUrl);
  soapClient.setSecurity(
    new soap.WSSecurity(username, password, {
      passwordType: "PasswordText",
    }),
  );

  return {
    async verifyTaxpayer(input) {
      const [response] = await soapClient.VerifyTaxpayerAsync(input);

      return response as TivsVerifyTaxpayerRawResponse;
    },
    async getTaxpayerStatus(input) {
      const [response] = await soapClient.GetTaxpayerStatusAsync(input);

      return response as TivsGetTaxpayerStatusRawResponse;
    },
  };
}
