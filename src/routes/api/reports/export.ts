import { createFileRoute } from "@tanstack/react-router";
import { reportInput, getReportFn } from "@/server/report.functions";

function csvCell(value: string | number) { const text = String(value); return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
export const Route = createFileRoute("/api/reports/export")({ server: { handlers: { GET: async ({ request }) => {
  const url = new URL(request.url); const parsed = reportInput.safeParse({ from: url.searchParams.get("from"), to: url.searchParams.get("to"), granularity: url.searchParams.get("granularity") });
  if (!parsed.success) return Response.json({ error: "Invalid report range" }, { status: 400 });
  try {
    const report = await getReportFn({ data: parsed.data });
    const rows: (string | number)[][] = [["section", "date_or_name", "minutes"], ...report.daily.map((item) => ["daily", item.date, item.minutes]), ...report.byProject.map((item) => ["project", item.name, item.minutes]), ...report.bySkill.map((item) => ["skill", item.name, item.minutes]), ...report.byTag.map((item) => ["tag", item.name, item.minutes])];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="rayo-report-${parsed.data.from}-${parsed.data.to}.csv"`, "Cache-Control": "private, no-store" } });
  } catch (error) { return Response.json({ error: error instanceof Error && error.message === "UNAUTHORIZED" ? "Unauthorized" : "Could not export report" }, { status: error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500 }); }
} } } });
