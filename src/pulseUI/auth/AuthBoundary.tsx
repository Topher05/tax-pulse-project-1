import type { PropsWithChildren, ReactNode } from "react";

import { useSession } from "./AuthProvider.tsx";
import { SignInPage } from "../pages/auth/SignInPage.tsx";

/** Blocks workspace routes until the session has been restored and is authenticated. */
export interface AuthBoundaryProps extends PropsWithChildren {
  readonly unauthenticatedFallback?: ReactNode;
}

export function AuthBoundary({ children, unauthenticatedFallback }: AuthBoundaryProps) {
  const { isAuthenticated, status } = useSession();

  if (status === "initializing") {
    return <p role="status">Restoring your session…</p>;
  }

  if (!isAuthenticated) {
    return unauthenticatedFallback ?? <SignInPage />;
  }

  return <>{children}</>;
}
