import { createMemoryHistory, createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.tsx";

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
