
import { createRootRoute, createRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "../components/AppShell.tsx";
import { DashboardPage } from "../pages/dashboard/DashboardPage.tsx";
import { EmptyPage } from "../pages/EmptyPage.tsx";
import { ClientRosterPage } from "../pages/clients/ClientRosterPage.tsx";
import { DeductionsPage } from "../pages/deductions/DeductionsPage.tsx";
import { IncomePage } from "../pages/income/IncomePage.tsx";
import { PlanCycle } from "../pages/taxPlanCycle/PlanCycle.tsx";
import { AuthBoundary } from "../auth/AuthBoundary.tsx";
import { MfaChallengePage } from "../pages/auth/MfaChallengePage.tsx";
import { PasswordResetConfirmationPage } from "../pages/auth/PasswordResetConfirmationPage.tsx";
import { PasswordResetPage } from "../pages/auth/PasswordResetPage.tsx";
import { SignInPage } from "../pages/auth/SignInPage.tsx";
import { ScenarioPlannerPage } from "../pages/scenarios/ScenarioPlannerPage.tsx";
import { DetailsPage } from "../pages/taxPlanCycle/Details.tsx";
import { validateDetailsSearch } from "../pages/taxPlanCycle/detailViewState.ts";

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
  id: "_workspace",
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
  component: DashboardPage,
});

const cyclesQueueRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/cycles/queue",
  component: PlanCycle,
});

const cycleDetailsRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/cycles/$id",
  component: DetailsPage,
  validateSearch: (search) => validateDetailsSearch(search),
});

const scenarioPlannerRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/scenarios",
  component: EmptyPage,
});

const incomeRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/income",
  component: () => <IncomePage clientId="" taxYear={2026} incomeEvents={[]} />,
});

const deductionsRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/deductions",
  component: DeductionsPage,
});

const quarterlyPaymentsRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/quarterly-payments",
  component: EmptyPage,
});

const clientsRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/clients",
  component: ClientRosterPage,
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

const administrationTenantsUsersRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/administration/tenants-users",
  component: EmptyPage,
});

const administrationRolesPermissionsRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/administration/roles-permissions",
  component: EmptyPage,
});

const administrationAuditLogRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/administration/audit-log",
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
    administrationTenantsUsersRoute,
    administrationRolesPermissionsRoute,
    administrationAuditLogRoute,
  ]),
]);
