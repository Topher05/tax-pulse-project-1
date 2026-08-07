export type FirmUserRole = "Firm Admin" | "Advisor" | "Client" | "TaxPulse Platform Admin";
export type FirmUserStatus = "Active" | "Inactive";

export const firmUserRoles = [
  "Firm Admin",
  "Advisor",
  "Client",
  "TaxPulse Platform Admin",
] as const satisfies readonly FirmUserRole[];

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
