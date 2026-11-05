import type {
  PasswordCredentialLoginRecord,
  PasswordCredentialReader,
  PasswordCredentialWriter,
  StoredPasswordCredential,
} from "../../../../../src/typescript/index.js";

export const fastPasswordHashConfig = {
  memoryCostKiB: 4_096,
  timeCost: 2,
  parallelism: 1,
  hashLength: 24,
  saltLength: 12,
};

export class InMemoryCredentialStore
  implements PasswordCredentialWriter, PasswordCredentialReader
{
  readonly credentials: StoredPasswordCredential[] = [];

  constructor(private readonly loginRecords: PasswordCredentialLoginRecord[] = []) {}

  async createPasswordCredential(
    credential: StoredPasswordCredential,
  ): Promise<StoredPasswordCredential> {
    this.credentials.push(credential);
    return credential;
  }

  async findPasswordCredentialByEmail(input: {
    tenantId: string;
    email: string;
  }): Promise<PasswordCredentialLoginRecord | null> {
    return (
      this.loginRecords.find(
        (record) =>
          record.tenantId === input.tenantId && record.email === input.email,
      ) ?? null
    );
  }
}

export const authTenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01";
export const authUserId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d58";
export const authEmail = "alex@example.com";
