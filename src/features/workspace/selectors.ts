import type { Project, Workspace } from "./types";

export function getProjectProgress(projects: Project[]): number {
  if (!projects.length) return 0;
  return Math.round(
    (projects.reduce(
      (sum, project) => sum + (project.total ? project.completed / project.total : 0),
      0,
    ) /
      projects.length) *
      100,
  );
}

export function getWorkspaceProgress(workspace: Workspace): number {
  const projectProgress = getProjectProgress(workspace.projects);
  const skillProgress = workspace.skills.length
    ? Math.round(
        workspace.skills.reduce((sum, skill) => sum + skill.progress, 0) /
          workspace.skills.length,
      )
    : 0;
  return Math.round((projectProgress + skillProgress) / 2);
}

export function getProjectName(
  workspace: Workspace,
  projectId: string,
): string {
  return (
    workspace.projects.find((project) => project.id === projectId)?.name ??
    "Unknown project"
  );
}
