import styles from "../components/AppShell.module.css";

export function LoginPage() {
  return (
    <section className={styles.loginPanel} aria-labelledby="pulse-login-heading">
      <h1 id="pulse-login-heading">Sign in</h1>
      <p>Authentication is required to continue to TaxPulse.</p>
    </section>
  );
}
