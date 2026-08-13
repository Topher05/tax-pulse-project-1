import type { SessionRole } from "./session.ts";

/** Client users enter the scoped portal instead of the operator workspace. */
export function getLandingPathForRole(role: SessionRole): "/" | "/my-tax-plan" {
  return role === "Client" ? "/my-tax-plan" : "/";
}
