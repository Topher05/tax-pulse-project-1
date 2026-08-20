import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { ProblemHttpError } from "../../errors.js";
import {
  firmUserRoleUpdateParamsSchema,
  firmUserRoleUpdateRequestSchema,
  firmUserRowSchema,
  firmUsersListResponseSchema,
} from "./firmUsers.js";
import type { FirmUserRole } from "./firmUsers.js";
import type { FirmUsersRepository } from "./repository.js";

export interface CreateFirmUsersRouterOptions {
  repository?: FirmUsersRepository;
}

interface TenantScopedRequest extends Request {
  tenant?: {
    id: string;
  };
  user?: {
    id: string;
    role?: FirmUserRole;
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

function authorizationRequired(): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/authorization-required",
    title: "Authorization Required",
    status: 403,
    detail: "Firm Admin access is required to update firm user roles.",
  });
}

function firmUserNotFound(): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/firm-user-not-found",
    title: "Firm User Not Found",
    status: 404,
    detail: "The requested firm user was not found for the authenticated tenant.",
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

export function createFirmUsersRouter(
  options: CreateFirmUsersRouterOptions = {},
): Router {
  const router = Router();
  const repository = options.repository ?? {
    async listByTenant() {
      return [];
    },
    async updateTenantUserRole() {
      return null;
    },
  };

  router.get(
    "/firm/users",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = (req as TenantScopedRequest).tenant?.id;
        const userId = (req as TenantScopedRequest).user?.id;

        if (!tenantId || !userId) {
          next(authenticationRequired());
          return;
        }

        const rows = await repository.listByTenant({ tenantId });
        const response = firmUsersListResponseSchema.parse(rows);

        res.status(200).json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    "/firm/users/:userId/role",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = (req as TenantScopedRequest).tenant?.id;
        const userId = (req as TenantScopedRequest).user?.id;
        const actingRole = (req as TenantScopedRequest).user?.role;

        if (!tenantId || !userId) {
          next(authenticationRequired());
          return;
        }

        if (actingRole !== "Firm Admin") {
          next(authorizationRequired());
          return;
        }

        const params = firmUserRoleUpdateParamsSchema.safeParse(req.params);
        const body = firmUserRoleUpdateRequestSchema.safeParse(req.body);

        if (!params.success) {
          next(validationFailed(params.error));
          return;
        }

        if (!body.success) {
          next(validationFailed(body.error));
          return;
        }

        const row = await repository.updateTenantUserRole({
          tenantId,
          userId: params.data.userId,
          role: body.data.role,
        });

        if (row === null) {
          next(firmUserNotFound());
          return;
        }

        const response = firmUserRowSchema.parse(row);

        res.status(200).json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
