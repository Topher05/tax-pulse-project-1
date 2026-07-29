import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";

import { getLandingPathForRole } from "../../auth/landingPath.ts";
import { readMfaChallengeRouteState } from "../../auth/mfaChallengeState.ts";
import { useSession } from "../../auth/AuthProvider.tsx";

export function MfaChallengePage() {
  const { completeMfaLogin } = useSession();
  const navigate = useNavigate();
  const routeState = useRouterState({ select: (state) => state.location.state });
  const mfaChallenge = readMfaChallengeRouteState(routeState);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);

          setError(null);
          setIsSubmitting(true);
          void completeMfaLogin(mfaChallenge, String(formData.get("code") ?? ""))
            .then(async (user) => {
              if (user === null) {
                setError("Unable to verify your code. Please try again.");
                return;
              }
              await navigate({ to: getLandingPathForRole(user.role) });
            })
            .catch(() => {
              setError("Unable to verify your code. Please try again.");
            })
            .finally(() => {
              setIsSubmitting(false);
            });
        }}
      >
        <label>
          Verification code
          <input
            autoComplete="one-time-code"
            inputMode="numeric"
            name="code"
            pattern="[0-9]{6}"
            required
          />
        </label>
        {error === null ? null : <p role="alert">{error}</p>}
        <button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Verifying…" : "Verify and sign in"}
        </button>
      </form>
    </main>
  );
}
