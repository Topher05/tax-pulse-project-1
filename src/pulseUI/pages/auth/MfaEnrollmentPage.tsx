import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";

import {
  AuthRequestError,
  beginMfaEnrollment,
  confirmMfaEnrollment,
} from "../../auth/authClient.ts";
import { readMfaChallengeRouteState } from "../../auth/mfaChallengeState.ts";

function getEnrollmentError(error: unknown): string {
  if (error instanceof AuthRequestError && error.status === 401) {
    return "The verification code is not valid. Try the current code from your authenticator app.";
  }

  if (error instanceof AuthRequestError && error.message !== "Authentication request failed.") {
    return error.message;
  }

  return "Unable to complete MFA enrollment. Please try again.";
}

export function MfaEnrollmentPage() {
  const routeState = useRouterState({ select: (state) => state.location.state });
  const mfaChallenge = readMfaChallengeRouteState(routeState);
  const [provisioningUri, setProvisioningUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    if (mfaChallenge === null) {
      return;
    }

    let isMounted = true;
    setError(null);
    setProvisioningUri(null);

    void beginMfaEnrollment({
      tenantId: mfaChallenge.tenantId,
      userId: mfaChallenge.userId,
    })
      .then((result) => {
        if (isMounted) {
          setProvisioningUri(result.provisioningUri);
        }
      })
      .catch((enrollmentError: unknown) => {
        if (isMounted) {
          setError(getEnrollmentError(enrollmentError));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [mfaChallenge]);

  if (mfaChallenge === null) {
    return (
      <main className="authPage" aria-labelledby="mfa-enrollment-title">
        <section className="authCard">
          <p className="authEyebrow">TaxPulse Advisory</p>
          <h1 id="mfa-enrollment-title">Set up MFA</h1>
          <p className="authLead">Start registration before setting up an authenticator app.</p>
          <Link className="authTextLink" to="/register">Back to registration</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="authPage" aria-labelledby="mfa-enrollment-title">
      <section className="authCard">
        <p className="authEyebrow">TaxPulse Advisory</p>
        <h1 id="mfa-enrollment-title">Set up MFA</h1>
        <p className="authLead">
          Add TaxPulse to your authenticator app for {mfaChallenge.email}.
        </p>
        {provisioningUri === null && error === null ? (
          <p className="authStatus" role="status">Preparing MFA setup...</p>
        ) : null}
        {provisioningUri === null ? null : (
          <label className="authReadonlyLabel">
            Authenticator setup URI
            <input readOnly value={provisioningUri} />
          </label>
        )}
        <form
          className="authForm"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const code = String(formData.get("code") ?? "");

            setError(null);
            setIsConfirming(true);
            void confirmMfaEnrollment({
              tenantId: mfaChallenge.tenantId,
              userId: mfaChallenge.userId,
              code,
            })
              .then(() => {
                setIsEnrolled(true);
              })
              .catch((confirmationError: unknown) => {
                setError(getEnrollmentError(confirmationError));
              })
              .finally(() => {
                setIsConfirming(false);
              });
          }}
        >
          <label>
            Verification code
            <input
              autoComplete="one-time-code"
              disabled={provisioningUri === null || isEnrolled}
              inputMode="numeric"
              name="code"
              pattern="[0-9]{6}"
              required
            />
          </label>
          {error === null ? null : (
            <p className="authError" role="alert">{error}</p>
          )}
          {isEnrolled ? (
            <p className="authSuccess" role="status">
              MFA is enabled. You can now sign in with your authenticator app.
            </p>
          ) : null}
          <button
            className="authPrimaryButton"
            disabled={provisioningUri === null || isConfirming || isEnrolled}
            type="submit"
          >
            {isConfirming ? "Verifying..." : "Enable MFA"}
          </button>
        </form>
        {isEnrolled ? (
          <Link className="authTextLink" to="/sign-in">Continue to sign in</Link>
        ) : null}
      </section>
    </main>
  );
}
