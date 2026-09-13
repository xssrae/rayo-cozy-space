import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, type ReactNode } from "react";
import { authClient } from "@/lib/auth-client";
import {
  archiveProjectFn, archiveTagFn, getWorkspaceFn, saveProjectFn, saveSkillFn, saveTagFn, saveTaskFn, toggleTaskFn,
} from "@/server/workspace.functions";
import type { Project, Skill, Task, Workspace } from "./types";
import { importWorkspaceFn } from "@/server/import.functions";

const emptyWorkspace: Workspace = {
  projects: [], tasks: [], skills: [], tags: [], tagRecords: [], focusSessions: [], activeFocus: null, focusBreaks: [], activeBreak: null,
  user: { name: "", email: "" },
};

type WorkspaceContextValue = Workspace & {
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  addProject: (project: Omit<Project, "id">) => Promise<void>;
  updateProject: (project: Project) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  addTask: (task: Omit<Task, "id">) => Promise<string>;
  updateTask: (task: Task) => Promise<void>;
  toggleTaskDone: (taskId: string) => Promise<void>;
  addSkill: (skill: Omit<Skill, "id">) => Promise<void>;
  addTag: (tag: string) => Promise<void>;
  removeTag: (tag: string) => Promise<void>;
  exportWorkspace: () => string;
  importWorkspace: (contents: string) => Promise<boolean>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const session = authClient.useSession();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["workspace"], queryFn: () => getWorkspaceFn(), enabled: Boolean(session.data?.user),
  });
  const workspace = query.data ?? emptyWorkspace;
  const refresh = async () => { await queryClient.invalidateQueries({ queryKey: ["workspace"] }); };
  const run = async (operation: () => Promise<unknown>) => { await operation(); await refresh(); };

  const value: WorkspaceContextValue = {
    ...workspace,
    loading: session.isPending || query.isLoading,
    error: query.error instanceof Error ? query.error : null,
    refresh,
    addProject: async (project) => run(() => saveProjectFn({ data: { ...project, dueDate: project.dueDate ?? null } })),
    updateProject: async (project) => run(() => saveProjectFn({ data: { ...project, dueDate: project.dueDate ?? null } })),
    deleteProject: async (projectId) => run(() => archiveProjectFn({ data: { id: projectId } })),
    addTask: async (task) => { const id = await saveTaskFn({ data: { ...task, dueDate: task.dueDate ?? null } }); await refresh(); return id; },
    updateTask: async (task) => run(() => saveTaskFn({ data: { ...task, dueDate: task.dueDate ?? null } })),
    toggleTaskDone: async (taskId) => run(() => toggleTaskFn({ data: { id: taskId } })),
    addSkill: async (skill) => run(() => saveSkillFn({ data: skill })),
    addTag: async (tag) => run(() => saveTagFn({ data: { name: tag } })),
    removeTag: async (tag) => run(() => archiveTagFn({ data: { name: tag } })),
    exportWorkspace: () => JSON.stringify(workspace, null, 2),
    importWorkspace: async (contents) => {
      try { await importWorkspaceFn({ data: { contents, sourceVersion: "file" } }); await refresh(); return true; } catch { return false; }
    },
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWorkspace() {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return workspace;
}
