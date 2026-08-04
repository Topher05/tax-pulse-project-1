import { createRootRoute, createRoute } from "@tanstack/react-router";
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
import { validatePlanToolSearch } from "../shared/planToolCase.ts";

const rootRoute = createRootRoute({
  component: AppShell,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
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
  component: PlanCycle,
});

const cycleDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cycles/$id",
  component: DetailsPage,
  validateSearch: (search) => validateDetailsSearch(search),
});

const scenarioPlannerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/scenarios",
  component: ScenarioPlannerPage,
  validateSearch: (search) => validatePlanToolSearch(search),
});

const incomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/income",
  component: () => <IncomePage clientId="" taxYear={2026} incomeEvents={[]} />,
});

const deductionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/deductions",
  component: DeductionsPage,
  validateSearch: (search) => validatePlanToolSearch(search),
});

const quarterlyPaymentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/quarterly-payments",
  component: QuarterlyPaymentsPage,
  validateSearch: (search) => validatePlanToolSearch(search),
});

const clientsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/clients",
  component: ClientRosterPage,
});

const firmUsersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/firm/users",
  component: EmptyPage,
});

const firmSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/firm/settings",
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
