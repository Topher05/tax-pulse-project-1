import type { MfaChallenge } from "./session.ts";

declare module "@tanstack/history" {
  interface HistoryState {
    readonly mfaChallenge?: MfaChallenge;
  }
}

export type MfaChallengeRouteState = {
  readonly mfaChallenge: MfaChallenge;
};

function isMfaChallenge(value: unknown): value is MfaChallenge {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const challenge = value as Record<string, unknown>;
  return ["tenantId", "email", "userId"].every(
    (key) => typeof challenge[key] === "string" && challenge[key].length > 0,
  );
}

export function readMfaChallengeRouteState(value: unknown): MfaChallenge | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const state = value as Record<string, unknown>;
  return isMfaChallenge(state.mfaChallenge) ? state.mfaChallenge : null;
}
