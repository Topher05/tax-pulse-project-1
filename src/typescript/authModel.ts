export interface PasswordCredentialRegistrationInput {
  credentialId: string;
  userId: string;
  plaintextPassword: string;
}

export interface StoredPasswordCredential {
  id: string;
  userId: string;
  passwordHash: string;
}

export interface PasswordCredentialWriter {
  createPasswordCredential(
    credential: StoredPasswordCredential,
  ): Promise<StoredPasswordCredential>;
}

export interface PasswordCredentialLookupInput {
  tenantId: string;
  email: string;
}

export interface PasswordCredentialLoginInput extends PasswordCredentialLookupInput {
  plaintextPassword: string;
}

export interface PasswordCredentialLoginRecord {
  tenantId: string;
  email: string;
  userId: string;
  passwordHash: string;
}

export interface PasswordCredentialReader {
  findPasswordCredentialByEmail(
    input: PasswordCredentialLookupInput,
  ): Promise<PasswordCredentialLoginRecord | null>;
}

export type PasswordCredentialStore = PasswordCredentialWriter &
  PasswordCredentialReader;

export interface InvalidPasswordCredentialResult {
  status: "invalid_credentials";
}

export interface MfaChallengeRequiredResult {
  status: "mfa_challenge_required";
  tenantId: string;
  email: string;
  userId: string;
}

export type PasswordAuthenticationResult =
  | InvalidPasswordCredentialResult
  | MfaChallengeRequiredResult;
