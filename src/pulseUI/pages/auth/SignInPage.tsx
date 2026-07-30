import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";

import { useSession } from "../../auth/AuthProvider.tsx";

export function SignInPage() {
  const { login } = useSession();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <main className="authPage" aria-labelledby="sign-in-title">
      <section className="authCard">
        <p className="authEyebrow">TaxPulse Advisory</p>
        <h1 id="sign-in-title">Sign in to your workspace</h1>
        <p className="authLead">Use your firm credentials to continue.</p>
        <form
          className="authForm"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);

            setError(null);
            setIsSubmitting(true);
            void login({
              email: String(formData.get("email") ?? ""),
              password: String(formData.get("password") ?? ""),
            })
              .then(async (mfaChallenge) => {
                await navigate({ to: "/sign-in/mfa", state: { mfaChallenge } });
              })
              .catch(() => {
                setError("Unable to sign in. Check your credentials and try again.");
              })
              .finally(() => {
                setIsSubmitting(false);
              });
          }}
        >
          <label>
            Email address
            <input autoComplete="email" name="email" required type="email" />
          </label>
          <label>
            Password
            <input autoComplete="current-password" name="password" required type="password" />
          </label>
          {error === null ? null : (
            <p className="authError" role="alert">{error}</p>
          )}
          <button className="authPrimaryButton" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Signing in…" : "Continue"}
          </button>
        </form>
        <Link className="authTextLink" to="/password-reset">
          Forgot your password?
        </Link>
      </section>
    </main>
  );
}
