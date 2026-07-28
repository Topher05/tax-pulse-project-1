import { createRootRoute, createRoute } from "@tanstack/react-router";
import { AppShell } from "../components/AppShell.tsx";
import { EmptyPage } from "../pages/EmptyPage.tsx";
import { DetailsPage } from "../pages/taxPlanCycle/Details.tsx";
import { Queue } from "../pages/taxPlanCycle/Queue.tsx";
import { PlanCycleQueueRoute } from "../planCycles/PlanCycleQueueRoute.tsx";

const rootRoute = createRootRoute({
  component: AppShell,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: EmptyPage,
});

const cyclesQueueRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cycles/queue",
  component: Queue,
});

const cycleDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cycles/$id",
  component: DetailsPage,
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
  cyclesQueueRoute,
  cycleDetailsRoute,
  scenarioPlannerRoute,
  incomeRoute,
  deductionsRoute,
  quarterlyPaymentsRoute,
  clientsRoute,
  firmUsersRoute,
  firmSettingsRoute,
]);
