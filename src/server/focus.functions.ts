import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDb } from "@/db/index";
import {
  focusBreaks, focusSessionSkills, focusSessions, focusSessionTags, projectSkills, projectTags, projects, taskSkills, taskTags, tasks,
} from "@/db/schema";
import { requireWorkspace } from "./session.functions";

const idInput = z.object({ id: z.string().uuid() });
const liveCondition = (workspaceId: string) => and(eq(focusSessions.workspaceId, workspaceId), or(eq(focusSessions.status, "active"), eq(focusSessions.status, "paused")));

export const suggestFocusTaskFn = createServerFn({ method: "GET" }).handler(async () => {
  const { workspace } = await requireWorkspace();
  const rows = await getDb().select().from(tasks).where(and(eq(tasks.workspaceId, workspace.id), isNull(tasks.archivedAt), inArray(tasks.status, ["todo", "doing"]))).orderBy(desc(tasks.updatedAt));
  return rows.find((task) => task.status === "doing") ?? rows.filter((task) => task.dueDate).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))[0] ?? rows[0] ?? null;
});

export const startFocusFn = createServerFn({ method: "POST" }).validator(z.object({
  projectId: z.string().uuid(), taskId: z.string().uuid().nullable(), preset: z.enum(["classic", "deep_work", "custom"]), plannedSeconds: z.number().int().min(60).max(14_400),
})).handler(async ({ data }) => {
  const { workspace } = await requireWorkspace(); const db = getDb();
  const [live] = await db.select().from(focusSessions).where(liveCondition(workspace.id)).limit(1);
  if (live) throw new Error("FOCUS_ALREADY_ACTIVE");
  const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, data.projectId), eq(projects.workspaceId, workspace.id), isNull(projects.archivedAt))).limit(1);
  if (!project) throw new Error("PROJECT_NOT_FOUND");
  if (data.taskId) {
    const [task] = await db.select({ projectId: tasks.projectId }).from(tasks).where(and(eq(tasks.id, data.taskId), eq(tasks.workspaceId, workspace.id), isNull(tasks.archivedAt))).limit(1);
    if (!task || task.projectId !== data.projectId) throw new Error("TASK_PROJECT_MISMATCH");
  }
  const [created] = await db.insert(focusSessions).values({ workspaceId: workspace.id, ...data }).returning();
  return created;
});

export const pauseFocusFn = createServerFn({ method: "POST" }).validator(idInput).handler(async ({ data }) => {
  const { workspace } = await requireWorkspace();
  const [updated] = await getDb().update(focusSessions).set({ status: "paused", pausedAt: new Date(), updatedAt: new Date() }).where(and(eq(focusSessions.id, data.id), eq(focusSessions.workspaceId, workspace.id), eq(focusSessions.status, "active"))).returning();
  if (!updated) throw new Error("ACTIVE_FOCUS_NOT_FOUND"); return updated;
});

export const resumeFocusFn = createServerFn({ method: "POST" }).validator(idInput).handler(async ({ data }) => {
  const { workspace } = await requireWorkspace(); const db = getDb();
  const [current] = await db.select().from(focusSessions).where(and(eq(focusSessions.id, data.id), eq(focusSessions.workspaceId, workspace.id), eq(focusSessions.status, "paused"))).limit(1);
  if (!current?.pausedAt) throw new Error("PAUSED_FOCUS_NOT_FOUND");
  const paused = Math.max(0, Math.floor((Date.now() - current.pausedAt.getTime()) / 1000));
  const [updated] = await db.update(focusSessions).set({ status: "active", pausedAt: null, accumulatedPausedSeconds: current.accumulatedPausedSeconds + paused, updatedAt: new Date() }).where(eq(focusSessions.id, current.id)).returning();
  return updated;
});

export const cancelFocusFn = createServerFn({ method: "POST" }).validator(idInput).handler(async ({ data }) => {
  const { workspace } = await requireWorkspace();
  await getDb().update(focusSessions).set({ status: "cancelled", endedAt: new Date(), updatedAt: new Date() }).where(and(eq(focusSessions.id, data.id), eq(focusSessions.workspaceId, workspace.id), or(eq(focusSessions.status, "active"), eq(focusSessions.status, "paused"))));
  return { ok: true };
});

export const completeFocusFn = createServerFn({ method: "POST" }).validator(z.object({ id: z.string().uuid(), actualSeconds: z.number().int().min(1).max(86_400).optional() })).handler(async ({ data }) => {
  const { workspace } = await requireWorkspace(); const db = getDb();
  const [current] = await db.select().from(focusSessions).where(and(eq(focusSessions.id, data.id), eq(focusSessions.workspaceId, workspace.id), or(eq(focusSessions.status, "active"), eq(focusSessions.status, "paused")))).limit(1);
  if (!current) throw new Error("LIVE_FOCUS_NOT_FOUND");
  const now = new Date();
  const lastPause = current.pausedAt ? Math.floor((now.getTime() - current.pausedAt.getTime()) / 1000) : 0;
  const elapsed = Math.max(1, Math.floor((now.getTime() - current.startedAt.getTime()) / 1000) - current.accumulatedPausedSeconds - lastPause);
  const actualSeconds = Math.min(data.actualSeconds ?? Math.min(elapsed, current.plannedSeconds), elapsed);
  await db.update(focusSessions).set({ status: "completed", actualSeconds, endedAt: now, pausedAt: null, accumulatedPausedSeconds: current.accumulatedPausedSeconds + lastPause, updatedAt: now }).where(eq(focusSessions.id, current.id));
  const [directSkills, inheritedSkills, directTags, inheritedTags] = await Promise.all([
    current.taskId ? db.select({ id: taskSkills.skillId }).from(taskSkills).where(eq(taskSkills.taskId, current.taskId)) : [],
    db.select({ id: projectSkills.skillId }).from(projectSkills).where(eq(projectSkills.projectId, current.projectId)),
    current.taskId ? db.select({ id: taskTags.tagId }).from(taskTags).where(eq(taskTags.taskId, current.taskId)) : [],
    db.select({ id: projectTags.tagId }).from(projectTags).where(eq(projectTags.projectId, current.projectId)),
  ]);
  const chosenSkills = directSkills.length ? directSkills : inheritedSkills; const chosenTags = directTags.length ? directTags : inheritedTags;
  if (chosenSkills.length) await db.insert(focusSessionSkills).values(chosenSkills.map((item) => ({ focusSessionId: current.id, skillId: item.id, weight: 1 / chosenSkills.length }))).onConflictDoNothing();
  if (chosenTags.length) await db.insert(focusSessionTags).values(chosenTags.map((item) => ({ focusSessionId: current.id, tagId: item.id, weight: 1 / chosenTags.length }))).onConflictDoNothing();
  return { ...current, status: "completed" as const, actualSeconds, endedAt: now };
});

export const startBreakFn = createServerFn({ method: "POST" }).validator(z.object({ focusSessionId: z.string().uuid(), type: z.enum(["short", "long", "active"]), plannedSeconds: z.number().int().min(60).max(3600) })).handler(async ({ data }) => {
  const { workspace } = await requireWorkspace(); const db = getDb();
  const [existing] = await db.select({ id: focusBreaks.id }).from(focusBreaks).innerJoin(focusSessions, eq(focusBreaks.focusSessionId, focusSessions.id)).where(and(eq(focusSessions.workspaceId, workspace.id), isNull(focusBreaks.endedAt))).limit(1);
  if (existing) throw new Error("BREAK_ALREADY_ACTIVE");
  const [focus] = await db.select({ id: focusSessions.id }).from(focusSessions).where(and(eq(focusSessions.id, data.focusSessionId), eq(focusSessions.workspaceId, workspace.id), eq(focusSessions.status, "completed"))).limit(1);
  if (!focus) throw new Error("FOCUS_NOT_FOUND");
  const [created] = await db.insert(focusBreaks).values(data).returning(); return created;
});

export const completeBreakFn = createServerFn({ method: "POST" }).validator(idInput).handler(async ({ data }) => {
  const { workspace } = await requireWorkspace(); const db = getDb(); const now = new Date();
  const [current] = await db.select({ id: focusBreaks.id, startedAt: focusBreaks.startedAt, plannedSeconds: focusBreaks.plannedSeconds }).from(focusBreaks).innerJoin(focusSessions, eq(focusBreaks.focusSessionId, focusSessions.id)).where(and(eq(focusBreaks.id, data.id), eq(focusSessions.workspaceId, workspace.id), isNull(focusBreaks.endedAt))).limit(1);
  if (!current) throw new Error("ACTIVE_BREAK_NOT_FOUND");
  const elapsed = Math.max(1, Math.floor((now.getTime() - current.startedAt.getTime()) / 1000));
  await db.update(focusBreaks).set({ endedAt: now, actualSeconds: Math.min(elapsed, current.plannedSeconds) }).where(eq(focusBreaks.id, current.id));
  return { ok: true };
});
