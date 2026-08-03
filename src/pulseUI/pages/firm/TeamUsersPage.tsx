import { Building2, Clock3, Mail, ShieldCheck, UserPlus, Users } from "lucide-react";

import styles from "./TeamUsersPage.module.css";
import { MetricCard } from "../../components/MetricCard.tsx";
import { PanelCard } from "../../components/PanelCard.tsx";
import { StatusPill } from "../../components/StatusPill.tsx";

export type FirmUserRole = "Firm Admin" | "Advisor" | "Operations" | "Analyst";
export type FirmUserStatus = "Active" | "Invited" | "Disabled";



export interface FirmUserRow {
  id: string;
  name: string;
  email: string;
  role: FirmUserRole;
  status: FirmUserStatus;
  lastLogin: string;
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
    lastLogin: "Today, 8:14 AM",
  },
  {
    id: "usr-maya-reed",
    name: "Maya Reed",
    email: "maya.reed@cohenadvisory.com",
    role: "Advisor",
    status: "Active",
    lastLogin: "Today, 9:03 AM",
  },
  {
    id: "usr-ava-patel",
    name: "Ava Patel",
    email: "ava.patel@cohenadvisory.com",
    role: "Operations",
    status: "Invited",
    lastLogin: "Not yet logged in",
  },
  {
    id: "usr-noah-chen",
    name: "Noah Chen",
    email: "noah.chen@cohenadvisory.com",
    role: "Analyst",
    status: "Disabled",
    lastLogin: "Jun 18, 2026",
  },
] as const;

function formatCountLabel(value: number, singular: string, plural: string): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

function getRoleTone(role: FirmUserRole): "info" | "neutral" {
  return role === "Firm Admin" ? "info" : "neutral";
}

function getStatusTone(status: FirmUserStatus): "success" | "warning" | "danger" {
  if (status === "Active") {
    return "success";
  }

  if (status === "Invited") {
    return "warning";
  }

  return "danger";
}

export function TeamUsersScreen({ users }: TeamUsersScreenProps) {
  const teamSize = users.length;
  const activeUsers = users.filter((user) => user.status === "Active").length;
  const invitedUsers = users.filter((user) => user.status === "Invited").length;
  const roleCount = new Set(users.map((user) => user.role)).size;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Firm Administration</p>
          <h2 className={styles.title}>Team &amp; Users</h2>
          <p className={styles.lead}>
            Scaffolded from the wireframe reference, this view keeps the dark admin shell,
            compact roster density, and indigo accent language from the mockup.
          </p>

          <div className={styles.heroMeta}>
            <StatusPill tone="info">Firm Admin only</StatusPill>
            <span className={styles.heroMetaText}>UI scaffold, no live permissions wiring yet</span>
          </div>
        </div>

        <div className={styles.heroActions}>
          <button className={styles.primaryAction} type="button" disabled>
            <UserPlus aria-hidden="true" />
            Invite teammate
          </button>
          <button className={styles.secondaryAction} type="button" disabled>
            <ShieldCheck aria-hidden="true" />
            Review roles
          </button>
        </div>
      </section>

      <section className={styles.metricGrid} aria-label="Team summary">
        <MetricCard
          label="Team members"
          value={formatCountLabel(teamSize, "member", "members")}
          caption="Roster entries shown in this scaffold"
          tone="indigo"
          icon={<Users aria-hidden="true" />}
        />
        <MetricCard
          label="Active users"
          value={formatCountLabel(activeUsers, "active user", "active users")}
          caption="Currently marked as active in the mock data"
          tone="green"
          icon={<Clock3 aria-hidden="true" />}
        />
        <MetricCard
          label="Pending invites"
          value={formatCountLabel(invitedUsers, "invite", "invites")}
          caption="Invitations waiting on acceptance"
          tone="amber"
          icon={<Mail aria-hidden="true" />}
        />
        <MetricCard
          label="Roles in use"
          value={String(roleCount)}
          caption="Distinct firm roles visible in the roster"
          tone="cyan"
          icon={<Building2 aria-hidden="true" />}
        />
      </section>

      <div className={styles.contentGrid}>
        <PanelCard
          className={styles.rosterCard}
          title="Firm team roster"
          description="Name, email, role, status, and last login are laid out to match the mockup's roster region."
          action={
            <button className={styles.cardAction} type="button" disabled>
              Add user
            </button>
          }
        >
          <div className={styles.tableWrap}>
            <table className={styles.table} aria-label="Firm team roster">
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
                      <StatusPill tone={getRoleTone(user.role)}>{user.role}</StatusPill>
                    </td>
                    <td>
                      <StatusPill tone={getStatusTone(user.status)}>{user.status}</StatusPill>
                    </td>
                    <td className={styles.lastLoginCell}>{user.lastLogin}</td>
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

        <div className={styles.sideStack}>
          <PanelCard
            title="Access model"
            description="A compact note panel for the wireframe's access and role expectations."
          >
            <ul className={styles.noteList}>
              <li>Firm Admins can view the roster and manage role assignments.</li>
              <li>Advisors should see this screen hidden once role gating is wired in.</li>
              <li>Invite and edit controls are present here as disabled UI placeholders only.</li>
            </ul>
          </PanelCard>

          <PanelCard title="Role mix" description="The current scaffold keeps a simple breakdown of visible roles.">
            <div className={styles.mixList}>
              <div className={styles.mixRow}>
                <span className={styles.mixLabel}>Firm Admin</span>
                <span className={styles.mixValue}>
                  {users.filter((user) => user.role === "Firm Admin").length}
                </span>
              </div>
              <div className={styles.mixRow}>
                <span className={styles.mixLabel}>Advisor</span>
                <span className={styles.mixValue}>
                  {users.filter((user) => user.role === "Advisor").length}
                </span>
              </div>
              <div className={styles.mixRow}>
                <span className={styles.mixLabel}>Operations</span>
                <span className={styles.mixValue}>
                  {users.filter((user) => user.role === "Operations").length}
                </span>
              </div>
              <div className={styles.mixRow}>
                <span className={styles.mixLabel}>Analyst</span>
                <span className={styles.mixValue}>
                  {users.filter((user) => user.role === "Analyst").length}
                </span>
              </div>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}

export function TeamUsersPage() {
  return <TeamUsersScreen users={previewUsers} />;
}
