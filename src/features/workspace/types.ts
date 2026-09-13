export const projectStatuses = [
  "In progress",
  "Completed",
  "Paused",
  "Planning",
] as const;
export type ProjectStatus = (typeof projectStatuses)[number];
export const taskStatuses = ["To do", "Doing", "Done"] as const;
export type TaskStatus = (typeof taskStatuses)[number];
export const skillLevels = ["Learning", "Comfortable", "Fluent"] as const;
export type SkillLevel = (typeof skillLevels)[number];
export type FocusPreset = "classic" | "deep_work" | "custom";
export type FocusStatus = "active" | "paused" | "completed" | "cancelled";
export type BreakType = "short" | "long" | "active";

export type Project = {
  id: string;
  name: string;
  description: string;
  details: string;
  referenceUrl: string;
  status: ProjectStatus;
  tags: string[];
  skillIds: string[];
  completed: number;
  total: number;
  due: string;
  dueDate: string | null;
  people: string[];
};
export type Task = {
  description?: string;
  id: string;
  title: string;
  projectId: string;
  status: TaskStatus;
  progress: number;
  due: string;
  dueDate: string | null;
  tagIds: string[];
  skillIds: string[];
  updatedAt: string;
  people: string[];
};
export type Skill = {
  id: string;
  name: string;
  area: string;
  level: SkillLevel;
  progress: number;
  archived: boolean;
  coverage: number;
  focusedMinutes: number;
  people: string[];
};
export type Tag = {
  id: string;
  name: string;
  archived: boolean;
  coverage: number;
  focusedMinutes: number;
};
export type FocusSession = {
  id: string;
  projectId: string;
  taskId: string | null;
  preset: FocusPreset;
  status: FocusStatus;
  plannedSeconds: number;
  actualSeconds: number | null;
  accumulatedPausedSeconds: number;
  startedAt: string;
  pausedAt: string | null;
  endedAt: string | null;
};
export type FocusBreak = {
  id: string;
  focusSessionId: string;
  type: BreakType;
  plannedSeconds: number;
  actualSeconds: number | null;
  startedAt: string;
  endedAt: string | null;
};
export type Workspace = {
  projects: Project[];
  tasks: Task[];
  skills: Skill[];
  tagRecords: Tag[];
  tags: string[];
  focusSessions: FocusSession[];
  activeFocus: FocusSession | null;
  focusBreaks: FocusBreak[];
  activeBreak: FocusBreak | null;
  user: { name: string; email: string };
};
export type ProductivityReport = {
  range: { from: string; to: string; granularity: "week" | "month" };
  totalMinutes: number;
  momentum: number;
  activeDays: number;
  daily: { date: string; minutes: number }[];
  byProject: { id: string; name: string; minutes: number }[];
  bySkill: { id: string; name: string; minutes: number }[];
  byTag: { id: string; name: string; minutes: number }[];
  taskTrend: { date: string; created: number; completed: number }[];
};
