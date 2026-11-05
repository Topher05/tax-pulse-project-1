import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";

import { AuthRequestError, registerAccount } from "../../auth/authClient.ts";

function getRegistrationError(error: unknown): string {
  if (error instanceof AuthRequestError && error.status === 409) {
    return "An account with this email is already registered for this workspace.";
  }

  if (error instanceof AuthRequestError && error.message !== "Authentication request failed.") {
    return error.message;
  }

  return "Unable to create your account. Review your details and try again.";
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <main className="authPage" aria-labelledby="register-title">
      <section className="authCard">
        <p className="authEyebrow">TaxPulse Advisory</p>
        <h1 id="register-title">Create your account</h1>
        <p className="authLead">Register with your workspace details to begin setup.</p>
        <form
          className="authForm"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);
            const workspaceSlug = String(formData.get("workspace_slug") ?? "").trim().toLowerCase();
            const email = String(formData.get("email") ?? "").trim().toLowerCase();
            const password = String(formData.get("password") ?? "");
            const confirmPassword = String(formData.get("confirm_password") ?? "");

            setError(null);

            if (password !== confirmPassword) {
              setError("Passwords must match.");
              return;
            }

            setIsSubmitting(true);
            void registerAccount({ workspaceSlug, email, password })
              .then(async (account) => {
                await navigate({
                  to: "/register/mfa",
                  state: {
                    mfaChallenge: {
                      tenantId: account.tenantId,
                      email: account.email,
                      userId: account.id,
                    },
                  },
                });
              })
              .catch((registrationError: unknown) => {
                setError(getRegistrationError(registrationError));
              })
              .finally(() => {
                setIsSubmitting(false);
              });
          }}
        >
          <label>
            Firm workspace
            <input
              autoComplete="organization"
              name="workspace_slug"
              placeholder="summit-ridge-tax"
              required
              type="text"
            />
          </label>
          <label>
            Email address
            <input autoComplete="email" name="email" required type="email" />
          </label>
          <label>
            Password
            <input autoComplete="new-password" minLength={8} name="password" required type="password" />
          </label>
          <label>
            Confirm password
            <input
              autoComplete="new-password"
              minLength={8}
              name="confirm_password"
              required
              type="password"
            />
          </label>
          {error === null ? null : (
            <p className="authError" role="alert">{error}</p>
          )}
          <button className="authPrimaryButton" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>
        <Link className="authTextLink" to="/sign-in">Back to sign in</Link>
      </section>
    </main>
  );
}
