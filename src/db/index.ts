import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let database: ReturnType<typeof drizzle<typeof schema>> | undefined;
export function getDb() {
  if (database) return database;
  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) throw new Error("DATABASE_URL is not configured");

  const client = postgres(connectionString, {
    max: Number(process.env["DATABASE_POOL_SIZE"] ?? 10),
    prepare: false,
  });

  database = drizzle(client, { schema });
  return database;
}
