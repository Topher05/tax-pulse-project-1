import type { NextFunction, Request, RequestHandler, Response } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";

import type { JwtConfig } from "../infrastructure/authConfig.js";
import type { AuthenticatedPrincipal, UserRole } from "../domain/authTypes.js";
import { roleNameEnum } from "../../../shared/database/schema.js";
import { ProblemHttpError } from "../../../platform/http/errors.js";

declare global {
  namespace Express {
    interface Request {
      authenticatedPrincipal?: AuthenticatedPrincipal;
      tenant?: { id: string };
      user?: {
        id: string;
        role?: UserRole;
        permissions?: string[];
      };
    }
  }
}

export interface CreateJwtAuthenticationMiddlewareOptions {
  config: JwtConfig;
}

export interface CreateHydrateUserClaimsOptions {
  permissionsForRole?: Partial<Record<UserRole, ReadonlyArray<string>>>;
}

function authenticationRequired(): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/authentication-required",
    title: "Authentication Required",
    status: 401,
    detail: "A valid access token is required.",
  });
}

function getBearerToken(authorization: string | undefined): string | null {
  if (!authorization) {
    return null;
  }

  const match = /^Bearer ([^\s]+)$/.exec(authorization);
  return match?.[1] ?? null;
}

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && roleNameEnum.enumValues.includes(value as UserRole);
}

function toAuthenticatedPrincipal(
  payload: Record<string, unknown>,
): AuthenticatedPrincipal | null {
  if (
    typeof payload.sub !== "string" ||
    payload.sub.length === 0 ||
    !isUserRole(payload.role) ||
    typeof payload.tenant_id !== "string" ||
    payload.tenant_id.length === 0
  ) {
    return null;
  }

  return {
    userId: payload.sub,
    role: payload.role,
    tenantId: payload.tenant_id,
  };
}

export function hydrateUserClaims(
  permissionsForRole: Partial<Record<UserRole, ReadonlyArray<string>>> = {
    Advisor: ["EDIT"],
  },
): RequestHandler {
  const effectivePermissionsForRole: Partial<
    Record<UserRole, ReadonlyArray<string>>
  > = {
    Advisor: ["EDIT"],
    ...permissionsForRole,
  };

  return (req, _res, next) => {
    const principal = req.authenticatedPrincipal;

    if (!principal) {
      next(new Error("Authenticated principal missing after JWT verification."));
      return;
    }

    req.user = {
      id: principal.userId,
      role: principal.role,
      permissions: [...(effectivePermissionsForRole[principal.role] ?? [])],
    };

    next();
  };
}

export function createJwtAuthenticationMiddleware({
  config,
}: CreateJwtAuthenticationMiddlewareOptions): RequestHandler {
  const verifyToken = (() => {
    if (config.signingSecret) {
      const signingKey = new TextEncoder().encode(config.signingSecret);
      return async (token: string) => await jwtVerify(token, signingKey, {
        algorithms: ["HS256"],
        issuer: config.issuer,
        requiredClaims: ["exp"],
      });
    }
//1
    const jwks = createRemoteJWKSet(
      new URL(config.jwksUrl ?? new URL("/.well-known/jwks.json", config.issuer)),
    );
    return async (token: string) => await jwtVerify(token, jwks, {
      algorithms: ["RS256"],
      issuer: config.issuer,
      audience: config.audience,
      requiredClaims: ["exp"],
    });
  })();

  return async (req: Request, _res: Response, next: NextFunction) => {
    const token = getBearerToken(req.header("authorization"));

    if (!token) {
      next(authenticationRequired());
      return;
    }
//2
    try {
      const { payload } = await verifyToken(token);
      const principal = toAuthenticatedPrincipal(payload);

      if (!principal) {
        next(authenticationRequired());
        return;
      }

      req.authenticatedPrincipal = principal;
      req.tenant = { id: principal.tenantId };
      req.user = { id: principal.userId, role: principal.role };
      next();
    } catch {
      next(authenticationRequired());
    }
  };
}
