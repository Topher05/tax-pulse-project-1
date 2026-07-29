import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";

import { createPulseRouter } from "./createPulseRouter.ts";
import { createPulseQueryClient } from "./queryClient.ts";
import "../shared/styles.css";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("TaxPulse UI root element was not found.");
}

const queryClient = createPulseQueryClient();

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={createPulseRouter()} />
    </QueryClientProvider>
  </StrictMode>,
);
