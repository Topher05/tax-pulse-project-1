import { Building2, CheckCircle2, Mail, UserPlus, UsersRound, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { MetricCard } from "../../components/MetricCard.tsx";
import { PanelCard } from "../../components/PanelCard.tsx";
import { StatusPill } from "../../components/StatusPill.tsx";
import {
  type FirmUserRole,
  type FirmUserStatus,
  type RelativeLastLogin,
} from "../../entities/firmUsers.ts";
import type {
  PlatformTenantUserCreateInput,
  PlatformTenantUsersTenant,
} from "../../entities/platformAdministration.ts";
import {
  useCreatePlatformTenantUserMutation,
  usePlatformTenantUsersQuery,
} from "../../entities/platformAdministrationQueries.ts";
import styles from "./AllTenantsUsersPage.module.css";

const userStatuses = ["Active", "Inactive"] as const satisfies readonly FirmUserStatus[];
const platformUserRoles = [
  "Firm Admin",
  "Advisor",
  "Client",
  "TaxPulse Platform Admin",
] as const satisfies readonly FirmUserRole[];

export interface AllTenantsUsersScreenProps {
  tenants: readonly PlatformTenantUsersTenant[];
  invitePending?: boolean;
  onInviteUser(input: PlatformTenantUserCreateInput): void;
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

function createInitialInvite(tenantId: string): PlatformTenantUserCreateInput {
  return {
    tenantId,
    displayName: "",
    email: "",
    role: "Client",
    status: "Inactive",
  };
}

export function AllTenantsUsersScreen({
  tenants,
  invitePending = false,
  onInviteUser,
}: AllTenantsUsersScreenProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const firstTenantId = tenants[0]?.id ?? "";
  const [invite, setInvite] = useState<PlatformTenantUserCreateInput>(
    createInitialInvite(firstTenantId),
  );
  const totalUsers = tenants.reduce((count, tenant) => count + tenant.users.length, 0);
  const activeUsers = tenants.reduce(
    (count, tenant) => count + tenant.users.filter((user) => user.status === "Active").length,
    0,
  );
  const clientUsers = tenants.reduce(
    (count, tenant) => count + tenant.users.filter((user) => user.role === "Client").length,
    0,
  );
  const activeTenants = tenants.filter((tenant) => tenant.isActive).length;
  const canSubmit = invite.tenantId !== "" && invite.displayName.trim() !== "" && invite.email.trim() !== "";
  const tenantOptions = useMemo(
    () => tenants.map((tenant) => ({ id: tenant.id, name: tenant.name })),
    [tenants],
  );

  useEffect(() => {
    if (firstTenantId !== "" && invite.tenantId === "") {
      setInvite((current) => ({ ...current, tenantId: firstTenantId }));
    }
  }, [firstTenantId, invite.tenantId]);

  const closeInvite = () => {
    setInviteOpen(false);
    setInvite(createInitialInvite(firstTenantId));
  };

  const handleInviteSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit || invitePending) {
      return;
    }

    onInviteUser({
      ...invite,
      displayName: invite.displayName.trim(),
      email: invite.email.trim(),
    });
    closeInvite();
  };

  return (
    <div className={styles.page}>
      <section className={styles.toolbar}>
        <div className={styles.toolbarCopy}>
          <h2 className={styles.title}>All Tenants &amp; Users</h2>
          <p className={styles.lead}>
            Review every tenant and create users in the correct tenant without switching sessions.
          </p>
        </div>

        <button
          className={styles.primaryAction}
          type="button"
          disabled={tenants.length === 0}
          onClick={() => {
            setInviteOpen(true);
          }}
        >
          <UserPlus aria-hidden="true" />
          Invite User
        </button>
      </section>

      <section className={styles.metricGrid} aria-label="Platform tenant summary">
        <MetricCard
          label="Tenants"
          value={formatCountLabel(tenants.length, "tenant", "tenants")}
          caption={`${activeTenants} active workspaces`}
          tone="indigo"
          icon={<Building2 aria-hidden="true" />}
        />
        <MetricCard
          label="Users"
          value={formatCountLabel(totalUsers, "user", "users")}
          caption="Across all tenant rosters"
          tone="cyan"
          icon={<UsersRound aria-hidden="true" />}
        />
        <MetricCard
          label="Active users"
          value={formatCountLabel(activeUsers, "active user", "active users")}
          caption="Accounts currently active"
          tone="green"
          icon={<CheckCircle2 aria-hidden="true" />}
        />
        <MetricCard
          label="Client accounts"
          value={formatCountLabel(clientUsers, "client", "clients")}
          caption="Client portal users in tenant rosters"
          tone="amber"
          icon={<Mail aria-hidden="true" />}
        />
      </section>

      <div className={styles.tenantStack}>
        {tenants.map((tenant) => (
          <PanelCard
            key={tenant.id}
            title={tenant.name}
            description={`${tenant.loginSlug} - ${formatCountLabel(
              tenant.users.length,
              "user",
              "users",
            )}`}
          >
            <div className={styles.tableWrap}>
              <table className={styles.table} aria-label={`${tenant.name} users`}>
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
                  {tenant.users.map((user) => (
                    <tr key={user.id}>
                      <td className={styles.nameCell}>{user.name}</td>
                      <td className={styles.emailCell}>{user.email}</td>
                      <td>{user.role}</td>
                      <td>
                        <StatusPill tone={getStatusTone(user.status)}>{user.status}</StatusPill>
                      </td>
                      <td className={styles.lastLoginCell}>
                        {formatRelativeLastLogin(user.lastLogin)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PanelCard>
        ))}
      </div>

      {inviteOpen ? (
        <div className={styles.modalOverlay} role="presentation" onClick={closeInvite}>
          <form
            className={styles.modal}
            aria-label="Invite tenant user"
            onSubmit={handleInviteSubmit}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Invite User</h3>
              <button
                className={styles.iconButton}
                type="button"
                aria-label="Close invite user form"
                onClick={closeInvite}
              >
                <X aria-hidden="true" />
              </button>
            </div>

            <label className={styles.field}>
              <span>Tenant</span>
              <select
                value={invite.tenantId}
                onChange={(event) => {
                  const tenantId = event.currentTarget.value;
                  setInvite((current) => ({ ...current, tenantId }));
                }}
              >
                {tenantOptions.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Name</span>
              <input
                value={invite.displayName}
                onChange={(event) => {
                  const displayName = event.currentTarget.value;
                  setInvite((current) => ({
                    ...current,
                    displayName,
                  }));
                }}
              />
            </label>

            <label className={styles.field}>
              <span>Email</span>
              <input
                type="email"
                value={invite.email}
                onChange={(event) => {
                  const email = event.currentTarget.value;
                  setInvite((current) => ({ ...current, email }));
                }}
              />
            </label>

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Role</span>
                <select
                  value={invite.role}
                  onChange={(event) => {
                    const role = event.currentTarget.value as FirmUserRole;
                    setInvite((current) => ({
                      ...current,
                      role,
                    }));
                  }}
                >
                  {platformUserRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>Status</span>
                <select
                  value={invite.status}
                  onChange={(event) => {
                    const status = event.currentTarget.value as FirmUserStatus;
                    setInvite((current) => ({
                      ...current,
                      status,
                    }));
                  }}
                >
                  {userStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.secondaryAction} type="button" onClick={closeInvite}>
                Cancel
              </button>
              <button className={styles.primaryAction} type="submit" disabled={!canSubmit || invitePending}>
                Create User
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export function AllTenantsUsersPage() {
  const tenantsQuery = usePlatformTenantUsersQuery();
  const createUserMutation = useCreatePlatformTenantUserMutation();

  return (
    <AllTenantsUsersScreen
      tenants={tenantsQuery.data ?? []}
      invitePending={createUserMutation.isPending}
      onInviteUser={(input) => {
        createUserMutation.mutate(input);
      }}
    />
  );
}
