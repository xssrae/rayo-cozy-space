import { sql } from "drizzle-orm";
import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@/db/index";

export const Route = createFileRoute("/api/health")({
  server: { handlers: { GET: async () => {
    try {
      await getDb().execute(sql`select 1`);
      return Response.json({ status: "ok" });
    } catch {
      return Response.json({ status: "degraded" }, { status: 503 });
    }
  } } },
});
