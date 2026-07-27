import type { ComponentType } from "react";

export type PulseRoutePath =
  | "/"
  | "/plan-cycles"
  | "/plan-cycles/$caseId"
  | "/scenarios"
  | "/income"
  | "/deductions"
  | "/quarterly-payments"
  | "/clients"
  | "/firm/users"
  | "/firm/settings";

export type PulseNavItem = {
  readonly label: string;
  readonly path: PulseRoutePath;
  readonly icon: ComponentType<{ className?: string; "aria-hidden"?: true }>;
};

export type PulseNavGroup = {
  readonly label: "Workspace" | "Plan Tools" | "Firm";
  readonly items: readonly PulseNavItem[];
};
