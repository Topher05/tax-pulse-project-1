import { createRootRoute, createRoute, redirect } from "@tanstack/react-router";
import { hasPulseAccessToken } from "./authSession.ts";
import { AppShell } from "../components/AppShell.tsx";
import { DashboardPage } from "../pages/dashboard/DashboardPage.tsx";
import { EmptyPage } from "../pages/EmptyPage.tsx";
import { ClientRosterPage } from "../pages/clients/ClientRosterPage.tsx";
import { DeductionsPage } from "../pages/deductions/DeductionsPage.tsx";
import { QuarterlyPaymentsPage } from "../pages/quarterlyPayments/QuarterlyPaymentsPage.tsx";
import { IncomePage } from "../pages/income/IncomePage.tsx";
import { LoginPage } from "../pages/LoginPage.tsx";
import { PlanCycle } from "../pages/taxPlanCycle/PlanCycle.tsx";
import { ScenarioPlannerPage } from "../pages/scenarios/ScenarioPlannerPage.tsx";
import { DetailsPage } from "../pages/taxPlanCycle/Details.tsx";
import { validateDetailsSearch } from "../pages/taxPlanCycle/detailViewState.ts";
// TODO: Implement case ID routing component
import { validatePlanToolSearch } from "../shared/planToolCase.ts";

const rootRoute = createRootRoute({
  component: AppShell,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: requirePulseAuthentication,
  component: DashboardPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const cyclesQueueRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cycles/queue",
  beforeLoad: requirePulseAuthentication,
  component: PlanCycle,
});

const cycleDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cycles/$id",
  beforeLoad: requirePulseAuthentication,
  component: DetailsPage,
  validateSearch: (search) => validateDetailsSearch(search),
});

const scenarioPlannerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/scenarios",
  component: ScenarioPlannerPage,
  beforeLoad: requirePulseAuthentication,
  // TODO: Implement case ID routing component
  // validateSearch: (search) => validatePlanToolSearch(search),
});

const incomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/income",
  beforeLoad: requirePulseAuthentication,
  component: () => <IncomePage clientId="" taxYear={2026} incomeEvents={[]} />,
});

const deductionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/deductions",
  beforeLoad: requirePulseAuthentication,
  component: DeductionsPage,
  // TODO: Implement case ID routing component
  // validateSearch: (search) => validatePlanToolSearch(search),
});

const quarterlyPaymentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/quarterly-payments",
  component: QuarterlyPaymentsPage,
  beforeLoad: requirePulseAuthentication,
  validateSearch: (search) => validatePlanToolSearch(search),
});

const clientsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/clients",
  beforeLoad: requirePulseAuthentication,
  component: ClientRosterPage,
});

const firmUsersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/firm/users",
  beforeLoad: requirePulseAuthentication,
  component: EmptyPage,
});

const firmSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/firm/settings",
  beforeLoad: requirePulseAuthentication,
  component: EmptyPage,
});

const administrationTenantsUsersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/administration/tenants-users",
  component: EmptyPage,
});

const administrationRolesPermissionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/administration/roles-permissions",
  component: EmptyPage,
});

const administrationAuditLogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/administration/audit-log",
  component: EmptyPage,
});

function requirePulseAuthentication() {
  if (!hasPulseAccessToken()) {
    throw redirect({ to: "/login" });
  }
}

export const routeTree = rootRoute.addChildren([
  dashboardRoute,
  loginRoute,
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
]);
