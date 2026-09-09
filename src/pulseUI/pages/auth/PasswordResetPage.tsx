import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";

import { requestPasswordReset } from "../../auth/authClient.ts";

export function PasswordResetPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <main className="authPage" aria-labelledby="password-reset-title">
      <section className="authCard">
        <p className="authEyebrow">TaxPulse Advisory</p>
        <h1 id="password-reset-title">Reset your password</h1>
        <p className="authLead">Enter your email and we’ll show a confirmation message.</p>
        <form
          className="authForm"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const email = String(formData.get("email") ?? "").trim().toLowerCase();

            setError(null);
            setIsSubmitting(true);
            void requestPasswordReset({ email })
              .then(async () => {
                await navigate({ to: "/password-reset/confirmation" });
              })
              .catch(() => {
                setError("Unable to process your request. Please try again.");
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
          {error === null ? null : (
            <p className="authError" role="alert">{error}</p>
          )}
          <button className="authPrimaryButton" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Continuing…" : "Continue"}
          </button>
        </form>
        <Link className="authTextLink" to="/sign-in">Back to sign in</Link>
      </section>
    </main>
  );
}
