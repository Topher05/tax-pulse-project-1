import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import { createPulseRouter } from "./createPulseRouter.ts";
import { AuthProvider } from "../auth/AuthProvider.tsx";
import "../shared/styles.css";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("TaxPulse UI root element was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={createPulseRouter()} />
    </AuthProvider>
  </StrictMode>,
);
