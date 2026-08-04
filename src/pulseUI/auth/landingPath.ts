import type { SessionRole } from "./session.ts";

/**
 * Dedicated client and platform-admin landing routes arrive in later UI tickets. Until then,
 * every authenticated role uses the existing dashboard route.
 */
export function getLandingPathForRole(_role: SessionRole): "/" {
  return "/";
}
