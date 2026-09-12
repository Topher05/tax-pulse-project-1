import { roleNameEnum } from "../../../shared/database/schema.js";

export type UserRole = (typeof roleNameEnum.enumValues)[number];

export interface AuthenticatedPrincipal {
  userId: string;
  role: UserRole;
  tenantId: string;
}

export interface AccessTokenClaims {
  sub: string;
  aud: string;
  role: UserRole;
  tenant_id: string;
  iss: string;
  iat: number;
  exp: number;
}

export interface IssuedTokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresInSeconds: number;
  refreshTokenExpiresInSeconds: number;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}
