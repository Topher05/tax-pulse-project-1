export function SignInPage() {
  return (
    <main aria-labelledby="sign-in-title">
      <h1 id="sign-in-title">Sign in to TaxPulse Advisory</h1>
      <form onSubmit={(event) => event.preventDefault()}>
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
        <button type="submit">Continue</button>
      </form>
    </main>
  );
}
