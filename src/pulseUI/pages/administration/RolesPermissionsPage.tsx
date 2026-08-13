import type { PlatformPermissionMatrixSection } from "../../entities/platformAdministration.ts";
import { usePlatformRolesPermissionsQuery } from "../../entities/platformAdministrationQueries.ts";
import styles from "./PlatformAdminScreens.module.css";

export interface RolesPermissionsScreenProps {
  sections: readonly PlatformPermissionMatrixSection[];
}

function formatAccess(access: string | null): string {
  return access ?? "-";
}

function getAccessTone(access: string | null): string {
  if (access === "Full") {
    return styles.accessFull ?? "";
  }

  if (access === "Scoped") {
    return styles.accessScoped ?? "";
  }

  if (access === "Edit") {
    return styles.accessEdit ?? "";
  }

  return styles.accessNone ?? "";
}

export function RolesPermissionsScreen({ sections }: RolesPermissionsScreenProps) {
  return (
    <div className={styles.page}>
      <section className={styles.heading}>
        <h2>Roles &amp; Permissions Matrix</h2>
        <p>Each role's access to each feature. Edit in production settings.</p>
      </section>

      {sections.length === 0 ? (
        <section className={styles.statePanel} aria-label="Empty roles and permissions">
          <h3>No permissions configured</h3>
          <p>The platform permission matrix has no rows to display yet.</p>
        </section>
      ) : (
        <div className={styles.sectionStack}>
          {sections.map((section) => (
            <section className={styles.panel} key={section.id}>
              <div className={styles.panelHeader}>
                <h3>{section.title}</h3>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table} aria-label={`${section.title} permissions`}>
                  <thead>
                    <tr>
                      <th>Feature</th>
                      {section.roles.map((role) => (
                        <th key={role}>{role}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map((row) => (
                      <tr key={row.feature}>
                        <td className={styles.featureCell}>{row.feature}</td>
                        {section.roles.map((role) => {
                          const access = row.access[role] ?? null;

                          return (
                            <td className={getAccessTone(access)} key={`${row.feature}-${role}`}>
                              {formatAccess(access)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {section.description ? (
                <p className={styles.sectionNote}>{section.description}</p>
              ) : null}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export function RolesPermissionsPage() {
  const permissionsQuery = usePlatformRolesPermissionsQuery();

  if (permissionsQuery.isPending) {
    return (
      <section className={styles.statePanel} role="status">
        <h2>Loading roles and permissions...</h2>
        <p>Preparing the platform permission matrix.</p>
      </section>
    );
  }

  if (permissionsQuery.isError) {
    return (
      <section className={styles.statePanel} role="alert">
        <h2>Roles and permissions could not load</h2>
        <p>
          {permissionsQuery.error instanceof Error
            ? permissionsQuery.error.message
            : "Permission matrix request failed."}
        </p>
      </section>
    );
  }

  return <RolesPermissionsScreen sections={permissionsQuery.data} />;
}
