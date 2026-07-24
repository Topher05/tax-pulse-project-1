import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

import { AppShell } from "./AppShell.tsx";

function EmptyRoute() {
  return null;
}

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
  component: EmptyRoute,
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

const routeTree = rootRoute.addChildren([
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

export const createPulseRouter = (initialEntries?: readonly string[]) =>
  createRouter({
    routeTree,
    history:
      initialEntries === undefined
        ? undefined
        : createMemoryHistory({ initialEntries: [...initialEntries] }),
  });

const pulseRouter = createPulseRouter();

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof pulseRouter;
  }
}
