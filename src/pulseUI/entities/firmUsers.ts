export type FirmUserRole = "Firm Admin" | "Advisor" | "Client" | "TaxPulse Platform Admin";
export type FirmUserAssignableRole = Exclude<FirmUserRole, "TaxPulse Platform Admin">;
export type FirmUserStatus = "Active" | "Inactive";

export const firmUserAssignableRoles = [
  "Firm Admin",
  "Advisor",
  "Client",
] as const satisfies readonly FirmUserAssignableRole[];

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
