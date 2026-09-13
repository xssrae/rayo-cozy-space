import { createHash, randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDb } from "@/db/index";
import {
  projectTags,
  projects,
  skills,
  tags,
  tasks,
  workspaceImports,
} from "@/db/schema";
import { requireWorkspace } from "./session.functions";

const legacyProject = z
  .object({
    id: z.union([z.number(), z.string()]),
    name: z.string(),
    description: z.string().default(""),
    details: z.string().default(""),
    referenceUrl: z.string().default(""),
    status: z.string().default("Planning"),
    tags: z.array(z.string()).default([]),
    due: z.string().default("Not set"),
  })
  .passthrough();
const legacyTask = z
  .object({
    id: z.union([z.number(), z.string()]),
    title: z.string(),
    projectId: z.union([z.number(), z.string()]),
    status: z.string().default("To do"),
    progress: z.number().default(0),
    due: z.string().default("Not set"),
  })
  .passthrough();
const legacySkill = z
  .object({
    name: z.string(),
    area: z.string().default("Languages"),
    level: z.string().default("Learning"),
    progress: z.number().default(10),
  })
  .passthrough();
const legacyWorkspace = z.object({
  projects: z.array(legacyProject),
  tasks: z.array(legacyTask),
  skills: z.array(legacySkill),
  tags: z.array(z.string()),
});
const statusProject = {
  "In progress": "in_progress",
  Completed: "completed",
  Paused: "paused",
  Planning: "planning",
} as const;
const statusTask = { "To do": "todo", Doing: "doing", Done: "done" } as const;
const levelSkill = {
  Learning: "learning",
  Comfortable: "comfortable",
  Fluent: "fluent",
} as const;
const safeDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;

export const importWorkspaceFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      contents: z.string().max(2_000_000),
      sourceVersion: z.enum(["v1", "v2", "file"]),
    }),
  )
  .handler(async ({ data }) => {
    const parsed = legacyWorkspace.parse(JSON.parse(data.contents));
    const { workspace } = await requireWorkspace();
    const db = getDb();
    const fingerprint = createHash("sha256")
      .update(data.contents)
      .digest("hex");
    const [existing] = await db
      .select()
      .from(workspaceImports)
      .where(
        and(
          eq(workspaceImports.workspaceId, workspace.id),
          eq(workspaceImports.fingerprint, fingerprint),
        ),
      )
      .limit(1);
    if (existing)
      return {
        alreadyImported: true,
        projects: 0,
        tasks: 0,
        skills: 0,
        tags: 0,
        ambiguousDates: 0,
      };
    const projectIdMap = new Map<string, string>();
    const tagMap = new Map<string, string>();
    let ambiguousDates = 0;
    const uniqueTags = [
      ...new Map(
        [
          ...parsed.tags,
          ...parsed.projects.flatMap((project) => project.tags),
        ].map((name) => [name.trim().toLocaleLowerCase(), name.trim()]),
      ).values(),
    ].filter(Boolean);
    const existingTags = await db
      .select({ id: tags.id, normalizedName: tags.normalizedName })
      .from(tags)
      .where(and(eq(tags.workspaceId, workspace.id), isNull(tags.archivedAt)));
    for (const tag of existingTags) tagMap.set(tag.normalizedName, tag.id);
    const tagRows = uniqueTags.flatMap((name) => {
      const normalizedName = name.toLocaleLowerCase();
      if (tagMap.has(normalizedName)) return [];
      const id = randomUUID();
      tagMap.set(normalizedName, id);
      return [{ id, workspaceId: workspace.id, name, normalizedName }];
    });
    const projectRows: Array<typeof projects.$inferInsert> = [];
    const projectTagRows: Array<typeof projectTags.$inferInsert> = [];
    for (const project of parsed.projects) {
      const id = randomUUID();
      projectIdMap.set(String(project.id), id);
      const dueDate = safeDate(project.due);
      if (project.due !== "Not set" && !dueDate) ambiguousDates += 1;
      projectRows.push({
        id,
        workspaceId: workspace.id,
        name: project.name,
        description: project.description,
        details: project.details,
        referenceUrl: project.referenceUrl,
        status:
          statusProject[project.status as keyof typeof statusProject] ??
          "planning",
        dueDate,
      });
      const ids = [
        ...new Set(
          project.tags
            .map((name) => tagMap.get(name.trim().toLocaleLowerCase()))
            .filter(Boolean) as string[],
        ),
      ];
      projectTagRows.push(...ids.map((tagId) => ({ projectId: id, tagId })));
    }
    const taskRows: Array<typeof tasks.$inferInsert> = [];
    for (const task of parsed.tasks) {
      const projectId = projectIdMap.get(String(task.projectId));
      if (!projectId) continue;
      const dueDate = safeDate(task.due);
      if (task.due !== "Not set" && !dueDate) ambiguousDates += 1;
      const done = task.status === "Done";
      taskRows.push({
        workspaceId: workspace.id,
        projectId,
        title: task.title,
        status: statusTask[task.status as keyof typeof statusTask] ?? "todo",
        progress: Math.max(0, Math.min(100, task.progress)),
        dueDate,
        completedAt: done ? new Date() : null,
      });
    }
    const uniqueSkills = [
      ...new Map(
        parsed.skills.map((skill) => [
          skill.name.trim().toLocaleLowerCase(),
          skill,
        ]),
      ).values(),
    ];
    const skillRows = uniqueSkills.map((skill) => ({
      workspaceId: workspace.id,
      name: skill.name.trim(),
      normalizedName: skill.name.trim().toLocaleLowerCase(),
      area: skill.area,
      level:
        levelSkill[skill.level as keyof typeof levelSkill] ??
        ("learning" as const),
      confidence: Math.max(0, Math.min(100, skill.progress)),
    }));
    await db.transaction(async (tx) => {
      if (tagRows.length)
        await tx.insert(tags).values(tagRows).onConflictDoNothing();
      if (projectRows.length) await tx.insert(projects).values(projectRows);
      if (projectTagRows.length)
        await tx
          .insert(projectTags)
          .values(projectTagRows)
          .onConflictDoNothing();
      if (taskRows.length) await tx.insert(tasks).values(taskRows);
      if (skillRows.length)
        await tx.insert(skills).values(skillRows).onConflictDoNothing();
      await tx.insert(workspaceImports).values({
        workspaceId: workspace.id,
        fingerprint,
        sourceVersion: data.sourceVersion,
      });
    });
    return {
      alreadyImported: false,
      projects: projectRows.length,
      tasks: taskRows.length,
      skills: uniqueSkills.length,
      tags: uniqueTags.length,
      ambiguousDates,
    };
  });
