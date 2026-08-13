import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { ProblemHttpError } from "../../errors.js";
import type { UserRole } from "../../authTypes.js";
import {
  platformAuditLogResponseSchema,
  platformPermissionMatrixResponseSchema,
  platformTenantUserCreateParamsSchema,
  platformTenantUserCreateRequestSchema,
  platformTenantUserRowSchema,
  platformTenantUsersListResponseSchema,
} from "./platformAdministration.js";
import type { PlatformAdministrationRepository } from "./repository.js";
import { PlatformTenantUserEmailConflictError } from "./repository.js";

export interface CreatePlatformAdministrationRouterOptions {
  repository?: PlatformAdministrationRepository;
}

interface PlatformAdministrationRequest extends Request {
  user?: {
    id: string;
    role?: UserRole;
  };
}

function authenticationRequired(): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/authentication-required",
    title: "Authentication Required",
    status: 401,
    detail: "A valid access token is required.",
  });
}

function platformAuthorizationRequired(): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/platform-authorization-required",
    title: "Platform Authorization Required",
    status: 403,
    detail: "TaxPulse Platform Admin access is required.",
  });
}

function tenantUserNotFound(): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/platform-tenant-user-not-created",
    title: "Tenant User Not Created",
    status: 404,
    detail: "The requested tenant was not found.",
  });
}

function emailAlreadyRegistered(): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/email-already-registered",
    title: "Email Already Registered",
    status: 409,
    detail: "An account with this email is already registered for this tenant.",
    extensions: { code: "EMAIL_ALREADY_REGISTERED" },
  });
}

function validationFailed(error: ZodError): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/validation-error",
    title: "Validation Error",
    status: 400,
    detail: error.issues.map((issue) => issue.message).join("; "),
  });
}

function requirePlatformAdmin(req: Request, next: NextFunction): boolean {
  const user = (req as PlatformAdministrationRequest).user;

  if (!user?.id) {
    next(authenticationRequired());
    return false;
  }

  if (user.role !== "TaxPulse Platform Admin") {
    next(platformAuthorizationRequired());
    return false;
  }

  return true;
}

export function createPlatformAdministrationRouter(
  options: CreatePlatformAdministrationRouterOptions = {},
): Router {
  const router = Router();
  const repository = options.repository ?? {
    async listTenantsWithUsers() {
      return [];
    },
    async listPermissionMatrix() {
      return [];
    },
    async listPlatformAuditLog() {
      return [];
    },
    async createTenantUser() {
      return null;
    },
  };

  router.get(
    "/administration/roles-permissions",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!requirePlatformAdmin(req, next)) {
          return;
        }

        const rows = await repository.listPermissionMatrix();
        const response = platformPermissionMatrixResponseSchema.parse(rows);

        res.status(200).json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/administration/audit-log",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!requirePlatformAdmin(req, next)) {
          return;
        }

        const rows = await repository.listPlatformAuditLog();
        const response = platformAuditLogResponseSchema.parse(rows);

        res.status(200).json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/administration/tenants-users",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!requirePlatformAdmin(req, next)) {
          return;
        }

        const rows = await repository.listTenantsWithUsers();
        const response = platformTenantUsersListResponseSchema.parse(rows);

        res.status(200).json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/administration/tenants/:tenantId/users",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!requirePlatformAdmin(req, next)) {
          return;
        }

        const params = platformTenantUserCreateParamsSchema.safeParse(req.params);
        const body = platformTenantUserCreateRequestSchema.safeParse(req.body);

        if (!params.success) {
          next(validationFailed(params.error));
          return;
        }

        if (!body.success) {
          next(validationFailed(body.error));
          return;
        }

        const row = await repository.createTenantUser({
          tenantId: params.data.tenantId,
          ...body.data,
        });

        if (row === null) {
          next(tenantUserNotFound());
          return;
        }

        const response = platformTenantUserRowSchema.parse(row);

        res.status(201).json(response);
      } catch (error) {
        if (error instanceof PlatformTenantUserEmailConflictError) {
          next(emailAlreadyRegistered());
          return;
        }

        next(error);
      }
    },
  );

  return router;
}
