import { z } from "zod";

export const expectedUserColumns = [
  "id",
  "tenant_id",
  "email",
  "role_id",
  "status_id",
  "display_name",
  "last_login_at",
];
export const expectedUserColumnTypes = {
  id: "uuid",
  tenant_id: "uuid",
  email: "text",
  role_id: "integer",
  status_id: "integer",
  display_name: "text",
  last_login_at: "timestamp with time zone",
} as const;

export const userRows = [
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
    tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
    email: "alex@example.com",
    displayName: "Alex Rivera",
    roleId: 1,
    statusId: 1,
    lastLoginAt: null,
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d62",
    tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d02",
    email: "brianna@example.com",
    displayName: "Brianna Cole",
    roleId: 2,
    statusId: 2,
    lastLoginAt: new Date("2026-08-05T14:30:00Z"),
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d63",
    tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d03",
    email: "casey@example.com",
    displayName: "Casey Morgan",
    roleId: 3,
    statusId: 1,
    lastLoginAt: null,
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d64",
    tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d04",
    email: "devon@example.com",
    displayName: "Devon Park",
    roleId: 4,
    statusId: 2,
    lastLoginAt: new Date("2026-08-04T19:15:00Z"),
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d65",
    tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d05",
    email: "elliot@example.com",
    displayName: "Elliot Shaw",
    roleId: 2,
    statusId: 3,
    lastLoginAt: new Date("2026-07-29T16:00:00Z"),
  },
] as const;

export const expectedUserRows = userRows.map((row) => ({
  id: row.id,
  tenant_id: row.tenantId,
  email: row.email,
  role_id: row.roleId,
  status_id: row.statusId,
  display_name: row.displayName,
  last_login_at: row.lastLoginAt,
}));

export const userRowSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  email: z.string().email(),
  role_id: z.number().int(),
  status_id: z.number().int(),
  display_name: z.string().min(1),
  last_login_at: z.date().nullable(),
});

export const userRowsSchema = z.array(userRowSchema);
