# Database Development

The Core Case Service uses PostgreSQL with typed Drizzle schema definitions in
[`src/typescript/shared/database/schema.ts`](../src/typescript/shared/database/schema.ts).
Generated SQL, snapshots, and migration journal metadata live in
[`src/typescript/shared/database/drizzle-migrations`](../src/typescript/shared/database/drizzle-migrations).

Drizzle is the only PostgreSQL migration runner. Applied migrations are recorded in
`drizzle.__drizzle_migrations`.

## Local PostgreSQL

1. Install PostgreSQL 18 with the official installer or a platform package manager.
2. Start PostgreSQL and create a `taxpulse` database.
3. Create a dedicated user with access to that database. Do not use a superuser for the
   application.
4. Copy [`.env.example`](../.env.example) to `.env`.
5. Set `DATABASE_URL` to the local connection string and retain
   `TAXPULSE_LOGIN_BASE_DOMAIN=localhost`.

The full Docker stack provides its own PostgreSQL instance on host port `25432`; see
[Docker and Compose](./docker.md).

## Migration Commands

Apply all generated migrations:

```powershell
npm run db:migrate
```

After changing the Drizzle schema, always generate a named migration with Drizzle Kit:

```powershell
npm run db:gen -- --name migration_name
```

Check migration metadata:

```powershell
npm run db:check
```

Commit the generated SQL, matching snapshot, and `_journal.json` update together. Do not
write a Drizzle migration by hand when changing or adding a migration.

## Synthetic Seed Data

Rebuild the disposable database and load shared synthetic data:

```powershell
npm run seed
```

This command is destructive. It drops both `public` and Drizzle's migration-ledger schema
before replaying every migration and running
[`seed.ts`](../src/typescript/shared/database/seed.ts). Never put real or realistic
taxpayer data in seed files.

## Integration Tests

```powershell
npm run test:integration
```

Docker is required because the integration suite uses a Testcontainers-managed,
pgvector-capable PostgreSQL instance. Drizzle Kit and the seed command both read
`DATABASE_URL` from `.env`.
