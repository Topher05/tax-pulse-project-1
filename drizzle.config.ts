import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const placeholder = "Placeholder fallback: conn not found";
const connectionString = process.env.DATABASE_URL || placeholder;

// Quick sanity check to catch empty variables before the driver crashes
if (connectionString === placeholder) {
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
});
