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

export type PulseNavItem = {
  label: string;
  path: string;
  icon: typeof BarChart3;
};

export type PulseNavGroup = {
  label: string;
  items: readonly PulseNavItem[];
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
