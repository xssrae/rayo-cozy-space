import { defineConfig } from "drizzle-kit";
import { loadEnv } from "vite";

const fileEnv = loadEnv(
  process.env.NODE_ENV ?? "development",
  process.cwd(),
  "",
);
const databaseUrl = process.env.DATABASE_URL ?? fileEnv.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is missing. Copy .env.example to .env for local development, or run the Docker Compose stack.",
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl },
  strict: true,
  verbose: true,
});
