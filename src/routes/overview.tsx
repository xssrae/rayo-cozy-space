import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Blocks,
  CalendarDays,
  CircleCheckBig,
  Flame,
  FolderKanban,
  Leaf,
  ListChecks,
  Sprout,
  Sunrise,
} from "lucide-react";
import { RayoShell } from "@/components/rayo";
import {
  getProjectName,
  getWorkspaceProgress,
} from "@/features/workspace/selectors";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import type { ProjectStatus } from "@/features/workspace/types";

export const Route = createFileRoute("/overview")({
  head: () => ({
    meta: [
      { title: "Overview — Rayo Plan" },
      {
        name: "description",
        content:
          "A cozy overview of your projects, tasks, and skills — the whole workspace at a gentle glance.",
      },
    ],
  }),
  component: OverviewPage,
});

const statusTone: Record<
  ProjectStatus,
  "warning" | "success" | "default" | "info"
> = {
  "In progress": "warning",
  Completed: "success",
  Paused: "default",
  Planning: "info",
};

function OverviewPage() {
  const workspace = useWorkspace();
  const { projects, tasks, skills } = workspace;
  const activeProjects = projects.filter(
    (project) =>
      project.status === "In progress" || project.status === "Planning",
  );
  const doneCount = tasks.filter((task) => task.status === "Done").length;
  const fluentSkills = skills.filter(
    (skill) => skill.level === "Fluent",
  ).length;
  const weekProgress = getWorkspaceProgress(workspace);
  const stats = [
    {
      label: "Active projects",
      value: String(activeProjects.length),
      detail: `${projects.length} in the garden`,
      icon: FolderKanban,
      to: "/" as const,
    },
    {
      label: "Tasks done",
      value: String(doneCount),
      detail: `${tasks.length - doneCount} still simmering`,
      icon: CircleCheckBig,
      to: "/tasks" as const,
    },
    {
      label: "Skills fluent",
      value: String(fluentSkills),
      detail: `${skills.length} on the shelf`,
      icon: Blocks,
      to: "/skills" as const,
    },
    {
      label: "Weekly rhythm",
      value: `${weekProgress}%`,
      detail: "A steady pace",
      icon: Sunrise,
      to: "/overview" as const,
    },
  ];
  return (
    <RayoShell active="Overview" progress={weekProgress}>
      <Box className="content-wrap">
        <Box className="page-heading">
          <Box>
            <Typography variant="h1">Good evening, Rae</Typography>
            <Typography color="text.secondary" className="heading-subtitle">
              Here's the whole workspace at a gentle glance — projects, tasks,
              and the skills you're growing. 🌿
            </Typography>
          </Box>
        </Box>
        <Box className="stat-grid">
          {stats.map((stat) => (
            <Box
              component={Link}
              to={stat.to}
              className="stat-card overview-item-link"
              key={stat.label}
            >
              <Stack direction="row" className="card-top">
                <Box className="stat-icon">
                  <stat.icon size={20} />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {stat.label}
                </Typography>
              </Stack>
              <Typography variant="h2" className="stat-value">
                {stat.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stat.detail}
              </Typography>
            </Box>
          ))}
        </Box>
        <Box className="overview-columns">
          <Box component="section" className="overview-panel">
            <Box className="panel-heading">
              <Stack direction="row" spacing={1} className="inline-center">
                <FolderKanban size={20} />
                <Typography variant="h3">Projects in bloom</Typography>
              </Stack>
              <Button
                component={Link}
                to="/"
                endIcon={<ArrowRight size={16} />}
                size="small"
              >
                All projects
              </Button>
            </Box>
            <Stack divider={<Divider flexItem />} spacing={2}>
              {projects
                .filter((project) => project.status !== "Completed")
                .slice(0, 4)
                .map((project) => {
                  const progress = Math.round(
                    (project.completed / project.total) * 100,
                  );
                  return (
                    <Box
                      component={Link}
                      to="/"
                      key={project.id}
                      className="overview-item-link"
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                        className="inline-center"
                        sx={{ justifyContent: "space-between" }}
                      >
                        <Typography className="strong-copy">
                          {project.name}
                        </Typography>
                        <Chip
                          size="small"
                          color={statusTone[project.status]}
                          label={project.status}
                        />
                      </Stack>
                      <Box className="progress-copy">
                        <Typography variant="caption" color="text.secondary">
                          {project.completed} of {project.total} tasks · due{" "}
                          {project.due}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {progress}%
                        </Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={progress} />
                    </Box>
                  );
                })}
            </Stack>
          </Box>
          <Box component="section" className="overview-panel">
            <Box className="panel-heading">
              <Stack direction="row" spacing={1} className="inline-center">
                <ListChecks size={20} />
                <Typography variant="h3">Up next</Typography>
              </Stack>
              <Button
                component={Link}
                to="/tasks"
                endIcon={<ArrowRight size={16} />}
                size="small"
              >
                All tasks
              </Button>
            </Box>
            <Stack divider={<Divider flexItem />} spacing={2}>
              {tasks
                .filter((task) => task.status !== "Done")
                .slice(0, 4)
                .map((task) => (
                  <Box
                    component={Link}
                    to="/tasks"
                    key={task.id}
                    className="overview-item-link"
                  >
                    <Stack
                      direction="row"
                      spacing={1.25}
                      className="inline-center"
                    >
                      <Box className="task-checkbox" />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography className="strong-copy overview-task-title">
                          {task.title}
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={0.75}
                          className="inline-center"
                        >
                          <CalendarDays size={14} />
                          <Typography variant="caption" color="text.secondary">
                            {task.due} ·{" "}
                            {getProjectName(workspace, task.projectId)}
                          </Typography>
                        </Stack>
                      </Box>
                      <Typography variant="caption" className="strong-copy">
                        {task.progress}%
                      </Typography>
                    </Stack>
                  </Box>
                ))}
            </Stack>
          </Box>
        </Box>
        <Box component="section" className="overview-panel">
          <Box className="panel-heading">
            <Stack direction="row" spacing={1} className="inline-center">
              <Sprout size={20} />
              <Typography variant="h3">Skills on the shelf</Typography>
            </Stack>
            <Button
              component={Link}
              to="/skills"
              endIcon={<ArrowRight size={16} />}
              size="small"
            >
              All skills
            </Button>
          </Box>
          <Box className="skill-strip">
            {skills.map((skill) => (
              <Box
                component={Link}
                to="/skills"
                key={skill.id}
                className="skill-mini overview-item-link"
              >
                <Stack direction="row" spacing={1} className="inline-center">
                  <Box className="skill-icon">
                    <Flame size={16} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography className="strong-copy skill-mini-name">
                      {skill.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {skill.level}
                    </Typography>
                  </Box>
                </Stack>
                <LinearProgress variant="determinate" value={skill.progress} />
              </Box>
            ))}
          </Box>
        </Box>
        <Box component="section" className="cozy-note">
          <Avatar className="cozy-note-avatar">
            <Leaf size={18} />
          </Avatar>
          <Box>
            <Typography className="strong-copy">A gentle nudge</Typography>
            <Typography variant="body2" color="text.secondary">
              The quickstart guide is closest to done — one quiet hour could
              wrap it up. No rush, just a cozy place to land. ☕
            </Typography>
          </Box>
        </Box>
      </Box>
    </RayoShell>
  );
}
