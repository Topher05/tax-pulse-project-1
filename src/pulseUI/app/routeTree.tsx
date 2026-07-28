import { createRootRoute, createRoute } from "@tanstack/react-router";

import { AppShell } from "../components/AppShell.tsx";
import { EmptyPage } from "../pages/EmptyPage.tsx";
import { Queue } from "../pages/taxPlanCycle/Queue.tsx";

const rootRoute = createRootRoute({
  component: AppShell,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: EmptyPage,
});

const planCyclesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/plan-cycles",
  component: Queue,
});

const planCycleDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/plan-cycles/$caseId",
  component: EmptyPage,
});

const scenarioPlannerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/scenarios",
  component: EmptyPage,
});

const incomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/income",
  component: EmptyPage,
});

const deductionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/deductions",
  component: EmptyPage,
});

const quarterlyPaymentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/quarterly-payments",
  component: EmptyPage,
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

export const routeTree = rootRoute.addChildren([
  dashboardRoute,
  planCyclesRoute,
  planCycleDetailRoute,
  scenarioPlannerRoute,
  incomeRoute,
  deductionsRoute,
  quarterlyPaymentsRoute,
  clientsRoute,
  firmUsersRoute,
  firmSettingsRoute,
]);
