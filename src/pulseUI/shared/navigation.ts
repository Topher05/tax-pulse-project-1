import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Calculator,
  CalendarClock,
  ClipboardList,
  CircleCheckBig,
  Percent,
  ShieldCheck,
  Settings,
  FileClock,
  Users,
  UsersRound,
} from "lucide-react";

import type { SessionRole } from "../auth/session.ts";

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
      { label: "Tax Plan Cycle Queue", path: "/cycles/queue", icon: CircleCheckBig },
      { label: "Client Roster", path: "/clients", icon: Users },
    ],
  },
  {
    label: "Plan Tools",
    items: [
      { label: "Scenario Planner", path: "/scenarios", icon: Calculator },
      { label: "Income", path: "/income", icon: BriefcaseBusiness },
      { label: "Deductions & Expenses", path: "/deductions", icon: Percent },
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
  {
    label: "Administration",
    items: [
      { label: "All Tenants & Users", path: "/administration/tenants-users", icon: UsersRound },
      { label: "Roles & Permissions", path: "/administration/roles-permissions", icon: ShieldCheck },
      { label: "Audit Log", path: "/administration/audit-log", icon: FileClock },
    ],
  },
] as const;

const clientPortalNavGroups = [
  {
    label: "Portal",
    items: [{ label: "My Tax Plan", path: "/my-tax-plan", icon: ClipboardList }],
  },
] as const satisfies readonly PulseNavGroup[];

export function getPulseNavGroupsForRole(role: SessionRole | undefined): readonly PulseNavGroup[] {
  return role === "Client" ? clientPortalNavGroups : pulseNavGroups;
}
