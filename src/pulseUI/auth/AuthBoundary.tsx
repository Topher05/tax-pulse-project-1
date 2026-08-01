import type { PropsWithChildren } from "react";

import { useSession } from "./AuthProvider.tsx";

/** Blocks workspace routes until the session has been restored and is authenticated. */
export function AuthBoundary({ children }: PropsWithChildren) {
  const { isAuthenticated, status } = useSession();

  if (status === "initializing") {
    return <p role="status">Restoring your session…</p>;
  }

  if (!isAuthenticated) {
    return (
      <main>
        <h1>Sign in required</h1>
        <p>Your session has ended. Sign in to continue to TaxPulse Advisory.</p>
      </main>
    );
  }

  return <>{children}</>;
}
