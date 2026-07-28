import { createRootRoute, createRoute } from "@tanstack/react-router";

import { AppShell } from "../AppShell.tsx";
import { EmptyRoute } from "./EmptyRoute.tsx";
import { PlanCycleQueuePage } from "../features/planCycleQueue/PlanCycleQueuePage.tsx";

const rootRoute = createRootRoute({
  component: AppShell,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: EmptyRoute,
});

const planCyclesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/plan-cycles",
  component: PlanCycleQueuePage,
});

const planCycleDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/plan-cycles/$caseId",
  component: EmptyRoute,
});

const scenarioPlannerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/scenarios",
  component: EmptyRoute,
});

const incomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/income",
  component: EmptyRoute,
});

const deductionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/deductions",
  component: EmptyRoute,
});

const quarterlyPaymentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/quarterly-payments",
  component: EmptyRoute,
});

const clientsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/clients",
  component: EmptyRoute,
});

const firmUsersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/firm/users",
  component: EmptyRoute,
});

const firmSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/firm/settings",
  component: EmptyRoute,
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
