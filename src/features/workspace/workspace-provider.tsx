import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { initialWorkspace } from "./seed";
import type { Project, Skill, Task, Workspace } from "./types";

const STORAGE_KEY = "rayo-plan-workspace-v2";

type WorkspaceContextValue = Workspace & {
  addProject: (project: Omit<Project, "id">) => void;
  updateProject: (project: Project) => void;
  deleteProject: (projectId: number) => void;
  addTask: (task: Omit<Task, "id">) => void;
  toggleTaskDone: (taskId: number) => void;
  addSkill: (skill: Omit<Skill, "id">) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  exportWorkspace: () => string;
  importWorkspace: (contents: string) => boolean;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function readWorkspace(): Workspace {
  if (typeof window === "undefined") return initialWorkspace;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return initialWorkspace;
    const candidate = JSON.parse(saved) as Partial<Workspace>;
    if (
      !Array.isArray(candidate.projects) ||
      !Array.isArray(candidate.tasks) ||
      !Array.isArray(candidate.skills) ||
      !Array.isArray(candidate.tags)
    )
      return initialWorkspace;
    return normalizeWorkspace(candidate);
  } catch {
    return initialWorkspace;
  }
}

function normalizeWorkspace(candidate: Partial<Workspace>): Workspace {
  return {
    projects: candidate.projects!.map((project) => ({
      ...project,
      details: project.details ?? "",
      referenceUrl: project.referenceUrl ?? "",
    })),
    tasks: candidate.tasks!,
    skills: candidate.skills!,
    tags: candidate.tags!,
  } as Workspace;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace>(readWorkspace);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
  }, [workspace]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      ...workspace,
      addProject: (project) =>
        setWorkspace((current) => ({
          ...current,
          projects: [{ ...project, id: Date.now() }, ...current.projects],
        })),
      updateProject: (project) =>
        setWorkspace((current) => ({
          ...current,
          projects: current.projects.map((item) =>
            item.id === project.id ? project : item,
          ),
        })),
      deleteProject: (projectId) =>
        setWorkspace((current) => ({
          ...current,
          projects: current.projects.filter(
            (project) => project.id !== projectId,
          ),
          tasks: current.tasks.filter((task) => task.projectId !== projectId),
        })),
      addTask: (task) =>
        setWorkspace((current) => ({
          ...current,
          tasks: [{ ...task, id: Date.now() }, ...current.tasks],
        })),
      toggleTaskDone: (taskId) =>
        setWorkspace((current) => ({
          ...current,
          tasks: current.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  status: task.status === "Done" ? "To do" : "Done",
                  progress: task.status === "Done" ? 0 : 100,
                }
              : task,
          ),
        })),
      addSkill: (skill) =>
        setWorkspace((current) => ({
          ...current,
          skills: [{ ...skill, id: Date.now() }, ...current.skills],
        })),
      addTag: (tag) =>
        setWorkspace((current) =>
          current.tags.includes(tag)
            ? current
            : { ...current, tags: [...current.tags, tag] },
        ),
      removeTag: (tag) =>
        setWorkspace((current) => ({
          ...current,
          tags: current.tags.filter((item) => item !== tag),
          projects: current.projects.map((project) => ({
            ...project,
            tags: project.tags.filter((item) => item !== tag),
          })),
        })),
      exportWorkspace: () => JSON.stringify(workspace, null, 2),
      importWorkspace: (contents) => {
        try {
          const candidate = JSON.parse(contents) as Partial<Workspace>;
          if (
            !Array.isArray(candidate.projects) ||
            !Array.isArray(candidate.tasks) ||
            !Array.isArray(candidate.skills) ||
            !Array.isArray(candidate.tags)
          )
            return false;
          setWorkspace(normalizeWorkspace(candidate));
          return true;
        } catch {
          return false;
        }
      },
    }),
    [workspace],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

// This hook shares the provider's context and is intentionally exported together
// with the provider as the feature's public API.
// eslint-disable-next-line react-refresh/only-export-components
export function useWorkspace() {
  const workspace = useContext(WorkspaceContext);
  if (!workspace)
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return workspace;
}
