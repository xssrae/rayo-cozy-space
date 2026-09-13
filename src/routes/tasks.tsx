import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarDays,
  CircleCheckBig,
  Columns3,
  LayoutGrid,
  ListChecks,
  Plus,
} from "lucide-react";
import { useMemo, useState } from "react";
import { RayoShell } from "@/components/rayo";
import { getProjectName } from "@/features/workspace/selectors";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { taskStatuses, type TaskStatus } from "@/features/workspace/types";
import { requireSignedIn } from "@/lib/route-auth";

export const Route = createFileRoute("/tasks")({
  beforeLoad: ({ location }) => requireSignedIn(location.href),
  validateSearch: (search: Record<string, unknown>) => ({
    skill: typeof search["skill"] === "string" ? search["skill"] : undefined,
    tag: typeof search["tag"] === "string" ? search["tag"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Tasks — Rayo Plan" },
      {
        name: "description",
        content:
          "A cozy view of every task, with due dates, progress, and a quick way to add what's next.",
      },
    ],
  }),
  component: TasksPage,
});

const taskTone: Record<TaskStatus, "default" | "warning" | "success"> = {
  "To do": "default",
  Doing: "warning",
  Done: "success",
};

function TasksPage() {
  const crossFilter = Route.useSearch();
  const workspace = useWorkspace();
  const { tasks, projects, activeFocus, addTask, toggleTaskDone } = workspace;
  const [filter, setFilter] = useState<TaskStatus | "All">("All");
  const [view, setView] = useState<"grid" | "kanban">("grid");
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [due, setDue] = useState("");
  const filtered = useMemo(
    () => tasks.filter((task) => (filter === "All" || task.status === filter) && (!crossFilter.skill || task.skillIds.includes(crossFilter.skill)) && (!crossFilter.tag || task.tagIds.includes(crossFilter.tag))),
    [tasks, filter, crossFilter.skill, crossFilter.tag],
  );
  const doneCount = tasks.filter((task) => task.status === "Done").length;
  const weekProgress = tasks.length
    ? Math.round((doneCount / tasks.length) * 100)
    : 0;
  const addNewTask = () => {
    if (!title.trim() || !projectId) return;
    addTask({
      title: title.trim(),
      projectId,
      status: "To do",
      progress: 0,
      due: due
        ? new Date(`${due}T12:00:00`).toLocaleDateString("en-US", {
            month: "short",
            day: "2-digit",
          })
        : "Not set",
      dueDate: due || null,
      skillIds: [],
      tagIds: [],
      updatedAt: new Date().toISOString(),
      people: ["RA"],
    });
    setTitle("");
    setDue("");
  };
  return (
    <RayoShell active="Tasks" progress={weekProgress}>
      <Box className="content-wrap">
        <Box className="page-heading">
          <Box>
            <Typography variant="h1">Your tasks</Typography>
            <Typography color="text.secondary" className="heading-subtitle">
              Small steps, warmly kept. Add what's next and keep the pace
              gentle.
            </Typography>
          </Box>
        </Box>
        <Box
          component="form"
          className="quick-create"
          onSubmit={(event) => {
            event.preventDefault();
            addNewTask();
          }}
        >
          <TextField
            size="small"
            fullWidth
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Quick add a task — what needs doing?"
            className="quick-create-title"
          />
          <Select
            size="small"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="quick-create-project"
          >
            {projects.map((project) => (
              <MenuItem key={project.id} value={project.id}>
                {project.name}
              </MenuItem>
            ))}
          </Select>
          <TextField
            size="small"
            type="date"
            value={due}
            onChange={(event) => setDue(event.target.value)}
            className="quick-create-date"
            aria-label="Due date"
          />
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            type="submit"
            disabled={!title.trim() || !projectId}
          >
            Add task
          </Button>
        </Box>
        <Box className="filters-row">
          <Stack direction="row" spacing={1} className="filter-scroll">
            {(["All", ...taskStatuses] as const).map((item) => (
              <Chip
                key={item}
                label={item}
                clickable
                color={filter === item ? "primary" : "default"}
                variant={filter === item ? "filled" : "outlined"}
                onClick={() => setFilter(item)}
              />
            ))}
          </Stack>
          <Stack direction="row" spacing={0.5}>
            <Button
              size="small"
              variant={view === "grid" ? "contained" : "outlined"}
              startIcon={<LayoutGrid size={16} />}
              onClick={() => setView("grid")}
            >
              List
            </Button>
            <Button
              size="small"
              variant={view === "kanban" ? "contained" : "outlined"}
              startIcon={<Columns3 size={16} />}
              onClick={() => setView("kanban")}
            >
              Kanban
            </Button>
          </Stack>
        </Box>
        <Box className="results-line">
          <Typography className="strong-copy">
            {filtered.length} {filtered.length === 1 ? "task" : "tasks"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {doneCount} of {tasks.length} done this week
          </Typography>
        </Box>
        {filtered.length && view === "grid" ? (
          <Box className="project-grid">
            {filtered.map((task) => (
              <Box component="article" className="task-card" key={task.id}>
                <Box className="card-top">
                  <Chip
                    size="small"
                    color={taskTone[task.status]}
                    label={task.status}
                  />
                  {activeFocus?.taskId === task.id && <Chip size="small" color="primary" label="In focus" />}
                  <Typography variant="caption" color="text.secondary">
                    {getProjectName(workspace, task.projectId)}
                  </Typography>
                </Box>
                <Stack
                  direction="row"
                  spacing={1}
                  className="inline-center task-title-row"
                >
                  <Checkbox
                    checked={task.status === "Done"}
                    onChange={() => toggleTaskDone(task.id)}
                    icon={<Box className="task-checkbox" />}
                    checkedIcon={<CircleCheckBig size={22} />}
                    color="success"
                    aria-label={`Mark ${task.title} done`}
                  />
                  <Typography
                    variant="h3"
                    className={task.status === "Done" ? "task-done-title" : ""}
                  >
                    {task.title}
                  </Typography>
                </Stack>
                <Box className="progress-copy">
                  <Typography variant="caption" className="strong-copy">
                    Progress
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {task.progress}%
                  </Typography>
                </Box>
                <LinearProgress variant="determinate" value={task.progress} />
                <Divider />
                <Box className="card-footer">
                  <Stack
                    direction="row"
                    spacing={0.75}
                    className="inline-center"
                  >
                    <CalendarDays size={16} />
                    <Typography variant="caption">Due {task.due}</Typography>
                  </Stack>
                  <Stack direction="row">
                    {task.people.map((person) => (
                      <Avatar key={person}>{person}</Avatar>
                    ))}
                  </Stack>
                </Box>
              </Box>
            ))}
          </Box>
        ) : filtered.length ? (
          <Box className="kanban-board" aria-label="Tasks by status">
            {taskStatuses.map((column) => {
              const columnTasks = filtered.filter(
                (task) => task.status === column,
              );
              return (
                <Box component="section" className="kanban-column" key={column}>
                  <Box className="kanban-column-heading">
                    <Chip
                      size="small"
                      color={taskTone[column]}
                      label={column}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {columnTasks.length}
                    </Typography>
                  </Box>
                  <Stack spacing={1.25}>
                    {columnTasks.map((task) => (
                      <Box className="kanban-task" key={task.id}>
                        <Stack
                          direction="row"
                          spacing={1}
                          className="task-title-row"
                        >
                          <Checkbox
                            checked={task.status === "Done"}
                            onChange={() => toggleTaskDone(task.id)}
                            icon={<Box className="task-checkbox" />}
                            checkedIcon={<CircleCheckBig size={22} />}
                            color="success"
                            aria-label={`Mark ${task.title} done`}
                          />
                          <Typography
                            className={
                              task.status === "Done"
                                ? "task-done-title"
                                : "strong-copy"
                            }
                          >
                            {task.title}
                          </Typography>
                          {activeFocus?.taskId === task.id && <Chip size="small" color="primary" label="In focus" />}
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {getProjectName(workspace, task.projectId)}
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={0.75}
                          className="inline-center"
                        >
                          <CalendarDays size={14} />
                          <Typography variant="caption">
                            Due {task.due}
                          </Typography>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              );
            })}
          </Box>
        ) : (
          <Box className="empty-state">
            <Box className="empty-illustration">
              <ListChecks size={36} />
            </Box>
            <Typography variant="h2">Nothing here — lovely</Typography>
            <Typography color="text.secondary">
              No tasks match this filter. Switch filters, or add the next small
              step above. ✨
            </Typography>
          </Box>
        )}
      </Box>
    </RayoShell>
  );
}
