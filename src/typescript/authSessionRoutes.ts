import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { ProblemHttpError } from "./errors.js";
import {
  clearRefreshTokenCookie,
  getRefreshTokenFromCookie,
  setRefreshTokenCookie,
} from "./authSessionCookies.js";
import type { TokenService } from "./tokenService.js";

export interface CreateAuthSessionRouterOptions {
  tokenService: TokenService;
}

/** Browser-visible fields; the refresh token is delivered only as an HttpOnly cookie. */
export const authSessionTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.literal("Bearer"),
  expires_in: z.number().int().positive(),
  refresh_expires_in: z.number().int().positive(),
});

function refreshAuthenticationFailed(): ProblemHttpError {
  return new ProblemHttpError({
    type: "https://taxpulse.example/problems/authentication-required",
    title: "Authentication Required",
    status: 401,
    detail: "A valid session is required.",
  });
}

export function createAuthSessionRouter({ tokenService }: CreateAuthSessionRouterOptions): Router {
  const router = Router();

  router.post("/auth/refresh", async (req: Request, res: Response, next: NextFunction) => {
    const refreshToken = getRefreshTokenFromCookie(req.headers.cookie);
    if (refreshToken === null) {
      clearRefreshTokenCookie(res);
      next(refreshAuthenticationFailed());
      return;
    }

    try {
      const pair = await tokenService.rotateRefreshToken(refreshToken);
      if (pair === null) {
        clearRefreshTokenCookie(res);
        next(refreshAuthenticationFailed());
        return;
      }

      setRefreshTokenCookie(res, pair.refreshToken, pair.refreshTokenExpiresInSeconds);
      res.status(200).json(authSessionTokenResponseSchema.parse({
        access_token: pair.accessToken,
        token_type: "Bearer",
        expires_in: pair.accessTokenExpiresInSeconds,
        refresh_expires_in: pair.refreshTokenExpiresInSeconds,
      }));
    } catch (error) {
      next(error);
    }
  });

  router.post("/auth/logout", async (req: Request, res: Response, next: NextFunction) => {
    const refreshToken = getRefreshTokenFromCookie(req.headers.cookie);
    clearRefreshTokenCookie(res);

    try {
      if (refreshToken !== null) {
        await tokenService.revokeRefreshToken(refreshToken);
      }
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
