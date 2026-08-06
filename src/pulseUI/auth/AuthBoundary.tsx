import type { PropsWithChildren, ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";

import { useSession } from "./AuthProvider.tsx";

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
    return unauthenticatedFallback ?? <Navigate replace to="/sign-in" />;
  }

  return <>{children}</>;
}
