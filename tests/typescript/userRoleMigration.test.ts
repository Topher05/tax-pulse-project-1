import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import {
  role,
  roleNameEnum,
  user,
  userStatusEnum,
} from "../../src/typescript/db/schema.js";

const drizzleSqlPath = join(process.cwd(), "drizzle", "0001_watery_sister_grimm.sql");
const drizzleSnapshotPath = join(
  process.cwd(),
  "drizzle",
  "meta",
  "0001_snapshot.json",
);

describe("user and role auth tables", () => {
  test("schema exports the auth tables and enums", () => {
    expect(role).toBeDefined();
    expect(user).toBeDefined();
    expect(roleNameEnum.enumValues).toEqual([
      "Firm Admin",
      "Advisor",
      "Client",
      "TaxPulse Platform Admin",
    ]);
    expect(userStatusEnum.enumValues).toEqual(["invited", "active", "disabled"]);
  });

  test("generated drizzle SQL includes the auth tables and constraints", () => {
    expect(existsSync(drizzleSqlPath)).toBe(true);

    const migrationSql = readFileSync(drizzleSqlPath, "utf8");

    expect(migrationSql).toContain('CREATE TYPE "public"."user_role_name" AS ENUM');
    expect(migrationSql).toContain('CREATE TYPE "public"."user_status" AS ENUM');
    expect(migrationSql).toContain('CREATE TABLE "role"');
    expect(migrationSql).toContain('CREATE TABLE "user"');
    expect(migrationSql).toContain(
      'FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")',
    );
    expect(migrationSql).toContain(
      'FOREIGN KEY ("role_id") REFERENCES "public"."role"("id")',
    );
    expect(migrationSql).toContain('CREATE UNIQUE INDEX "role_role_key"');
    expect(migrationSql).toContain('CREATE UNIQUE INDEX "user_tenant_id_email_key"');
  });

  test("generated drizzle snapshot reflects the auth tables and enum types", () => {
    expect(existsSync(drizzleSnapshotPath)).toBe(true);

    const snapshot = JSON.parse(readFileSync(drizzleSnapshotPath, "utf8")) as {
      tables?: Record<string, { columns?: Record<string, { type?: string }> }>;
      enums?: Record<string, { values?: string[] }>;
    };

    expect(snapshot.tables?.["public.role"]).toBeDefined();
    expect(snapshot.tables?.["public.user"]).toBeDefined();
    expect(snapshot.tables?.["public.role"]?.columns?.role?.type).toBe("user_role_name");
    expect(snapshot.tables?.["public.user"]?.columns?.status?.type).toBe("user_status");
    expect(snapshot.enums?.user_role_name?.values).toEqual([
      "Firm Admin",
      "Advisor",
      "Client",
      "TaxPulse Platform Admin",
    ]);
    expect(snapshot.enums?.user_status?.values).toEqual([
      "invited",
      "active",
      "disabled",
    ]);
  });
});
