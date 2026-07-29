import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { useSession } from "../../auth/AuthProvider.tsx";

export function SignInPage() {
  const { login } = useSession();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <main aria-labelledby="sign-in-title">
      <h1 id="sign-in-title">Sign in to TaxPulse Advisory</h1>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);

          setError(null);
          setIsSubmitting(true);
          void login({
            tenantId: String(formData.get("tenantId") ?? ""),
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
          Workspace ID
          <input autoComplete="organization" name="tenantId" required />
        </label>
        <label>
          Email address
          <input autoComplete="email" name="email" required type="email" />
        </label>
        <label>
          Password
          <input autoComplete="current-password" name="password" required type="password" />
        </label>
        {error === null ? null : <p role="alert">{error}</p>}
        <button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Signing in…" : "Continue"}
        </button>
      </form>
    </main>
  );
}
