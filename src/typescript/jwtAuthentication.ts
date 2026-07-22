import type { NextFunction, Request, RequestHandler, Response } from "express";
import { jwtVerify } from "jose";

import type { JwtConfig } from "./authConfig.js";
import type { AuthenticatedPrincipal, UserRole } from "./authTypes.js";
import { roleNameEnum } from "./db/schema.js";
import { ProblemHttpError } from "./errors.js";

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
  const signingKey = new TextEncoder().encode(config.signingSecret);

  return async (req: Request, _res: Response, next: NextFunction) => {
    const token = getBearerToken(req.header("authorization"));

    if (!token) {
      next(authenticationRequired());
      return;
    }

    try {
      const { payload } = await jwtVerify(token, signingKey, {
        algorithms: ["HS256"],
        issuer: config.issuer,
        requiredClaims: ["exp"],
      });
      const principal = toAuthenticatedPrincipal(payload);

      if (!principal) {
        next(authenticationRequired());
        return;
      }

      req.authenticatedPrincipal = principal;
      req.tenant = { id: principal.tenantId };
      req.user = { id: principal.userId };
      next();
    } catch {
      next(authenticationRequired());
    }
  };
}
