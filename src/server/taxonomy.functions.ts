import { and, eq, inArray } from "drizzle-orm";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDb } from "@/db/index";
import {
  focusSessionSkills,
  focusSessionTags,
  projectSkills,
  projectTags,
  projects,
  skills,
  tags,
  taskSkills,
  taskTags,
  tasks,
} from "@/db/schema";
import { requireWorkspace } from "./session.functions";

const kindSchema = z.enum(["skill", "tag"]);
export const updateTaxonomyFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      kind: kindSchema,
      id: z.string().uuid(),
      name: z.string().trim().min(1).max(100),
      area: z.string().trim().max(100).optional(),
      level: z.enum(["learning", "comfortable", "fluent"]).optional(),
      confidence: z.number().int().min(0).max(100).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { workspace } = await requireWorkspace();
    const db = getDb();
    if (data.kind === "skill")
      await db
        .update(skills)
        .set({
          name: data.name,
          normalizedName: data.name.toLocaleLowerCase(),
          area: data.area,
          level: data.level,
          confidence: data.confidence,
          updatedAt: new Date(),
        })
        .where(
          and(eq(skills.id, data.id), eq(skills.workspaceId, workspace.id)),
        );
    else
      await db
        .update(tags)
        .set({
          name: data.name,
          normalizedName: data.name.toLocaleLowerCase(),
          updatedAt: new Date(),
        })
        .where(and(eq(tags.id, data.id), eq(tags.workspaceId, workspace.id)));
    return { ok: true };
  });

export const setTaxonomyArchivedFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      kind: kindSchema,
      id: z.string().uuid(),
      archived: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const { workspace } = await requireWorkspace();
    const archivedAt = data.archived ? new Date() : null;
    const db = getDb();
    if (data.kind === "skill")
      await db
        .update(skills)
        .set({ archivedAt, updatedAt: new Date() })
        .where(
          and(eq(skills.id, data.id), eq(skills.workspaceId, workspace.id)),
        );
    else
      await db
        .update(tags)
        .set({ archivedAt, updatedAt: new Date() })
        .where(and(eq(tags.id, data.id), eq(tags.workspaceId, workspace.id)));
    return { ok: true };
  });

export const mergeTaxonomyFn = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        kind: kindSchema,
        sourceId: z.string().uuid(),
        targetId: z.string().uuid(),
      })
      .refine((data) => data.sourceId !== data.targetId),
  )
  .handler(async ({ data }) => {
    const { workspace } = await requireWorkspace();
    const db = getDb();
    if (data.kind === "skill") {
      await db.transaction(async (tx) => {
        const owned = await tx
          .select({ id: skills.id })
          .from(skills)
          .where(
            and(
              eq(skills.workspaceId, workspace.id),
              inArray(skills.id, [data.sourceId, data.targetId]),
            ),
          );
        if (owned.length !== 2) throw new Error("TAXONOMY_NOT_FOUND");
        const [projectLinks, taskLinks, focusLinks] = await Promise.all([
          tx
            .select()
            .from(projectSkills)
            .where(eq(projectSkills.skillId, data.sourceId)),
          tx
            .select()
            .from(taskSkills)
            .where(eq(taskSkills.skillId, data.sourceId)),
          tx
            .select()
            .from(focusSessionSkills)
            .where(eq(focusSessionSkills.skillId, data.sourceId)),
        ]);
        if (projectLinks.length)
          await tx
            .insert(projectSkills)
            .values(
              projectLinks.map((link) => ({ ...link, skillId: data.targetId })),
            )
            .onConflictDoNothing();
        if (taskLinks.length)
          await tx
            .insert(taskSkills)
            .values(
              taskLinks.map((link) => ({ ...link, skillId: data.targetId })),
            )
            .onConflictDoNothing();
        for (const link of focusLinks)
          await tx
            .insert(focusSessionSkills)
            .values({ ...link, skillId: data.targetId })
            .onConflictDoUpdate({
              target: [
                focusSessionSkills.focusSessionId,
                focusSessionSkills.skillId,
              ],
              set: { weight: link.weight },
            });
        await tx
          .delete(projectSkills)
          .where(eq(projectSkills.skillId, data.sourceId));
        await tx
          .delete(taskSkills)
          .where(eq(taskSkills.skillId, data.sourceId));
        await tx
          .delete(focusSessionSkills)
          .where(eq(focusSessionSkills.skillId, data.sourceId));
        await tx
          .update(skills)
          .set({ archivedAt: new Date(), updatedAt: new Date() })
          .where(
            and(
              eq(skills.id, data.sourceId),
              eq(skills.workspaceId, workspace.id),
            ),
          );
      });
    } else {
      await db.transaction(async (tx) => {
        const owned = await tx
          .select({ id: tags.id })
          .from(tags)
          .where(
            and(
              eq(tags.workspaceId, workspace.id),
              inArray(tags.id, [data.sourceId, data.targetId]),
            ),
          );
        if (owned.length !== 2) throw new Error("TAXONOMY_NOT_FOUND");
        const [projectLinks, taskLinks, focusLinks] = await Promise.all([
          tx
            .select()
            .from(projectTags)
            .where(eq(projectTags.tagId, data.sourceId)),
          tx.select().from(taskTags).where(eq(taskTags.tagId, data.sourceId)),
          tx
            .select()
            .from(focusSessionTags)
            .where(eq(focusSessionTags.tagId, data.sourceId)),
        ]);
        if (projectLinks.length)
          await tx
            .insert(projectTags)
            .values(
              projectLinks.map((link) => ({ ...link, tagId: data.targetId })),
            )
            .onConflictDoNothing();
        if (taskLinks.length)
          await tx
            .insert(taskTags)
            .values(
              taskLinks.map((link) => ({ ...link, tagId: data.targetId })),
            )
            .onConflictDoNothing();
        for (const link of focusLinks)
          await tx
            .insert(focusSessionTags)
            .values({ ...link, tagId: data.targetId })
            .onConflictDoUpdate({
              target: [focusSessionTags.focusSessionId, focusSessionTags.tagId],
              set: { weight: link.weight },
            });
        await tx
          .delete(projectTags)
          .where(eq(projectTags.tagId, data.sourceId));
        await tx.delete(taskTags).where(eq(taskTags.tagId, data.sourceId));
        await tx
          .delete(focusSessionTags)
          .where(eq(focusSessionTags.tagId, data.sourceId));
        await tx
          .update(tags)
          .set({
            archivedAt: new Date(),
            mergedIntoId: data.targetId,
            updatedAt: new Date(),
          })
          .where(
            and(eq(tags.id, data.sourceId), eq(tags.workspaceId, workspace.id)),
          );
      });
    }
    return { ok: true };
  });

export const setEntityTaxonomyFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      entity: z.enum(["project", "task"]),
      entityId: z.string().uuid(),
      skillIds: z.array(z.string().uuid()),
      tagIds: z.array(z.string().uuid()),
    }),
  )
  .handler(async ({ data }) => {
    const { workspace } = await requireWorkspace();
    const db = getDb();
    if (data.entity === "project") {
      const [owned] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(
            eq(projects.id, data.entityId),
            eq(projects.workspaceId, workspace.id),
          ),
        )
        .limit(1);
      if (!owned) throw new Error("PROJECT_NOT_FOUND");
      await Promise.all([
        db
          .delete(projectSkills)
          .where(eq(projectSkills.projectId, data.entityId)),
        db.delete(projectTags).where(eq(projectTags.projectId, data.entityId)),
      ]);
      if (data.skillIds.length)
        await db
          .insert(projectSkills)
          .values(
            data.skillIds.map((skillId) => ({
              projectId: data.entityId,
              skillId,
            })),
          )
          .onConflictDoNothing();
      if (data.tagIds.length)
        await db
          .insert(projectTags)
          .values(
            data.tagIds.map((tagId) => ({ projectId: data.entityId, tagId })),
          )
          .onConflictDoNothing();
    } else {
      const [owned] = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(
          and(eq(tasks.id, data.entityId), eq(tasks.workspaceId, workspace.id)),
        )
        .limit(1);
      if (!owned) throw new Error("TASK_NOT_FOUND");
      await Promise.all([
        db.delete(taskSkills).where(eq(taskSkills.taskId, data.entityId)),
        db.delete(taskTags).where(eq(taskTags.taskId, data.entityId)),
      ]);
      if (data.skillIds.length)
        await db
          .insert(taskSkills)
          .values(
            data.skillIds.map((skillId) => ({
              taskId: data.entityId,
              skillId,
            })),
          )
          .onConflictDoNothing();
      if (data.tagIds.length)
        await db
          .insert(taskTags)
          .values(
            data.tagIds.map((tagId) => ({ taskId: data.entityId, tagId })),
          )
          .onConflictDoNothing();
    }
    return { ok: true };
  });
