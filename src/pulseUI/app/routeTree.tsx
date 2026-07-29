import { createRootRoute, createRoute, Outlet } from "@tanstack/react-router";

import { PlanCycleDetailRoute } from "../pages/taxPlanCycle/PlanCycleDetailRoute.tsx";
import { AppShell } from "../components/AppShell.tsx";
import { EmptyPage } from "../pages/EmptyPage.tsx";
import { PlanCycle } from "../pages/taxPlanCycle/PlanCycle.tsx";
import { AuthBoundary } from "../auth/AuthBoundary.tsx";
import { MfaChallengePage } from "../pages/auth/MfaChallengePage.tsx";
import { PasswordResetConfirmationPage } from "../pages/auth/PasswordResetConfirmationPage.tsx";
import { PasswordResetPage } from "../pages/auth/PasswordResetPage.tsx";
import { SignInPage } from "../pages/auth/SignInPage.tsx";

const rootRoute = createRootRoute({
  component: Outlet,
});

function AuthenticatedWorkspace() {
  return (
    <AuthBoundary>
      <AppShell />
    </AuthBoundary>
  );
}

const workspaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "workspace",
  component: AuthenticatedWorkspace,
});

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sign-in",
  component: SignInPage,
});

const mfaChallengeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sign-in/mfa",
  component: MfaChallengePage,
});

const passwordResetRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/password-reset",
  component: PasswordResetPage,
});

const passwordResetConfirmationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/password-reset/confirmation",
  component: PasswordResetConfirmationPage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/",
  component: EmptyPage,
});

const cyclesQueueRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/cycles/queue",
  component: PlanCycle,
});

const cycleDetailsRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/cycles/$caseId",
  component: PlanCycleDetailRoute,
});

const scenarioPlannerRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/scenarios",
  component: EmptyPage,
});

const incomeRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/income",
  component: EmptyPage,
});

const deductionsRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/deductions",
  component: EmptyPage,
});

const quarterlyPaymentsRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/quarterly-payments",
  component: EmptyPage,
});

const clientsRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/clients",
  component: EmptyPage,
});

const firmUsersRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/firm/users",
  component: EmptyPage,
});

const firmSettingsRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/firm/settings",
  component: EmptyPage,
});

export const routeTree = rootRoute.addChildren([
  signInRoute,
  mfaChallengeRoute,
  passwordResetRoute,
  passwordResetConfirmationRoute,
  workspaceRoute.addChildren([
    dashboardRoute,
    cyclesQueueRoute,
    cycleDetailsRoute,
    scenarioPlannerRoute,
    incomeRoute,
    deductionsRoute,
    quarterlyPaymentsRoute,
    clientsRoute,
    firmUsersRoute,
    firmSettingsRoute,
  ]),
]);
