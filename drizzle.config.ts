import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/typescript/db/schema.ts",
  out: "./drizzle",
});
