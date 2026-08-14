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
 * Realign with source 138 post dev fixes (DONE)
 * Holding for code reviews 4x, adding stashed commit (REMOVED? DONE)
 * Review plan from codex ask follow ups to codex + gemini and configure it step by step document progress in the ticket (DONE)
 * Review code + impl and verify changeset (DONE)
 * Review previous branches for feedback/merge conflicts (DONE)
 * Review deliverables for feedback (DONE)
 * Start googling about all pending items as its new territory (DONE)
 * Follow new steps drafted in plan (DONE)
Updated YAML to not use vpc (DONE)
Need to expose vars to lambda via environment config (Double check, DONE)
DB will be public with no vpc as of yet (depends on scrum 155, merged in i think grab dev, VPC not configured stable)
For db should my config string be pointing to local host still? Or docker? Nope needs to point at rds or postgress/docker impl (No DB integration, SNS is endpoint)
Note: Secret maanager is the env file for the aws project (What all needs to be in here??)

1. Left off with bug from auth, auth isn't working correctly as function is crashing, auth fixed (DONE)
2. Working on present-to-client lambda export, the export is complete (DONE)
3. Execute endpoint (DONE)
4. Update both with sns integration (DONE and testing, execute just pushes DLQ, dunno what the ohter is breaking about)
5. Cleanup, Make PR, push changes and remove any uneeeded stuff, condense scripts into one folder under typescript ()
 */