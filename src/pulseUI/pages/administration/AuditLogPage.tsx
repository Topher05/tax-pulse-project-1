import type { ChangeEvent } from "react";
import { useMemo, useState } from "react";

import type { FirmUserRole } from "../../entities/firmUsers.ts";
import type { PlatformAuditLogEntry } from "../../entities/platformAdministration.ts";
import { usePlatformAuditLogQuery } from "../../entities/platformAdministrationQueries.ts";
import styles from "./PlatformAdminScreens.module.css";

const roleFilterOptions = [
  "All Roles",
  "TaxPulse Platform Admin",
  "Firm Admin",
  "Advisor",
  "Client",
] as const;

type RoleFilter = (typeof roleFilterOptions)[number];

export interface AuditLogScreenProps {
  entries: readonly PlatformAuditLogEntry[];
}

function formatAuditDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(value));
}

function isRoleFilter(value: string): value is RoleFilter {
  return roleFilterOptions.some((option) => option === value);
}

function roleMatchesFilter(role: FirmUserRole | null, filter: RoleFilter): boolean {
  return filter === "All Roles" || role === filter;
}

export function AuditLogScreen({ entries }: AuditLogScreenProps) {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("All Roles");
  const filteredEntries = useMemo(
    () => entries.filter((entry) => roleMatchesFilter(entry.role, roleFilter)),
    [entries, roleFilter],
  );

  const handleRoleFilterChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.currentTarget.value;

    if (isRoleFilter(value)) {
      setRoleFilter(value);
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.headingRow}>
        <div className={styles.heading}>
          <h2>Audit Log</h2>
          <p>Track every cross-role and admin action on the platform.</p>
        </div>

        <label className={styles.filterLabel}>
          <span>Role</span>
          <select value={roleFilter} onChange={handleRoleFilterChange}>
            {roleFilterOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className={styles.panel}>
        {entries.length === 0 ? (
          <div className={styles.statePanel} aria-label="Empty audit log">
            <h3>No audit entries recorded</h3>
            <p>Platform-wide audit events will appear here once activity is recorded.</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className={styles.statePanel} aria-label="No audit entries for selected role">
            <h3>No entries for this role</h3>
            <p>Choose a different role filter to review more platform events.</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table} aria-label="Platform audit log">
              <thead>
                <tr>
                  <th>When</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Resource</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className={styles.timeCell}>{formatAuditDate(entry.occurredAt)}</td>
                    <td className={styles.featureCell}>{entry.user}</td>
                    <td>
                      {entry.role ? (
                        <span className={styles.rolePill}>{entry.role}</span>
                      ) : (
                        <span className={styles.accessNone}>-</span>
                      )}
                    </td>
                    <td>{entry.action}</td>
                    <td className={styles.resourceCell}>{entry.resource}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export function AuditLogPage() {
  const auditLogQuery = usePlatformAuditLogQuery();

  if (auditLogQuery.isPending) {
    return (
      <section className={styles.statePanel} role="status">
        <h2>Loading audit log...</h2>
        <p>Gathering platform-wide audit entries.</p>
      </section>
    );
  }

  if (auditLogQuery.isError) {
    return (
      <section className={styles.statePanel} role="alert">
        <h2>Audit log could not load</h2>
        <p>
          {auditLogQuery.error instanceof Error
            ? auditLogQuery.error.message
            : "Audit log request failed."}
        </p>
      </section>
    );
  }

  return <AuditLogScreen entries={auditLogQuery.data} />;
}
