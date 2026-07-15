import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const connectionString = process.env.DATABASE_URL as string

// Quick sanity check to catch empty variables before the driver crashes
if (!connectionString) {
  console.log("DB failure")
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/typescript/db/schema.ts",
  out: "./src/typescript/db/drizzle-migrations",
  migrations: {
    table: 'tax_pulse_drizzle_migration_log',
  },
  dbCredentials: {
    url: connectionString
  },
  // Debugging support
  verbose: true, // Logs all SQL queries
  strict: true,  // Forces explicit confirmation
});
