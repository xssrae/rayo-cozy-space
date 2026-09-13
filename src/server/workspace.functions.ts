import { and, eq, inArray, isNull } from "drizzle-orm";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDb } from "@/db/index";
import {
  focusBreaks, focusSessions, focusSessionSkills, focusSessionTags, projectSkills, projectTags, projects, skills, tags, taskSkills, taskTags, tasks,
} from "@/db/schema";
import type { ProjectStatus, SkillLevel, TaskStatus, Workspace } from "@/features/workspace/types";
import { requireWorkspace } from "./session.functions";

const projectToDb: Record<ProjectStatus, "planning" | "in_progress" | "paused" | "completed"> = {
  Planning: "planning", "In progress": "in_progress", Paused: "paused", Completed: "completed",
};
const projectFromDb = Object.fromEntries(Object.entries(projectToDb).map(([key, value]) => [value, key])) as Record<string, ProjectStatus>;
const taskToDb: Record<TaskStatus, "todo" | "doing" | "done"> = { "To do": "todo", Doing: "doing", Done: "done" };
const taskFromDb = Object.fromEntries(Object.entries(taskToDb).map(([key, value]) => [value, key])) as Record<string, TaskStatus>;
const skillToDb: Record<SkillLevel, "learning" | "comfortable" | "fluent"> = { Learning: "learning", Comfortable: "comfortable", Fluent: "fluent" };
const skillFromDb = Object.fromEntries(Object.entries(skillToDb).map(([key, value]) => [value, key])) as Record<string, SkillLevel>;

function displayDue(value: string | null) {
  if (!value) return "Sem prazo";
  return new Intl.DateTimeFormat("pt-BR", { month: "short", day: "2-digit", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

export const getWorkspaceFn = createServerFn({ method: "GET" }).handler(async (): Promise<Workspace> => {
  const { session, workspace } = await requireWorkspace();
  const db = getDb();
  const [projectRows, taskRows, skillRows, tagRows, projectTagRows, projectSkillRows, taskTagRows, taskSkillRows, focusRows, breakRows, focusSkillRows, focusTagRows] = await Promise.all([
    db.select().from(projects).where(and(eq(projects.workspaceId, workspace.id), isNull(projects.archivedAt))),
    db.select().from(tasks).where(and(eq(tasks.workspaceId, workspace.id), isNull(tasks.archivedAt))),
    db.select().from(skills).where(eq(skills.workspaceId, workspace.id)),
    db.select().from(tags).where(eq(tags.workspaceId, workspace.id)),
    db.select().from(projectTags), db.select().from(projectSkills), db.select().from(taskTags), db.select().from(taskSkills),
    db.select().from(focusSessions).where(eq(focusSessions.workspaceId, workspace.id)),
    db.select({ id: focusBreaks.id, focusSessionId: focusBreaks.focusSessionId, type: focusBreaks.type, plannedSeconds: focusBreaks.plannedSeconds, actualSeconds: focusBreaks.actualSeconds, startedAt: focusBreaks.startedAt, endedAt: focusBreaks.endedAt }).from(focusBreaks).innerJoin(focusSessions, eq(focusBreaks.focusSessionId, focusSessions.id)).where(eq(focusSessions.workspaceId, workspace.id)),
    db.select({ focusSessionId: focusSessionSkills.focusSessionId, skillId: focusSessionSkills.skillId, weight: focusSessionSkills.weight }).from(focusSessionSkills).innerJoin(focusSessions, eq(focusSessionSkills.focusSessionId, focusSessions.id)).where(eq(focusSessions.workspaceId, workspace.id)),
    db.select({ focusSessionId: focusSessionTags.focusSessionId, tagId: focusSessionTags.tagId, weight: focusSessionTags.weight }).from(focusSessionTags).innerJoin(focusSessions, eq(focusSessionTags.focusSessionId, focusSessions.id)).where(eq(focusSessions.workspaceId, workspace.id)),
  ]);
  const tagName = new Map(tagRows.map((tag) => [tag.id, tag.name]));
  const projectTaskMap = new Map<string, typeof taskRows>();
  taskRows.forEach((task) => projectTaskMap.set(task.projectId, [...(projectTaskMap.get(task.projectId) ?? []), task]));
  const mappedFocus = focusRows.map((item) => ({
    ...item, startedAt: item.startedAt.toISOString(), pausedAt: item.pausedAt?.toISOString() ?? null,
    endedAt: item.endedAt?.toISOString() ?? null,
  }));
  const focusSeconds = new Map(focusRows.map((item) => [item.id, item.status === "completed" ? item.actualSeconds ?? 0 : 0]));
  const mappedBreaks = breakRows.map((item) => ({ ...item, startedAt: item.startedAt.toISOString(), endedAt: item.endedAt?.toISOString() ?? null }));
  return {
    user: { name: session.user.name, email: session.user.email },
    projects: projectRows.map((project) => {
      const related = projectTaskMap.get(project.id) ?? [];
      return {
        id: project.id, name: project.name, description: project.description, details: project.details,
        referenceUrl: project.referenceUrl, status: projectFromDb[project.status] ?? "Planning",
        tags: projectTagRows.filter((link) => link.projectId === project.id).map((link) => tagName.get(link.tagId)).filter(Boolean) as string[],
        skillIds: projectSkillRows.filter((link) => link.projectId === project.id).map((link) => link.skillId),
        completed: related.filter((task) => task.status === "done").length, total: related.length,
        due: displayDue(project.dueDate), dueDate: project.dueDate, people: [session.user.name.slice(0, 2).toUpperCase()],
      };
    }),
    tasks: taskRows.map((task) => ({
      id: task.id, title: task.title, description: task.description, projectId: task.projectId, status: taskFromDb[task.status] ?? "To do", progress: task.progress,
      due: displayDue(task.dueDate), dueDate: task.dueDate,
      tagIds: taskTagRows.filter((link) => link.taskId === task.id).map((link) => link.tagId),
      skillIds: taskSkillRows.filter((link) => link.taskId === task.id).map((link) => link.skillId),
      updatedAt: task.updatedAt.toISOString(), people: [session.user.name.slice(0, 2).toUpperCase()],
    })),
    skills: skillRows.map((skill) => ({
      id: skill.id, name: skill.name, area: skill.area, level: skillFromDb[skill.level] ?? "Learning", progress: skill.confidence,
      archived: Boolean(skill.archivedAt), coverage: projectSkillRows.filter((link) => link.skillId === skill.id).length + taskSkillRows.filter((link) => link.skillId === skill.id).length,
      focusedMinutes: Math.round(focusSkillRows.filter((link) => link.skillId === skill.id).reduce((total, link) => total + (focusSeconds.get(link.focusSessionId) ?? 0) * link.weight, 0) / 60), people: [session.user.name.slice(0, 2).toUpperCase()],
    })),
    tagRecords: tagRows.map((tag) => ({
      id: tag.id, name: tag.name, archived: Boolean(tag.archivedAt),
      coverage: projectTagRows.filter((link) => link.tagId === tag.id).length + taskTagRows.filter((link) => link.tagId === tag.id).length,
      focusedMinutes: Math.round(focusTagRows.filter((link) => link.tagId === tag.id).reduce((total, link) => total + (focusSeconds.get(link.focusSessionId) ?? 0) * link.weight, 0) / 60),
    })),
    tags: tagRows.filter((tag) => !tag.archivedAt).map((tag) => tag.name),
    focusSessions: mappedFocus,
    activeFocus: mappedFocus.find((focus) => focus.status === "active" || focus.status === "paused") ?? null,
    focusBreaks: mappedBreaks,
    activeBreak: mappedBreaks.find((item) => !item.endedAt) ?? null,
  };
});

const projectInput = z.object({
  id: z.string().uuid().optional(), name: z.string().trim().min(1).max(160), description: z.string().max(500).default(""),
  details: z.string().max(10_000).default(""), referenceUrl: z.string().max(2048).default(""), status: z.enum(["In progress", "Completed", "Paused", "Planning"]),
  tags: z.array(z.string()).default([]), dueDate: z.string().nullable().optional(), due: z.string().optional(),
});
export const saveProjectFn = createServerFn({ method: "POST" }).validator(projectInput).handler(async ({ data }) => {
  const { workspace } = await requireWorkspace(); const db = getDb();
  const values = { workspaceId: workspace.id, name: data.name, description: data.description, details: data.details, referenceUrl: data.referenceUrl, status: projectToDb[data.status], dueDate: data.dueDate ?? null, updatedAt: new Date() };
  let projectId = data.id;
  if (projectId) {
    const [updated] = await db.update(projects).set(values).where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspace.id))).returning({ id: projects.id });
    if (!updated) throw new Error("PROJECT_NOT_FOUND");
  } else {
    const [created] = await db.insert(projects).values(values).returning({ id: projects.id }); if (!created) throw new Error("PROJECT_CREATE_FAILED"); projectId = created.id;
  }
  await db.delete(projectTags).where(eq(projectTags.projectId, projectId));
  if (data.tags.length) {
    const chosen = await db.select().from(tags).where(and(eq(tags.workspaceId, workspace.id), inArray(tags.name, data.tags), isNull(tags.archivedAt)));
    if (chosen.length) await db.insert(projectTags).values(chosen.map((tag) => ({ projectId: projectId!, tagId: tag.id }))).onConflictDoNothing();
  }
  return projectId;
});

export const archiveProjectFn = createServerFn({ method: "POST" }).validator(z.object({ id: z.string().uuid() })).handler(async ({ data }) => {
  const { workspace } = await requireWorkspace();
  await getDb().update(projects).set({ archivedAt: new Date(), updatedAt: new Date() }).where(and(eq(projects.id, data.id), eq(projects.workspaceId, workspace.id)));
  return { ok: true };
});

const taskInput = z.object({
  id: z.string().uuid().optional(), title: z.string().trim().max(240), projectId: z.string().uuid(),
  description: z.string().max(10000).optional(),
  status: z.enum(["To do", "Doing", "Done"]), progress: z.number().int().min(0).max(100), dueDate: z.string().nullable().optional(), due: z.string().optional(),
});
export const saveTaskFn = createServerFn({ method: "POST" }).validator(taskInput).handler(async ({ data }) => {
  const { workspace } = await requireWorkspace(); const db = getDb();
  const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, data.projectId), eq(projects.workspaceId, workspace.id), isNull(projects.archivedAt))).limit(1);
  if (!project) throw new Error("PROJECT_NOT_FOUND");
  const values = { workspaceId: workspace.id, projectId: data.projectId, title: data.title, description: data.description, status: taskToDb[data.status], progress: data.status === "Done" ? 100 : Math.min(99, data.progress), dueDate: data.dueDate ?? null, completedAt: data.status === "Done" ? new Date() : null, updatedAt: new Date() };
  if (data.id) {
    const [updated] = await db.update(tasks).set(values).where(and(eq(tasks.id, data.id), eq(tasks.workspaceId, workspace.id))).returning({ id: tasks.id });
    if (!updated) throw new Error("TASK_NOT_FOUND"); return updated.id;
  }
  const [created] = await db.insert(tasks).values(values).returning({ id: tasks.id }); if (!created) throw new Error("TASK_CREATE_FAILED"); return created.id;
});

export const toggleTaskFn = createServerFn({ method: "POST" }).validator(z.object({ id: z.string().uuid() })).handler(async ({ data }) => {
  const { workspace } = await requireWorkspace(); const db = getDb();
  const [task] = await db.select().from(tasks).where(and(eq(tasks.id, data.id), eq(tasks.workspaceId, workspace.id))).limit(1);
  if (!task) throw new Error("TASK_NOT_FOUND"); const done = task.status !== "done";
  await db.update(tasks).set({ status: done ? "done" : "todo", progress: done ? 100 : 0, completedAt: done ? new Date() : null, updatedAt: new Date() }).where(eq(tasks.id, task.id));
  return { ok: true };
});

export const saveSkillFn = createServerFn({ method: "POST" }).validator(z.object({
  name: z.string().trim().min(1).max(100), area: z.string().trim().min(1).max(100), level: z.enum(["Learning", "Comfortable", "Fluent"]), progress: z.number().int().min(0).max(100),
})).handler(async ({ data }) => {
  const { workspace } = await requireWorkspace();
  const [created] = await getDb().insert(skills).values({ workspaceId: workspace.id, name: data.name, normalizedName: data.name.toLocaleLowerCase(), area: data.area, level: skillToDb[data.level], confidence: data.progress }).returning({ id: skills.id });
  if (!created) throw new Error("SKILL_CREATE_FAILED"); return created.id;
});

export const saveTagFn = createServerFn({ method: "POST" }).validator(z.object({ name: z.string().trim().min(1).max(80) })).handler(async ({ data }) => {
  const { workspace } = await requireWorkspace();
  const [created] = await getDb().insert(tags).values({ workspaceId: workspace.id, name: data.name, normalizedName: data.name.toLocaleLowerCase() }).onConflictDoNothing().returning({ id: tags.id });
  return created?.id ?? null;
});

export const archiveTagFn = createServerFn({ method: "POST" }).validator(z.object({ name: z.string() })).handler(async ({ data }) => {
  const { workspace } = await requireWorkspace();
  await getDb().update(tags).set({ archivedAt: new Date(), updatedAt: new Date() }).where(and(eq(tags.workspaceId, workspace.id), eq(tags.name, data.name)));
  return { ok: true };
});
