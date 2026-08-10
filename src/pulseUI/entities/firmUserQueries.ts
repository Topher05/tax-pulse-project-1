import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { useAuthenticatedFetch } from "../auth/authenticatedFetch.ts";
import { caseApiGetJson } from "../shared/caseApi.ts";
import type {
  FirmUserRole,
  FirmUserRow,
  FirmUserStatus,
  RelativeLastLogin,
} from "./firmUsers.ts";

const firmUserRoleSchema = z.enum([
  "Firm Admin",
  "Advisor",
  "Client",
  "TaxPulse Platform Admin",
]);
const firmUserStatusSchema = z.enum(["Active", "Inactive"]);
const firmUserApiRowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  role: firmUserRoleSchema,
  status: firmUserStatusSchema,
  lastLoginAt: z.string().datetime().nullable(),
});
const firmUsersResponseSchema = z.array(firmUserApiRowSchema);

type FirmUserApiRow = z.infer<typeof firmUserApiRowSchema>;

export const firmUsersQueryKey = ["firmUsers"] as const;

function formatLastLoginDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function toRelativeLastLogin(lastLoginAt: string | null): RelativeLastLogin {
  if (lastLoginAt === null) {
    return { kind: "date", value: "Never" };
  }

  return { kind: "date", value: formatLastLoginDate(lastLoginAt) };
}

function toFirmUserRow(row: FirmUserApiRow): FirmUserRow {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as FirmUserRole,
    status: row.status as FirmUserStatus,
    lastLogin: toRelativeLastLogin(row.lastLoginAt),
  };
}

export async function fetchFirmUsers(fetcher?: typeof fetch): Promise<readonly FirmUserRow[]> {
  const payload = await caseApiGetJson<unknown>("/v1/firm/users", fetcher);
  return firmUsersResponseSchema.parse(payload).map(toFirmUserRow);
}

export function useFirmUsersQuery() {
  const authenticatedFetch = useAuthenticatedFetch();

  return useQuery({
    queryKey: firmUsersQueryKey,
    queryFn: () => fetchFirmUsers(authenticatedFetch),
  });
}
