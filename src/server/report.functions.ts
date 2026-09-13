import { and, eq, gte, lte } from "drizzle-orm";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDb } from "@/db/index";
import { focusSessionSkills, focusSessions, focusSessionTags, projects, skills, tags, tasks, userPreferences } from "@/db/schema";
import type { ProductivityReport } from "@/features/workspace/types";
import { calculateMomentum, localDateKey } from "@/features/reports/metrics";
import { requireWorkspace } from "./session.functions";

export const reportInput = z.object({ from: z.string().date(), to: z.string().date(), granularity: z.enum(["week", "month"]) });
export const getReportFn = createServerFn({ method: "GET" }).validator(reportInput).handler(async ({ data }): Promise<ProductivityReport> => {
  const { workspace } = await requireWorkspace(); const db = getDb();
  const [preference] = await db.select().from(userPreferences).where(eq(userPreferences.workspaceId, workspace.id)).limit(1);
  const from = new Date(`${data.from}T00:00:00.000Z`); const to = new Date(`${data.to}T23:59:59.999Z`);
  const momentumFrom = new Date(); momentumFrom.setUTCDate(momentumFrom.getUTCDate() - 35);
  const [sessionRows, momentumRows, projectRows, skillRows, tagRows, skillLinks, tagLinks, taskRows] = await Promise.all([
    db.select().from(focusSessions).where(and(eq(focusSessions.workspaceId, workspace.id), eq(focusSessions.status, "completed"), gte(focusSessions.endedAt, from), lte(focusSessions.endedAt, to))),
    db.select().from(focusSessions).where(and(eq(focusSessions.workspaceId, workspace.id), eq(focusSessions.status, "completed"), gte(focusSessions.endedAt, momentumFrom))),
    db.select().from(projects).where(eq(projects.workspaceId, workspace.id)), db.select().from(skills).where(eq(skills.workspaceId, workspace.id)), db.select().from(tags).where(eq(tags.workspaceId, workspace.id)),
    db.select().from(focusSessionSkills), db.select().from(focusSessionTags),
    db.select().from(tasks).where(and(eq(tasks.workspaceId, workspace.id), lte(tasks.createdAt, to))),
  ]);
  const timezone = preference?.timezone ?? "America/Bahia";
  const sum = (rows: { actualSeconds: number | null }[]) => Math.round(rows.reduce((total, row) => total + (row.actualSeconds ?? 0), 0) / 60);
  const accumulate = (pairs: { id: string; name: string; seconds: number }[]) => [...pairs.reduce((map, item) => map.set(item.id, { id: item.id, name: item.name, minutes: (map.get(item.id)?.minutes ?? 0) + item.seconds / 60 }), new Map<string, { id: string; name: string; minutes: number }>()).values()].map((item) => ({ ...item, minutes: Math.round(item.minutes) })).sort((a, b) => b.minutes - a.minutes);
  const sessionMap = new Map(sessionRows.map((row) => [row.id, row]));
  const projectMap = new Map(projectRows.map((row) => [row.id, row.name])); const skillMap = new Map(skillRows.map((row) => [row.id, row.name])); const tagMap = new Map(tagRows.map((row) => [row.id, row.name]));
  const dailyMap = new Map<string, number>(); sessionRows.forEach((row) => { const key = localDateKey(row.endedAt!, timezone); dailyMap.set(key, (dailyMap.get(key) ?? 0) + (row.actualSeconds ?? 0) / 60); });
  const trend = new Map<string, { created: number; completed: number }>(); taskRows.forEach((task) => {
    if (task.createdAt >= from) { const createdKey = localDateKey(task.createdAt, timezone); const current = trend.get(createdKey) ?? { created: 0, completed: 0 }; current.created += 1; trend.set(createdKey, current); }
    if (task.completedAt && task.completedAt >= from && task.completedAt <= to) { const key = localDateKey(task.completedAt, timezone); const item = trend.get(key) ?? { created: 0, completed: 0 }; item.completed += 1; trend.set(key, item); }
  });
  const momentum = calculateMomentum(momentumRows.map((row) => ({ status: row.status, endedAt: row.endedAt?.toISOString() ?? null })), timezone);
  return {
    range: data, totalMinutes: sum(sessionRows), ...momentum,
    daily: [...dailyMap].map(([date, minutes]) => ({ date, minutes: Math.round(minutes) })).sort((a, b) => a.date.localeCompare(b.date)),
    byProject: accumulate(sessionRows.map((row) => ({ id: row.projectId, name: projectMap.get(row.projectId) ?? "Archived project", seconds: row.actualSeconds ?? 0 }))),
    bySkill: accumulate(skillLinks.filter((link) => sessionMap.has(link.focusSessionId)).map((link) => ({ id: link.skillId, name: skillMap.get(link.skillId) ?? "Archived skill", seconds: (sessionMap.get(link.focusSessionId)?.actualSeconds ?? 0) * link.weight }))),
    byTag: accumulate(tagLinks.filter((link) => sessionMap.has(link.focusSessionId)).map((link) => ({ id: link.tagId, name: tagMap.get(link.tagId) ?? "Archived tag", seconds: (sessionMap.get(link.focusSessionId)?.actualSeconds ?? 0) * link.weight }))),
    taskTrend: [...trend].map(([date, value]) => ({ date, ...value })).sort((a, b) => a.date.localeCompare(b.date)),
  };
});
