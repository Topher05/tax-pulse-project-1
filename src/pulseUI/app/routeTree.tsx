import { createRootRoute, createRoute, Navigate, Outlet } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AppShell } from "../components/AppShell.tsx";
import { DashboardPage } from "../pages/dashboard/DashboardPage.tsx";
import { EmptyPage } from "../pages/EmptyPage.tsx";
import { ClientRosterPage } from "../pages/clients/ClientRosterPage.tsx";
import { TeamUsersPage } from "../pages/firm/TeamUsersPage.tsx";
import { DeductionsPage } from "../pages/deductions/DeductionsPage.tsx";
import { QuarterlyPaymentsPage } from "../pages/quarterlyPayments/QuarterlyPaymentsPage.tsx";
import { IncomePage } from "../pages/income/IncomePage.tsx";
import { PlanCycle } from "../pages/taxPlanCycle/PlanCycle.tsx";
import { MyTaxPlanPage } from "../pages/clientPortal/MyTaxPlanPage.tsx";
import { ActionItemsPage } from "../pages/clientPortal/ActionItemsPage.tsx";

import { AuthBoundary } from "../auth/AuthBoundary.tsx";
import { MfaChallengePage } from "../pages/auth/MfaChallengePage.tsx";
import { PasswordResetConfirmationPage } from "../pages/auth/PasswordResetConfirmationPage.tsx";
import { PasswordResetPage } from "../pages/auth/PasswordResetPage.tsx";
import { SignInPage } from "../pages/auth/SignInPage.tsx";
import { ScenarioPlannerPage } from "../pages/scenarios/ScenarioPlannerPage.tsx";
import { DetailsPage } from "../pages/taxPlanCycle/Details.tsx";
import { validateDetailsSearch } from "../pages/taxPlanCycle/detailViewState.ts";
import { useSession } from "../auth/AuthProvider.tsx";
import type { SessionRole } from "../auth/session.ts";
import { validatePlanToolSearch } from "../shared/planToolCase.ts";

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

const adminRoles: readonly SessionRole[] = ["Firm Admin", "TaxPulse Platform Admin"];

function AdminOnlyRoute({ children }: { readonly children: ReactNode }) {
  const { user } = useSession();

  if (user === null || !adminRoles.includes(user.role)) {
    return <Navigate replace to="/" />;
  }

  return <>{children}</>;
}

function ClientOnlyRoute({ children }: { readonly children: ReactNode }) {
  const { user } = useSession();

  if (user?.role !== "Client") {
    return <Navigate replace to="/" />;
  }

  return <>{children}</>;
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

const myTaxPlanRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/my-tax-plan",
  component: () => (
    <ClientOnlyRoute>
      <MyTaxPlanPage />
    </ClientOnlyRoute>
  ),
});

const actionItemsRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/action-items",
  component: () => <ClientOnlyRoute><ActionItemsPage /></ClientOnlyRoute>,
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
  component: ScenarioPlannerPage,
  validateSearch: (search) => validatePlanToolSearch(search),
});

const incomeRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/income",
  component: IncomePage,
  validateSearch: (search) => validatePlanToolSearch(search),
});

const deductionsRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/deductions",
  component: DeductionsPage,
  validateSearch: (search) => validatePlanToolSearch(search),
});

const quarterlyPaymentsRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/quarterly-payments",
  component: QuarterlyPaymentsPage,
  validateSearch: (search) => validatePlanToolSearch(search),
});

const clientsRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/clients",
  component: ClientRosterPage,
});

const firmUsersRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/firm/users",
  component: () => (
    <AdminOnlyRoute>
      <TeamUsersPage />
    </AdminOnlyRoute>
  ),
});

const firmSettingsRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/firm/settings",
  component: EmptyPage,
});

const administrationTenantsUsersRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/administration/tenants-users",
  component: () => (
    <AdminOnlyRoute>
      <EmptyPage />
    </AdminOnlyRoute>
  ),
});

const administrationRolesPermissionsRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/administration/roles-permissions",
  component: () => (
    <AdminOnlyRoute>
      <EmptyPage />
    </AdminOnlyRoute>
  ),
});

const administrationAuditLogRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: "/administration/audit-log",
  component: () => (
    <AdminOnlyRoute>
      <EmptyPage />
    </AdminOnlyRoute>
  ),
});

export const routeTree = rootRoute.addChildren([
  signInRoute,
  mfaChallengeRoute,
  passwordResetRoute,
  passwordResetConfirmationRoute,
  workspaceRoute.addChildren([
    dashboardRoute,
    myTaxPlanRoute,
    actionItemsRoute,
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
