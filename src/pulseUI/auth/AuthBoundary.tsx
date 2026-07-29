import type { PropsWithChildren } from "react";

import { useSession } from "./AuthProvider.tsx";
import { SignInPage } from "../pages/auth/SignInPage.tsx";

/** Blocks workspace routes until the session has been restored and is authenticated. */
export function AuthBoundary({ children }: PropsWithChildren) {
  const { isAuthenticated, status } = useSession();

  if (status === "initializing") {
    return <p role="status">Restoring your session…</p>;
  }

  if (!isAuthenticated) {
    return <SignInPage />;
  }

  return <>{children}</>;
}
