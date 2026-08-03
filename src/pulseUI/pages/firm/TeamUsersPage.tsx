import { Building2, Clock3, Mail, UserPlus, Users } from "lucide-react";

import styles from "./TeamUsersPage.module.css";
import { MetricCard } from "../../components/MetricCard.tsx";
import { PanelCard } from "../../components/PanelCard.tsx";
import { StatusPill } from "../../components/StatusPill.tsx";

export type FirmUserRole = "Firm Admin" | "Advisor" | "Operations" | "Analyst";
export type FirmUserStatus = "Active" | "Inactive";

export type RelativeLastLogin =
  | { kind: "minutes"; value: number }
  | { kind: "hours"; value: number }
  | { kind: "today" }
  | { kind: "days"; value: number }
  | { kind: "date"; value: string };

export interface FirmUserRow {
  id: string;
  name: string;
  email: string;
  role: FirmUserRole;
  status: FirmUserStatus;
  lastLogin: RelativeLastLogin;
}

export interface TeamUsersScreenProps {
  users: readonly FirmUserRow[];
}

const previewUsers: readonly FirmUserRow[] = [
  {
    id: "usr-jordan-lee",
    name: "Jordan Lee",
    email: "jordan.lee@cohenadvisory.com",
    role: "Firm Admin",
    status: "Active",
    lastLogin: { kind: "today" },
  },
  {
    id: "usr-maya-reed",
    name: "Maya Reed",
    email: "maya.reed@cohenadvisory.com",
    role: "Advisor",
    status: "Active",
    lastLogin: { kind: "hours", value: 2 },
  },
  {
    id: "usr-ava-patel",
    name: "Ava Patel",
    email: "ava.patel@cohenadvisory.com",
    role: "Operations",
    status: "Inactive",
    lastLogin: { kind: "minutes", value: 5 },
  },
  {
    id: "usr-noah-chen",
    name: "Noah Chen",
    email: "noah.chen@cohenadvisory.com",
    role: "Analyst",
    status: "Inactive",
    lastLogin: { kind: "days", value: 1 },
  },
  {
    id: "usr-zoe-martin",
    name: "Zoe Martin",
    email: "zoe.martin@cohenadvisory.com",
    role: "Advisor",
    status: "Active",
    lastLogin: { kind: "minutes", value: 18 },
  },
  {
    id: "usr-ethan-brooks",
    name: "Ethan Brooks",
    email: "ethan.brooks@cohenadvisory.com",
    role: "Operations",
    status: "Active",
    lastLogin: { kind: "hours", value: 5 },
  },
  {
    id: "usr-sophia-chen",
    name: "Sophia Chen",
    email: "sophia.chen@cohenadvisory.com",
    role: "Analyst",
    status: "Inactive",
    lastLogin: { kind: "days", value: 3 },
  },
  {
    id: "usr-liam-wright",
    name: "Liam Wright",
    email: "liam.wright@cohenadvisory.com",
    role: "Advisor",
    status: "Active",
    lastLogin: { kind: "today" },
  },
  {
    id: "usr-nora-patel",
    name: "Nora Patel",
    email: "nora.patel@cohenadvisory.com",
    role: "Operations",
    status: "Inactive",
    lastLogin: { kind: "hours", value: 23 },
  },
  {
    id: "usr-olivia-ross",
    name: "Olivia Ross",
    email: "olivia.ross@cohenadvisory.com",
    role: "Firm Admin",
    status: "Active",
    lastLogin: { kind: "hours", value: 1 },
  },
  {
    id: "usr-marcus-ford",
    name: "Marcus Ford",
    email: "marcus.ford@cohenadvisory.com",
    role: "Analyst",
    status: "Inactive",
    lastLogin: { kind: "date", value: "Jun 28, 2026" },
  },
  {
    id: "usr-emma-cole",
    name: "Emma Cole",
    email: "emma.cole@cohenadvisory.com",
    role: "Advisor",
    status: "Active",
    lastLogin: { kind: "minutes", value: 42 },
  },
] as const;

function formatCountLabel(value: number, singular: string, plural: string): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

function formatRelativeLastLogin(lastLogin: RelativeLastLogin): string {
  switch (lastLogin.kind) {
    case "minutes":
      return `${lastLogin.value} min ago`;
    case "hours":
      return `${lastLogin.value} hour${lastLogin.value === 1 ? "" : "s"} ago`;
    case "today":
      return "Today";
    case "days":
      return `${lastLogin.value} day${lastLogin.value === 1 ? "" : "s"} ago`;
    case "date":
      return lastLogin.value;
    default: {
      const exhaustiveCheck: never = lastLogin;
      return exhaustiveCheck;
    }
  }
}

function getRoleTone(): "info" {
  return "info";
}

function getStatusTone(status: FirmUserStatus): "success" | "warning" {
  return status === "Active" ? "success" : "warning";
}

export function TeamUsersScreen({ users }: TeamUsersScreenProps) {
  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.status === "Active").length;
  const pendingInvites = users.filter((user) => user.status === "Inactive").length;
  const rolesInUse = new Set(users.map((user) => user.role)).size;

  return (
    <div className={styles.page}>
      <section className={styles.toolbar}>
        <div className={styles.toolbarCopy}>
          <h2 className={styles.title}>Team &amp; Users</h2>
          <p className={styles.lead}>
            Manage your firm&apos;s staff and client portal accounts &amp; invite users and assign
            their role within your tenant.
          </p>
        </div>

        <button className={styles.primaryAction} type="button" disabled>
          <UserPlus aria-hidden="true" />
          Invite User
        </button>
      </section>

      <section className={styles.metricGrid} aria-label="Team summary">
        <MetricCard
          label="Total users"
          value={formatCountLabel(totalUsers, "user", "users")}
          caption="Roster records shown in this scaffold"
          tone="indigo"
          icon={<Users aria-hidden="true" />}
        />
        <MetricCard
          label="Active users"
          value={formatCountLabel(activeUsers, "active user", "active users")}
          caption="Users currently active in the tenant"
          tone="green"
          icon={<Clock3 aria-hidden="true" />}
        />
        <MetricCard
          label="Pending invites"
          value={formatCountLabel(pendingInvites, "pending invite", "pending invites")}
          caption="Users waiting to accept access"
          tone="amber"
          icon={<Mail aria-hidden="true" />}
        />
        <MetricCard
          label="Roles in use"
          value={String(rolesInUse)}
          caption="Distinct firm roles visible in the roster"
          tone="cyan"
          icon={<Building2 aria-hidden="true" />}
        />
      </section>

      <PanelCard title="User roster" description="The table remains the main content area for this scaffold.">
        <div className={styles.tableWrap}>
          {/* TODO: restrict this screen to Firm Admin and TaxPulse Platform Admin roles once role claims are available. */}
          <table className={styles.table} aria-label="Firm team and users roster">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className={styles.nameCell}>{user.name}</td>
                  <td className={styles.emailCell}>{user.email}</td>
                  <td>
                    <StatusPill tone={getRoleTone()}>{user.role}</StatusPill>
                  </td>
                  <td>
                    <StatusPill tone={getStatusTone(user.status)}>{user.status}</StatusPill>
                  </td>
                  <td className={styles.lastLoginCell}>{formatRelativeLastLogin(user.lastLogin)}</td>
                  <td className={styles.actionCell}>
                    <button className={styles.rowAction} type="button" disabled>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelCard>
    </div>
  );
}

export function TeamUsersPage() {
  return <TeamUsersScreen users={previewUsers} />;
}
