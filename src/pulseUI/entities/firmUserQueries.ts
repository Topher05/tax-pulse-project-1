import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { useAuthenticatedFetch } from "../auth/authenticatedFetch.ts";
import { caseApiGetJson, caseApiSendJson } from "../shared/caseApi.ts";
import type {
  FirmUserAssignableRole,
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
const firmUserAssignableRoleSchema = z.enum([
  "Firm Admin",
  "Advisor",
  "Client",
]);
const firmUserStatusSchema = z.enum(["Active", "Inactive"]);
const firmUserApiRowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.email(),
  role: firmUserRoleSchema,
  status: firmUserStatusSchema,
  lastLoginAt: z.iso.datetime().nullable(),
});
const firmUsersResponseSchema = z.array(firmUserApiRowSchema);

type FirmUserApiRow = z.infer<typeof firmUserApiRowSchema>;

export const firmUsersQueryKey = ["firmUsers"] as const;

const firmUserRoleUpdateRequestSchema = z.object({
  role: firmUserAssignableRoleSchema,
});

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

export interface FirmUserRoleUpdateInput {
  userId: string;
  role: FirmUserAssignableRole;
}

export async function updateFirmUserRole(
  input: FirmUserRoleUpdateInput,
  fetcher?: typeof fetch,
): Promise<FirmUserRow> {
  const body = firmUserRoleUpdateRequestSchema.parse({ role: input.role });
  const payload = await caseApiSendJson<unknown>(
    `/v1/firm/users/${input.userId}/role`,
    {
      method: "PATCH",
      body,
    },
    fetcher,
  );

  return toFirmUserRow(firmUserApiRowSchema.parse(payload));
}

export function useFirmUsersQuery() {
  const authenticatedFetch = useAuthenticatedFetch();

  return useQuery({
    queryKey: firmUsersQueryKey,
    queryFn: () => fetchFirmUsers(authenticatedFetch),
  });
}

export function useUpdateFirmUserRoleMutation() {
  const authenticatedFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: FirmUserRoleUpdateInput) => updateFirmUserRole(input, authenticatedFetch),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: firmUsersQueryKey });
    },
  });
}
