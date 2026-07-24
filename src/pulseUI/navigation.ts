import type { ComponentType } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Calculator,
  CalendarClock,
  FileText,
  FolderKanban,
  ListChecks,
  Settings,
  Users,
} from "lucide-react";

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

export const pulseNavGroups: readonly PulseNavGroup[] = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", path: "/", icon: BarChart3 },
      { label: "Plan Cycle Queue", path: "/plan-cycles", icon: ListChecks },
      { label: "Client Roster", path: "/clients", icon: Users },
      { label: "Plan Cycle Detail", path: "/plan-cycles/$caseId", icon: FolderKanban },
    ],
  },
  {
    label: "Plan Tools",
    items: [
      { label: "Scenario Planner", path: "/scenarios", icon: Calculator },
      { label: "Income", path: "/income", icon: BriefcaseBusiness },
      { label: "Deductions", path: "/deductions", icon: FileText },
      { label: "Quarterly Payments", path: "/quarterly-payments", icon: CalendarClock },
    ],
  },
  {
    label: "Firm",
    items: [
      { label: "Team & Users", path: "/firm/users", icon: Building2 },
      { label: "Firm Settings", path: "/firm/settings", icon: Settings },
    ],
  },
] as const;

export const getViewTitle = (pathname: string): string => {
  if (pathname.startsWith("/plan-cycles/") && pathname !== "/plan-cycles") {
    return "Plan Cycle Detail";
  }

  for (const group of pulseNavGroups) {
    const item = group.items.find((navItem) => navItem.path === pathname);

    if (item !== undefined) {
      return item.label;
    }
  }

  return "Dashboard";
};
