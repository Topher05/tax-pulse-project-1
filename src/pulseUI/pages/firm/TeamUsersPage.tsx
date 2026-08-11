import { Building2, Clock3, Mail, RefreshCw, UserPlus, Users } from "lucide-react";

import styles from "./TeamUsersPage.module.css";
import { EmptyState } from "../../components/EmptyState.tsx";
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

type TeamUsersQueryState = "loading" | "error" | "empty" | "data";

export interface TeamUsersScreenProps {
  users: readonly FirmUserRow[];
  errorMessage?: string;
  onRetry?: () => void;
  queryState: TeamUsersQueryState;
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

function TeamUsersLoadingState() {
  const skeletonRows = Array.from({ length: 5 }, (_, index) => index);

  return (
    <PanelCard title="Loading user roster" description="Fetching tenant-scoped user access.">
      <div className={styles.skeletonTable} role="status" aria-label="Loading Team & Users">
        <span className="srOnly">Loading Team & Users</span>
        <div className={styles.skeletonHeader}>
          <span className={styles.skeletonBlock} />
          <span className={styles.skeletonBlock} />
          <span className={styles.skeletonBlock} />
        </div>
        {skeletonRows.map((row) => (
          <div className={styles.skeletonRow} key={row}>
            <span className={styles.skeletonBlock} />
            <span className={styles.skeletonBlock} />
            <span className={styles.skeletonBlock} />
            <span className={styles.skeletonBlock} />
            <span className={styles.skeletonBlock} />
            <span className={styles.skeletonBlock} />
          </div>
        ))}
      </div>
    </PanelCard>
  );
}

function TeamUsersEmptyState() {
  return (
    <EmptyState
      title="No team users yet"
      description="Only the tenant admin is active. Invite advisors or client portal users to build out this workspace."
      icon={<Users />}
    />
  );
}

function TeamUsersErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert">
      <EmptyState
        title="Team users could not load"
        description={message}
        actionLabel="Retry"
        onAction={onRetry}
        icon={<RefreshCw />}
      />
    </div>
  );
}

export function TeamUsersScreen({
  users,
  errorMessage,
  onRetry,
  queryState,
}: TeamUsersScreenProps) {
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

      {queryState === "loading" ? <TeamUsersLoadingState /> : null}
      {queryState === "empty" ? <TeamUsersEmptyState /> : null}
      {queryState === "error" ? (
        <TeamUsersErrorState
          message={errorMessage ?? "Team users request failed."}
          onRetry={onRetry ?? (() => undefined)}
        />
      ) : null}
      {queryState === "data" ? (
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
      ) : null}
    </div>
  );
}

export function TeamUsersPage() {
  const firmUsersQuery = useFirmUsersQuery();
  const users = firmUsersQuery.data ?? [];
  const queryState = firmUsersQuery.isLoading
    ? "loading"
    : firmUsersQuery.isError
      ? "error"
      : users.length > 0
        ? "data"
        : "empty";

  return (
    <TeamUsersScreen
      users={users}
      queryState={queryState}
      errorMessage={
        firmUsersQuery.error instanceof Error ? firmUsersQuery.error.message : "Team users request failed."
      }
      onRetry={() => {
        void firmUsersQuery.refetch();
      }}
    />
  );
}
