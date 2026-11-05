import type { Response } from "express";

export const refreshTokenCookieName = "taxpulse_refresh_token";

export interface RefreshTokenCookieOptions {
  secure?: boolean;
}

export function setRefreshTokenCookie(
  response: Response,
  refreshToken: string,
  lifetimeSeconds: number,
  options: RefreshTokenCookieOptions = {},
): void {
  response.cookie(refreshTokenCookieName, refreshToken, {
    httpOnly: true,
    maxAge: lifetimeSeconds * 1_000,
    path: "/auth",
    sameSite: "strict",
    secure: options.secure ?? true,
  });
}

export function clearRefreshTokenCookie(
  response: Response,
  options: RefreshTokenCookieOptions = {},
): void {
  response.clearCookie(refreshTokenCookieName, {
    httpOnly: true,
    path: "/auth",
    sameSite: "strict",
    secure: options.secure ?? true,
  });
}

export function getRefreshTokenFromCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const cookie of cookieHeader.split(";")) {
    const [name, ...valueParts] = cookie.trim().split("=");
    if (name === refreshTokenCookieName) {
      const value = valueParts.join("=");
      if (value.length === 0) {
        return null;
      }

      try {
        return decodeURIComponent(value);
      } catch {
        return null;
      }
    }
  }

  return null;
}
