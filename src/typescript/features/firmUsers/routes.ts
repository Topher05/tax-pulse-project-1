import { Router } from "express";
import type { NextFunction, Request, Response } from "express";

import { ProblemHttpError } from "../../errors.js";
import { firmUsersListResponseSchema } from "./firmUsers.js";
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

export function createFirmUsersRouter(
  options: CreateFirmUsersRouterOptions = {},
): Router {
  const router = Router();
  const repository = options.repository ?? {
    async listByTenant() {
      return [];
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

  return router;
}
