import type { HashPasswordOptions } from "../infrastructure/passwordHashing.js";
import { hashPassword, verifyPasswordHash } from "../infrastructure/passwordHashing.js";
import type {
  PasswordAuthenticationResult,
  PasswordCredentialLoginInput,
  PasswordCredentialReader,
  PasswordCredentialRegistrationInput,
  PasswordCredentialWriter,
  StoredPasswordCredential,
} from "../domain/authModel.js";

export async function registerPasswordCredential(
  input: PasswordCredentialRegistrationInput,
  writer: PasswordCredentialWriter,
  options: HashPasswordOptions = {},
): Promise<StoredPasswordCredential> {
  const passwordHash = await hashPassword(input.plaintextPassword, options);

  return await writer.createPasswordCredential({
    id: input.credentialId,
    userId: input.userId,
    passwordHash,
  });
}

export async function authenticatePasswordForMfaChallenge(
  input: PasswordCredentialLoginInput,
  reader: PasswordCredentialReader,
): Promise<PasswordAuthenticationResult> {
  const credential = await reader.findPasswordCredentialByEmail({
    tenantId: input.tenantId,
    email: input.email,
  });

  if (!credential) {
    return { status: "invalid_credentials" };
  }

  const passwordMatches = await verifyPasswordHash(
    credential.passwordHash,
    input.plaintextPassword,
  );

  if (!passwordMatches) {
    return { status: "invalid_credentials" };
  }

  return {
    status: "mfa_challenge_required",
    tenantId: credential.tenantId,
    email: credential.email,
    userId: credential.userId,
  };
}
