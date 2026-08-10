import { roleNameEnum } from "./shared/database/schema.js";

export type UserRole = (typeof roleNameEnum.enumValues)[number];

export interface AuthenticatedPrincipal {
  userId: string;
  role: UserRole;
  tenantId: string;
}

export interface AccessTokenClaims {
  sub: string;
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


/**
 * Plan/Placeholder
 * Review plan from codex ask follow ups to codex + gemini and configure it step by step document progress in the ticket
 * Review code + impl and verify changeset
 * Review previous branches for feedback/merge conflicts
 * Review deliverables for feedback
 * Start googling about all pending items as its new territory
 * Follow new steps drafted in plan
 * 
 */