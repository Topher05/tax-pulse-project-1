/**
 * The role names are deliberately kept aligned with the BFF's JWT role claim.
 * Screens should use this type rather than infer identity from UI controls.
 */
export const sessionRoles = [
  "Firm Admin",
  "Advisor",
  "Client",
  "TaxPulse Platform Admin",
] as const;

export type SessionRole = (typeof sessionRoles)[number];

export interface SessionUser {
  readonly userId: string;
  readonly role: SessionRole;
  readonly tenantId: string;
}

export interface AccessTokenClaims {
  readonly sub: string;
  readonly role: SessionRole;
  readonly tenant_id: string;
  readonly exp: number;
}

/** The response issued after the password and MFA authentication flow completes. */
export interface IssuedTokenResponse {
  readonly access_token: string;
  readonly refresh_token: string;
  readonly token_type: "Bearer";
  readonly expires_in: number;
  readonly refresh_expires_in: number;
}

export interface LoginCredentials {
  readonly tenantId: string;
  readonly email: string;
  readonly password: string;
}

export interface MfaChallenge {
  readonly tenantId: string;
  readonly email: string;
  readonly userId: string;
}

export interface AuthenticatedSession {
  readonly accessToken: string;
  readonly accessTokenExpiresAt: number;
  readonly refreshTokenExpiresAt: number;
  readonly user: SessionUser;
}

export type AuthSessionState =
  | { readonly status: "initializing" }
  | { readonly status: "anonymous" }
  | { readonly status: "authenticated"; readonly session: AuthenticatedSession };

export interface SessionActions {
  login(credentials: LoginCredentials): Promise<MfaChallenge>;
  completeMfaLogin(challenge: MfaChallenge, code: string): Promise<void>;
  logout(): Promise<void>;
  refreshSession(): Promise<void>;
  getAccessToken(): Promise<string | null>;
}

export type SessionContextValue = AuthSessionState & SessionActions;

function isSessionRole(value: unknown): value is SessionRole {
  return typeof value === "string" && sessionRoles.includes(value as SessionRole);
}

function isPositiveWholeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function decodeBase64Url(value: string): string | null {
  try {
    const paddedValue = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
      Math.ceil(value.length / 4) * 4,
      "=",
    );
    return atob(paddedValue);
  } catch {
    return null;
  }
}

/**
 * Reads only untrusted display/routing claims. Authorization remains enforced by the BFF.
 */
export function parseAccessTokenClaims(accessToken: string): AccessTokenClaims | null {
  const encodedPayload = accessToken.split(".")[1];

  if (encodedPayload === undefined) {
    return null;
  }

  const decodedPayload = decodeBase64Url(encodedPayload);
  if (decodedPayload === null) {
    return null;
  }

  try {
    const claims: unknown = JSON.parse(decodedPayload);

    if (typeof claims !== "object" || claims === null) {
      return null;
    }

    const record = claims as Record<string, unknown>;
    if (
      !isNonEmptyString(record.sub) ||
      !isSessionRole(record.role) ||
      !isNonEmptyString(record.tenant_id) ||
      !isPositiveWholeNumber(record.exp)
    ) {
      return null;
    }

    return {
      sub: record.sub,
      role: record.role,
      tenant_id: record.tenant_id,
      exp: record.exp,
    };
  } catch {
    return null;
  }
}

/**
 * Converts an issued BFF response into the browser session. The refresh token is intentionally
 * not retained here: the follow-on BFF endpoint will keep it in an HttpOnly cookie.
 */
export function createAuthenticatedSession(
  response: IssuedTokenResponse,
  now: number = Date.now(),
): AuthenticatedSession | null {
  if (
    response.token_type !== "Bearer" ||
    !isNonEmptyString(response.access_token) ||
    !isNonEmptyString(response.refresh_token) ||
    !isPositiveWholeNumber(response.expires_in) ||
    !isPositiveWholeNumber(response.refresh_expires_in)
  ) {
    return null;
  }

  const claims = parseAccessTokenClaims(response.access_token);
  if (claims === null) {
    return null;
  }

  return {
    accessToken: response.access_token,
    accessTokenExpiresAt: now + response.expires_in * 1_000,
    refreshTokenExpiresAt: now + response.refresh_expires_in * 1_000,
    user: {
      userId: claims.sub,
      role: claims.role,
      tenantId: claims.tenant_id,
    },
  };
}
