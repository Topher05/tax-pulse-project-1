import { Router } from "express";
import type { NextFunction, Request, Response } from "express";

import { ProblemHttpError } from "../../errors.js";
import { clientRosterListResponseSchema } from "./clientRoster.js";
import type { ClientRosterRepository } from "./repository.js";

export interface CreateClientRosterRouterOptions {
  repository?: ClientRosterRepository;
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

export function createClientRosterRouter(
  options: CreateClientRosterRouterOptions = {},
): Router {
  const router = Router();
  const repository = options.repository ?? {
    async listByTenant() {
      return [];
    },
  };

  router.get(
    "/clients",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = (req as TenantScopedRequest).tenant?.id;
        const userId = (req as TenantScopedRequest).user?.id;

        if (!tenantId || !userId) {
          next(authenticationRequired());
          return;
        }

        const rows = await repository.listByTenant({ tenantId });
        const response = clientRosterListResponseSchema.parse(rows);

        res.status(200).json(response);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
