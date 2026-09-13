import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  ...timestamps,
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [index("session_user_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (table) => [index("account_user_idx").on(table.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...timestamps,
});

export const projectStatus = pgEnum("project_status", ["planning", "in_progress", "paused", "completed"]);
export const taskStatus = pgEnum("task_status", ["todo", "doing", "done"]);
export const skillLevel = pgEnum("skill_level", ["learning", "comfortable", "fluent"]);
export const focusStatus = pgEnum("focus_status", ["active", "paused", "completed", "cancelled"]);
export const focusPreset = pgEnum("focus_preset", ["classic", "deep_work", "custom"]);
export const breakType = pgEnum("break_type", ["short", "long", "active"]);

export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerUserId: text("owner_user_id").notNull().unique().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").default("My workspace").notNull(),
  ...timestamps,
});

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").default("").notNull(),
  details: text("details").default("").notNull(),
  referenceUrl: text("reference_url").default("").notNull(),
  status: projectStatus("status").default("planning").notNull(),
  dueDate: date("due_date"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  index("projects_workspace_status_idx").on(table.workspaceId, table.status),
  uniqueIndex("projects_id_workspace_unique").on(table.id, table.workspaceId),
]);

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull(),
  title: text("title").notNull(),
  description: text("description").default("").notNull(),
  status: taskStatus("status").default("todo").notNull(),
  progress: integer("progress").default(0).notNull(),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  index("tasks_workspace_status_idx").on(table.workspaceId, table.status),
  index("tasks_project_idx").on(table.projectId),
  index("tasks_due_idx").on(table.workspaceId, table.dueDate),
  uniqueIndex("tasks_id_project_workspace_unique").on(table.id, table.projectId, table.workspaceId),
  foreignKey({ columns: [table.projectId, table.workspaceId], foreignColumns: [projects.id, projects.workspaceId], name: "tasks_project_workspace_fk" }).onDelete("cascade"),
]);

export const skills = pgTable("skills", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  area: text("area").default("Languages").notNull(),
  level: skillLevel("level").default("learning").notNull(),
  confidence: integer("confidence").default(10).notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("skills_active_name_unique").on(table.workspaceId, table.normalizedName).where(sql`${table.archivedAt} is null`),
]);

export const tags = pgTable("tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  mergedIntoId: uuid("merged_into_id"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("tags_active_name_unique").on(table.workspaceId, table.normalizedName).where(sql`${table.archivedAt} is null`),
]);

export const projectSkills = pgTable("project_skills", {
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  skillId: uuid("skill_id").notNull().references(() => skills.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.projectId, table.skillId] })]);
export const taskSkills = pgTable("task_skills", {
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  skillId: uuid("skill_id").notNull().references(() => skills.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.taskId, table.skillId] })]);
export const projectTags = pgTable("project_tags", {
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.projectId, table.tagId] })]);
export const taskTags = pgTable("task_tags", {
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.taskId, table.tagId] })]);

export const focusSessions = pgTable("focus_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull(),
  taskId: uuid("task_id"),
  preset: focusPreset("preset").notNull(),
  status: focusStatus("status").default("active").notNull(),
  plannedSeconds: integer("planned_seconds").notNull(),
  actualSeconds: integer("actual_seconds"),
  accumulatedPausedSeconds: integer("accumulated_paused_seconds").default(0).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  pausedAt: timestamp("paused_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("one_live_focus_per_workspace").on(table.workspaceId).where(sql`${table.status} in ('active', 'paused')`),
  index("focus_workspace_started_idx").on(table.workspaceId, table.startedAt),
  foreignKey({ columns: [table.projectId, table.workspaceId], foreignColumns: [projects.id, projects.workspaceId], name: "focus_project_workspace_fk" }).onDelete("restrict"),
  foreignKey({ columns: [table.taskId, table.projectId, table.workspaceId], foreignColumns: [tasks.id, tasks.projectId, tasks.workspaceId], name: "focus_task_project_workspace_fk" }).onDelete("restrict"),
]);

export const focusBreaks = pgTable("focus_breaks", {
  id: uuid("id").defaultRandom().primaryKey(),
  focusSessionId: uuid("focus_session_id").notNull().references(() => focusSessions.id, { onDelete: "cascade" }),
  type: breakType("type").notNull(),
  plannedSeconds: integer("planned_seconds").notNull(),
  actualSeconds: integer("actual_seconds"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

export const focusSessionSkills = pgTable("focus_session_skills", {
  focusSessionId: uuid("focus_session_id").notNull().references(() => focusSessions.id, { onDelete: "cascade" }),
  skillId: uuid("skill_id").notNull().references(() => skills.id, { onDelete: "restrict" }),
  weight: real("weight").notNull(),
}, (table) => [primaryKey({ columns: [table.focusSessionId, table.skillId] })]);
export const focusSessionTags = pgTable("focus_session_tags", {
  focusSessionId: uuid("focus_session_id").notNull().references(() => focusSessions.id, { onDelete: "cascade" }),
  tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "restrict" }),
  weight: real("weight").notNull(),
}, (table) => [primaryKey({ columns: [table.focusSessionId, table.tagId] })]);

export const userPreferences = pgTable("user_preferences", {
  workspaceId: uuid("workspace_id").primaryKey().references(() => workspaces.id, { onDelete: "cascade" }),
  timezone: text("timezone").default("America/Bahia").notNull(),
  defaultPreset: focusPreset("default_preset").default("classic").notNull(),
  soundEnabled: boolean("sound_enabled").default(false).notNull(),
  silentMode: boolean("silent_mode").default(false).notNull(),
  ...timestamps,
});

export const workspaceImports = pgTable("workspace_imports", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  fingerprint: text("fingerprint").notNull(),
  sourceVersion: text("source_version").notNull(),
  importedAt: timestamp("imported_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("workspace_import_fingerprint_unique").on(table.workspaceId, table.fingerprint)]);
