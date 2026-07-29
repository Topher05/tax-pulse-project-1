import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";

export function PasswordResetPage() {
  const navigate = useNavigate();
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
            setIsSubmitting(true);
            void navigate({ to: "/password-reset/confirmation" }).finally(() => {
              setIsSubmitting(false);
            });
          }}
        >
          <label>
            Email address
            <input autoComplete="email" name="email" required type="email" />
          </label>
          <button className="authPrimaryButton" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Continuing…" : "Continue"}
          </button>
        </form>
        <Link className="authTextLink" to="/sign-in">Back to sign in</Link>
      </section>
    </main>
  );
}
