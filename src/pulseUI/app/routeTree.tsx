import { createRootRoute, createRoute } from "@tanstack/react-router";

import { AppShell } from "../components/AppShell.tsx";
import { DashboardPage } from "../pages/dashboard/DashboardPage.tsx";
import { EmptyPage } from "../pages/EmptyPage.tsx";
import { DeductionsPage } from "../pages/deductions/DeductionsPage.tsx";
import { QuarterlyPaymentsPage } from "../pages/quarterlyPayments/QuarterlyPaymentsPage.tsx";
import { PlanCycle } from "../pages/taxPlanCycle/PlanCycle.tsx";
import { ScenarioPlannerPage } from "../pages/scenarios/ScenarioPlannerPage.tsx";
import { DetailsPage } from "../pages/taxPlanCycle/Details.tsx";
import { validateDetailsSearch } from "../pages/taxPlanCycle/detailViewState.ts";

const rootRoute = createRootRoute({
  component: AppShell,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
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
});

const incomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/income",
  component: EmptyPage,
});

const deductionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/deductions",
  component: DeductionsPage,
});

const quarterlyPaymentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/quarterly-payments",
  component: QuarterlyPaymentsPage,
});

const clientsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/clients",
  component: EmptyPage,
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
