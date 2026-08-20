import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const connectionString = process.env.DATABASE_URL?.trim();

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is required. Copy .env.example to .env and set DATABASE_URL.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/typescript/shared/database/schema.ts",
  out: "./src/typescript/shared/database/drizzle-migrations",
  dbCredentials: {
    url: connectionString,
  },
  verbose: true,
  strict: true,
});
