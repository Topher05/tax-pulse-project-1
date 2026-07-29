import { Link } from "@tanstack/react-router";

export function PasswordResetConfirmationPage() {
  return (
    <main className="authPage" aria-labelledby="password-reset-confirmation-title">
      <section className="authCard">
        <p className="authEyebrow">TaxPulse Advisory</p>
        <h1 id="password-reset-confirmation-title">Check your email</h1>
        <p className="authLead">If an account matches the submitted email address, reset instructions will be sent.</p>
        <Link className="authPrimaryButton" to="/sign-in">Return to sign in</Link>
      </section>
    </main>
  );
}
