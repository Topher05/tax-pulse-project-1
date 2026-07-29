import { Link, useRouterState } from "@tanstack/react-router";

import { readMfaChallengeRouteState } from "../../auth/mfaChallengeState.ts";

export function MfaChallengePage() {
  const routeState = useRouterState({ select: (state) => state.location.state });
  const mfaChallenge = readMfaChallengeRouteState(routeState);

  if (mfaChallenge === null) {
    return (
      <main aria-labelledby="mfa-challenge-title">
        <h1 id="mfa-challenge-title">Verify your identity</h1>
        <p>Start by signing in to request a verification code.</p>
        <Link to="/sign-in">Back to sign in</Link>
      </main>
    );
  }

  return (
    <main aria-labelledby="mfa-challenge-title">
      <h1 id="mfa-challenge-title">Verify your identity</h1>
      <p>Enter the verification code from your authenticator app for {mfaChallenge.email}.</p>
    </main>
  );
}
