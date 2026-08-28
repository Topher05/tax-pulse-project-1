import type {
  LoginCredentials,
  MfaChallenge,
  SessionTokenResponse,
} from "./session.ts";

export interface AuthClient {
  login(credentials: LoginCredentials): Promise<MfaChallenge>;
  completeMfaLogin(challenge: MfaChallenge, code: string): Promise<SessionTokenResponse>;
  refreshSession(): Promise<SessionTokenResponse>;
  logout(): Promise<void>;
}

export interface RegistrationInput {
  readonly tenantId: string;
  readonly email: string;
  readonly password: string;
}

export interface RegistrationAccount {
  readonly id: string;
  readonly tenantId: string;
  readonly email: string;
  readonly role: string;
  readonly status: string;
}

export class AuthRequestError extends Error {
  constructor(readonly status: number, message = "Authentication request failed.") {
    super(message);
    this.name = "AuthRequestError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function requireString(record: Record<string, unknown>, name: string): string {
  const value = record[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new AuthRequestError(502, "Authentication service returned an invalid response.");
  }
  return value;
}

function requirePositiveInteger(record: Record<string, unknown>, name: string): number {
  const value = record[name];
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new AuthRequestError(502, "Authentication service returned an invalid response.");
  }
  return value as number;
}

async function responseBody(response: Response): Promise<Record<string, unknown>> {
  const body: unknown = await response.json().catch(() => null);
  if (!isRecord(body)) {
    throw new AuthRequestError(response.status, "Authentication service returned an invalid response.");
  }
  return body;
}

async function requireSuccessfulJson(response: Response): Promise<Record<string, unknown>> {
  if (!response.ok) {
    throw new AuthRequestError(response.status);
  }
  return await responseBody(response);
}

async function requireRegistrationJson(response: Response): Promise<Record<string, unknown>> {
  const body = await responseBody(response);

  if (!response.ok) {
    const message = typeof body.detail === "string" ? body.detail : "Registration request failed.";
    throw new AuthRequestError(response.status, message);
  }

  return body;
}

export async function registerAccount(
  input: RegistrationInput,
  fetcher: typeof fetch = fetch,
): Promise<RegistrationAccount> {
  const response = await fetcher("/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      tenant_id: input.tenantId,
      email: input.email,
      password: input.password,
    }),
    credentials: "include",
  });
  const body = await requireRegistrationJson(response);

  return {
    id: requireString(body, "id"),
    tenantId: requireString(body, "tenant_id"),
    email: requireString(body, "email"),
    role: requireString(body, "role"),
    status: requireString(body, "status"),
  };
}

export function createBrowserAuthClient(fetcher: typeof fetch = fetch): AuthClient {
  return {
    async login(credentials) {
      const response = await fetcher("/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspace_slug: credentials.workspaceSlug,
          email: credentials.email,
          password: credentials.password,
        }),
        credentials: "include",
      });
      const body = await requireSuccessfulJson(response);

      return {
        tenantId: requireString(body, "tenant_id"),
        email: requireString(body, "email"),
        userId: requireString(body, "user_id"),
      };
    },

    async completeMfaLogin(challenge, code) {
      const response = await fetcher("/auth/login/mfa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenant_id: challenge.tenantId,
          user_id: challenge.userId,
          code,
        }),
        credentials: "include",
      });
      const body = await requireSuccessfulJson(response);

      return {
        access_token: requireString(body, "access_token"),
        token_type: requireString(body, "token_type") as "Bearer",
        expires_in: requirePositiveInteger(body, "expires_in"),
        refresh_expires_in: requirePositiveInteger(body, "refresh_expires_in"),
      };
    },

    async refreshSession() {
      const response = await fetcher("/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      const body = await requireSuccessfulJson(response);

      return {
        access_token: requireString(body, "access_token"),
        token_type: requireString(body, "token_type") as "Bearer",
        expires_in: requirePositiveInteger(body, "expires_in"),
        refresh_expires_in: requirePositiveInteger(body, "refresh_expires_in"),
      };
    },

    async logout() {
      const response = await fetcher("/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        throw new AuthRequestError(response.status);
      }
    },
  };
}
