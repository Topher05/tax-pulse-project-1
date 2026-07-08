import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/typescript/db/schema.ts",
  out: "./src/typescript/db/drizzle-migrations",
  migrations: {
    table: 'tax_pulse_drizzle_migration_log',
  },
  dbCredentials: {
    url: process.env.DATABASE_URL || "placeholder fallback: conn not found",
  },
});
