import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";

import {
  RegistrationEmailConflictError,
  type RegistrationAccountInsert,
  type RegistrationAccountResponse,
  type RegistrationAccountStore,
} from "../domain/authRegistration.js";
import {
  credential,
  roles,
  users,
  userStatus,
} from "../../../shared/database/schema.js";

const tenantEmailUniqueConstraint = "users_tenant_id_email_key";

interface PostgresError {
  code?: string;
  constraint?: string;
  cause?: unknown;
}

function isTenantEmailConflict(error: unknown): boolean {
  let candidate: unknown = error;
  const visited = new Set<object>();

  while (candidate && typeof candidate === "object") {
    if (visited.has(candidate)) {
      return false;
    }
    visited.add(candidate);

    const postgresError = candidate as PostgresError;
    if (
      postgresError.code === "23505" &&
      postgresError.constraint === tenantEmailUniqueConstraint
    ) {
      return true;
    }

    candidate = postgresError.cause;
  }

  return false;
}

function displayNameFromEmail(email: string): string {
  return email.split("@")[0]?.trim() || email;
}

export function createRegistrationAccountRepository(
  client: Client,
): RegistrationAccountStore {
  const db = drizzle(client);

  return {
    async createRegistrationAccount(
      input: RegistrationAccountInsert,
    ): Promise<RegistrationAccountResponse> {
      try {
        return await db.transaction(async (transaction) => {
          const [roleRow, statusRow] = await Promise.all([
            transaction
              .select({ id: roles.id })
              .from(roles)
              .where(eq(roles.role, input.role))
              .limit(1),
            transaction
              .select({ id: userStatus.id })
              .from(userStatus)
              .where(eq(userStatus.status, input.status))
              .limit(1),
          ]);
          const role = roleRow[0];
          const status = statusRow[0];

          if (!role || !status) {
            throw new Error("Registration defaults are not configured in the database.");
          }

          const rows = await transaction
            .insert(users)
            .values({
              id: input.id,
              tenantId: input.tenantId,
              email: input.email,
              displayName: displayNameFromEmail(input.email),
              roleId: role.id,
              statusId: status.id,
            })
            .returning({
              id: users.id,
              tenant_id: users.tenantId,
              email: users.email,
            });
          const account = rows[0];

          if (!account) {
            throw new Error("User insert did not return an account row.");
          }

          await transaction.insert(credential).values({
            id: input.credentialId,
            userId: account.id,
            passwordHash: input.passwordHash,
          });

          return {
            ...account,
            role: input.role,
            status: input.status,
          };
        });
      } catch (error) {
        if (isTenantEmailConflict(error)) {
          throw new RegistrationEmailConflictError();
        }

        throw error;
      }
    },
  };
}
