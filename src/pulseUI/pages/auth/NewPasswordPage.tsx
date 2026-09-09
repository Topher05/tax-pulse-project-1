import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";

import { AuthRequestError, confirmPasswordReset } from "../../auth/authClient.ts";

function getResetError(error: unknown): string {
  if (error instanceof AuthRequestError && error.status === 401) {
    return "The reset token is invalid or has expired. Please request a new password reset.";
  }

  if (error instanceof AuthRequestError && error.message !== "Authentication request failed.") {
    return error.message;
  }

  return "Unable to reset your password. Please try again.";
}

export function NewPasswordPage() {
  const location = useLocation();
  const searchObj = location.search as unknown;
  const initialToken =
    typeof searchObj === "object" && searchObj !== null && "token" in searchObj && typeof (searchObj as Record<string, unknown>).token === "string"
      ? ((searchObj as Record<string, unknown>).token as string)
      : "";

  const [token, setToken] = useState(initialToken);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  return (
    <main className="authPage" aria-labelledby="new-password-title">
      <section className="authCard">
        <p className="authEyebrow">TaxPulse Advisory</p>
        <h1 id="new-password-title">Set new password</h1>
        <p className="authLead">Enter your reset token and chosen new password.</p>

        {isSuccess ? (
          <div>
            <p className="authSuccess" role="status">
              Your password has been reset successfully. You can now sign in with your new password.
            </p>
            <Link className="authPrimaryButton" to="/sign-in">
              Return to sign in
            </Link>
          </div>
        ) : (
          <form
            className="authForm"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const submittedToken = String(formData.get("token") ?? token).trim();
              const newPassword = String(formData.get("new_password") ?? "");
              const confirmPassword = String(formData.get("confirm_password") ?? "");

              setError(null);

              if (!submittedToken) {
                setError("A reset token is required.");
                return;
              }

              if (newPassword.length < 8) {
                setError("Password must be at least 8 characters.");
                return;
              }

              if (newPassword !== confirmPassword) {
                setError("Passwords must match.");
                return;
              }

              setIsSubmitting(true);
              void confirmPasswordReset({ token: submittedToken, newPassword })
                .then(() => {
                  setIsSuccess(true);
                })
                .catch((resetError: unknown) => {
                  setError(getResetError(resetError));
                })
                .finally(() => {
                  setIsSubmitting(false);
                });
            }}
          >
            <label>
              Reset token
              <input
                autoComplete="off"
                name="token"
                onChange={(event) => setToken(event.target.value)}
                placeholder="Paste your reset token"
                required
                type="text"
                value={token}
              />
            </label>
            <label>
              New password
              <input
                autoComplete="new-password"
                minLength={8}
                name="new_password"
                required
                type="password"
              />
            </label>
            <label>
              Confirm new password
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
              {isSubmitting ? "Resetting password…" : "Reset password"}
            </button>
            <Link className="authTextLink" to="/sign-in">Back to sign in</Link>
          </form>
        )}
      </section>
    </main>
  );
}
