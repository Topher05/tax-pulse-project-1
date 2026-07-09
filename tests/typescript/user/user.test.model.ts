export const expectedUserColumns = ["id", "tenant_id", "email", "role_id", "status_id"];
export const expectedUserColumnTypes = {
  id: "uuid",
  tenant_id: "uuid",
  email: "text",
  role_id: "integer",
  status_id: "integer",
} as const;

export const userRows = [
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
    tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
    email: "alex@example.com",
    roleId: 1,
    statusId: 1,
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d62",
    tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d02",
    email: "brianna@example.com",
    roleId: 2,
    statusId: 2,
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d63",
    tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d03",
    email: "casey@example.com",
    roleId: 3,
    statusId: 1,
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d64",
    tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d04",
    email: "devon@example.com",
    roleId: 4,
    statusId: 2,
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d65",
    tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d05",
    email: "elliot@example.com",
    roleId: 2,
    statusId: 3,
  },
] as const;

export const expectedUserRows = userRows.map((row) => ({
  id: row.id,
  tenant_id: row.tenantId,
  email: row.email,
  role_id: row.roleId,
  status_id: row.statusId,
}));
