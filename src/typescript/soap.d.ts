declare module "soap" {
  export interface IOptions {
    [key: string]: unknown;
  }

  export interface Client {
    setEndpoint(endpoint: string): void;
    setSecurity(security: unknown): void;
    VerifyTaxpayerAsync(input: unknown): Promise<[unknown]>;
    GetTaxpayerStatusAsync(input: unknown): Promise<[unknown]>;
  }

  export function createClientAsync(
    wsdlUrl: string,
    options?: IOptions,
  ): Promise<Client>;

  export function listen(
    server: HttpServer,
    path: string,
    services: unknown,
    wsdlXml: string,
  ): {
    authenticate?: (security: unknown) => boolean;
  };

  export class WSSecurity {
    constructor(
      username: string,
      password: string,
      options?: { passwordType?: string },
    );
  }
}
