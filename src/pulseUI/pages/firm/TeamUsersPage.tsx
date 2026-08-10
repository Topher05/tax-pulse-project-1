import { Building2, Clock3, Mail, UserPlus, Users } from "lucide-react";

import styles from "./TeamUsersPage.module.css";
import { MetricCard } from "../../components/MetricCard.tsx";
import { PanelCard } from "../../components/PanelCard.tsx";
import { StatusPill } from "../../components/StatusPill.tsx";
import { useSession } from "../../auth/AuthProvider.tsx";
import type { SessionRole } from "../../auth/session.ts";
import {
  firmUserAssignableRoles,
  type FirmUserAssignableRole,
  type FirmUserRow,
  type FirmUserStatus,
  type RelativeLastLogin,
} from "../../entities/firmUsers.ts";
import {
  useFirmUsersQuery,
  useUpdateFirmUserRoleMutation,
} from "../../entities/firmUserQueries.ts";

export interface TeamUsersScreenProps {
  users: readonly FirmUserRow[];
  viewerRole: SessionRole;
  onRoleChange(user: FirmUserRow, role: FirmUserAssignableRole): void;
}

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

function getStatusTone(status: FirmUserStatus): "success" | "warning" {
  return status === "Active" ? "success" : "warning";
}

export function TeamUsersScreen({ users, viewerRole, onRoleChange }: TeamUsersScreenProps) {
  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.status === "Active").length;
  const pendingInvites = users.filter((user) => user.status === "Inactive").length;
  const rolesInUse = new Set(users.map((user) => user.role)).size;
  const canAssignRoles = viewerRole === "Firm Admin";

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
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className={styles.nameCell}>{user.name}</td>
                  <td className={styles.emailCell}>{user.email}</td>
                  <td>
                    <label className={styles.roleControlLabel}>
                      <span className={styles.srOnly}>Role for {user.name}</span>
                      <select
                        aria-label={`Role for ${user.name}`}
                        className={styles.roleSelect}
                        disabled={!canAssignRoles || user.role === "TaxPulse Platform Admin"}
                        value={user.role}
                        onChange={(event) => {
                          onRoleChange(user, event.currentTarget.value as FirmUserAssignableRole);
                        }}
                      >
                        {user.role === "TaxPulse Platform Admin" ? (
                          <option value="TaxPulse Platform Admin">TaxPulse Platform Admin</option>
                        ) : null}
                        {firmUserAssignableRoles.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </label>
                  </td>
                  <td>
                    <StatusPill tone={getStatusTone(user.status)}>{user.status}</StatusPill>
                  </td>
                  <td className={styles.lastLoginCell}>{formatRelativeLastLogin(user.lastLogin)}</td>
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
  const firmUsersQuery = useFirmUsersQuery();
  const updateRoleMutation = useUpdateFirmUserRoleMutation();
  const { user } = useSession();

  return (
    <TeamUsersScreen
      users={firmUsersQuery.data ?? []}
      viewerRole={user?.role ?? "Advisor"}
      onRoleChange={(firmUser, role) => {
        updateRoleMutation.mutate({ userId: firmUser.id, role });
      }}
    />
  );
}
