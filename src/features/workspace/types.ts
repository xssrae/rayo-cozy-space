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

export type Project = {
  id: number;
  name: string;
  description: string;
  details: string;
  referenceUrl: string;
  status: ProjectStatus;
  tags: string[];
  completed: number;
  total: number;
  due: string;
  people: string[];
};

export type Task = {
  id: number;
  title: string;
  projectId: number;
  status: TaskStatus;
  progress: number;
  due: string;
  people: string[];
};

export type Skill = {
  id: number;
  name: string;
  area: string;
  level: SkillLevel;
  progress: number;
  people: string[];
};

export type Workspace = {
  projects: Project[];
  tasks: Task[];
  skills: Skill[];
  tags: string[];
};
