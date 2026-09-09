import {
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  Menu,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  Archive,
  Clock3,
  Download,
  ExternalLink,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useMemo, useState, type ChangeEvent, type MouseEvent } from "react";
import { RayoShell } from "@/components/rayo";
import { getProjectProgress } from "@/features/workspace/selectors";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import {
  projectStatuses,
  type Project,
  type ProjectStatus,
} from "@/features/workspace/types";

const statusTone: Record<
  ProjectStatus,
  "warning" | "success" | "default" | "info"
> = {
  "In progress": "warning",
  Completed: "success",
  Paused: "default",
  Planning: "info",
};

type ProjectDraft = Pick<
  Project,
  "name" | "description" | "details" | "referenceUrl" | "status" | "tags"
>;
const emptyDraft: ProjectDraft = {
  name: "",
  description: "",
  details: "",
  referenceUrl: "",
  status: "Planning",
  tags: [],
};

export function ProjectsPage() {
  const {
    projects,
    tags,
    addProject,
    updateProject,
    deleteProject,
    addTag,
    removeTag,
    exportWorkspace,
    importWorkspace,
  } = useWorkspace();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "All">("All");
  const [tagFilter, setTagFilter] = useState("All tags");
  const [dialog, setDialog] = useState<
    "create" | "edit" | "detail" | "tags" | null
  >(null);
  const [selected, setSelected] = useState<Project | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [draft, setDraft] = useState<ProjectDraft>(emptyDraft);
  const [newTag, setNewTag] = useState("");

  const filtered = useMemo(
    () =>
      projects.filter((project) => {
        const searchText =
          `${project.name} ${project.description} ${project.tags.join(" ")}`.toLowerCase();
        return (
          searchText.includes(query.toLowerCase()) &&
          (status === "All" || project.status === status) &&
          (tagFilter === "All tags" || project.tags.includes(tagFilter))
        );
      }),
    [projects, query, status, tagFilter],
  );

  const openCreate = () => {
    setDraft(emptyDraft);
    setSelected(null);
    setDialog("create");
  };
  const openEdit = (project: Project) => {
    setSelected(project);
    setDraft({
      name: project.name,
      description: project.description,
      details: project.details,
      referenceUrl: project.referenceUrl,
      status: project.status,
      tags: project.tags,
    });
    setDialog("edit");
    setMenuAnchor(null);
  };
  const saveProject = () => {
    if (!draft.name.trim()) return;
    if (dialog === "edit" && selected)
      updateProject({ ...selected, ...draft, name: draft.name.trim() });
    else
      addProject({
        ...draft,
        name: draft.name.trim(),
        completed: 0,
        total: 12,
        due: "Not set",
        people: ["RA"],
      });
    setDialog(null);
  };
  const removeProject = (project: Project) => {
    if (!window.confirm(`Delete “${project.name}” and its related tasks?`))
      return;
    deleteProject(project.id);
    setMenuAnchor(null);
    setDialog(null);
  };
  const toggleProjectCompleted = () => {
    if (!selected) return;
    updateProject({
      ...selected,
      status: selected.status === "Completed" ? "In progress" : "Completed",
    });
    setMenuAnchor(null);
  };
  const createTag = () => {
    const tag = newTag.trim();
    if (tag) addTag(tag);
    setNewTag("");
  };
  const downloadWorkspace = () => {
    const blob = new Blob([exportWorkspace()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "rayo-plan-workspace.json";
    link.click();
    URL.revokeObjectURL(url);
  };
  const importWorkspaceFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const success = importWorkspace(await file.text());
    window.alert(
      success
        ? "Workspace imported."
        : "This file is not a valid Rayo workspace.",
    );
    event.target.value = "";
  };

  return (
    <RayoShell
      active="Projects"
      onTags={() => setDialog("tags")}
      progress={getProjectProgress(projects)}
    >
      <Box className="content-wrap">
        <Box className="page-heading">
          <Box>
            <Typography variant="h1">Your projects</Typography>
            <Typography color="text.secondary" className="heading-subtitle">
              Keep the important work moving, one calm step at a time.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} className="project-actions">
            <Button
              component="label"
              variant="outlined"
              startIcon={<Upload size={17} />}
            >
              Import
              <input
                hidden
                accept="application/json"
                type="file"
                onChange={importWorkspaceFile}
              />
            </Button>
            <Button
              variant="outlined"
              startIcon={<Download size={17} />}
              onClick={downloadWorkspace}
            >
              Export
            </Button>
            <Button
              variant="contained"
              startIcon={<Plus size={18} />}
              onClick={openCreate}
            >
              New project
            </Button>
          </Stack>
        </Box>
        <Box className="filters-row">
          <TextField
            size="small"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects"
            className="search-field"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Stack direction="row" spacing={1} className="filter-scroll">
            {(["All", ...projectStatuses] as const).map((item) => (
              <Chip
                key={item}
                label={item}
                clickable
                color={status === item ? "primary" : "default"}
                variant={status === item ? "filled" : "outlined"}
                onClick={() => setStatus(item)}
              />
            ))}
          </Stack>
          <FormControl size="small" className="tag-select">
            <InputLabel>Tag</InputLabel>
            <Select
              label="Tag"
              value={tagFilter}
              onChange={(event) => setTagFilter(event.target.value)}
            >
              <MenuItem value="All tags">All tags</MenuItem>
              {tags.map((tag) => (
                <MenuItem key={tag} value={tag}>
                  {tag}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box className="results-line">
          <Typography className="strong-copy">
            {filtered.length} {filtered.length === 1 ? "project" : "projects"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Sorted by recent activity
          </Typography>
        </Box>
        {filtered.length ? (
          <Box className="project-grid">
            {filtered.map((project) => {
              const percentage = Math.round(
                (project.completed / project.total) * 100,
              );
              return (
                <Box
                  component="article"
                  className="project-card"
                  key={project.id}
                  onClick={() => {
                    setSelected(project);
                    setDialog("detail");
                  }}
                >
                  <Box className="card-top">
                    <Chip
                      size="small"
                      color={statusTone[project.status]}
                      label={project.status}
                    />
                    <IconButton
                      aria-label={`More options for ${project.name}`}
                      size="small"
                      onClick={(event: MouseEvent<HTMLElement>) => {
                        event.stopPropagation();
                        setSelected(project);
                        setMenuAnchor(event.currentTarget);
                      }}
                    >
                      <MoreHorizontal size={20} />
                    </IconButton>
                  </Box>
                  <Typography variant="h3">{project.name}</Typography>
                  <Typography className="project-description">
                    {project.description}
                  </Typography>
                  <Stack direction="row" className="chip-stack">
                    {project.tags.map((tag) => (
                      <Chip
                        key={tag}
                        size="small"
                        label={tag}
                        className="tag-chip"
                      />
                    ))}
                  </Stack>
                  <Box className="progress-copy">
                    <Typography variant="caption" className="strong-copy">
                      {project.completed} of {project.total} tasks
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {percentage}%
                    </Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={percentage} />
                  <Divider />
                  <Box className="card-footer">
                    <Stack
                      direction="row"
                      spacing={0.75}
                      className="inline-center"
                    >
                      <Clock3 size={16} />
                      <Typography variant="caption">
                        Due {project.due}
                      </Typography>
                    </Stack>
                    <AvatarGroup max={3}>
                      {project.people.map((person) => (
                        <Avatar key={person}>{person}</Avatar>
                      ))}
                    </AvatarGroup>
                  </Box>
                </Box>
              );
            })}
          </Box>
        ) : (
          <Box className="empty-state">
            <Box className="empty-illustration">
              <Archive size={36} />
            </Box>
            <Typography variant="h2">A little more breathing room</Typography>
            <Typography color="text.secondary">
              No projects match these filters. Clear them, or start something
              new. ✨
            </Typography>
            <Button
              variant="contained"
              startIcon={<Plus size={18} />}
              onClick={openCreate}
            >
              Create a project
            </Button>
          </Box>
        )}
      </Box>
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => selected && openEdit(selected)}>
          Edit project
        </MenuItem>
        <MenuItem onClick={toggleProjectCompleted}>Toggle completed</MenuItem>
        <Divider />
        <MenuItem
          className="danger-item"
          onClick={() => selected && removeProject(selected)}
        >
          <Trash2 size={16} /> Delete
        </MenuItem>
      </Menu>
      <Dialog
        open={dialog === "create" || dialog === "edit"}
        onClose={() => setDialog(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle component="div">
          <Typography variant="h2">
            {dialog === "edit" ? "Edit project" : "Create a new project"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Give the work a clear home. You can refine the details anytime.
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.25} className="dialog-stack">
            <TextField
              autoFocus
              label="Project name"
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
            />
            <TextField
              label="What are you making?"
              multiline
              rows={3}
              value={draft.description}
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
            />
            <TextField
              label="Project details"
              multiline
              rows={4}
              value={draft.details}
              onChange={(event) =>
                setDraft({ ...draft, details: event.target.value })
              }
              helperText="Context, goals, decisions, or acceptance notes."
            />
            <TextField
              label="Reference link"
              type="url"
              value={draft.referenceUrl}
              onChange={(event) =>
                setDraft({ ...draft, referenceUrl: event.target.value })
              }
              placeholder="https://…"
            />
            <FormControl>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={draft.status}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    status: event.target.value as ProjectStatus,
                  })
                }
              >
                {projectStatuses.map((item) => (
                  <MenuItem key={item} value={item}>
                    {item}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box>
              <Typography variant="body2" className="form-label">
                Tags
              </Typography>
              <Stack direction="row" className="chip-stack">
                {tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    clickable
                    color={draft.tags.includes(tag) ? "secondary" : "default"}
                    variant={draft.tags.includes(tag) ? "filled" : "outlined"}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        tags: draft.tags.includes(tag)
                          ? draft.tags.filter((item) => item !== tag)
                          : [...draft.tags, tag],
                      })
                    }
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setDialog(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={saveProject}
            disabled={!draft.name.trim()}
          >
            {dialog === "edit" ? "Save changes" : "Create project"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={dialog === "detail"}
        onClose={() => setDialog(null)}
        fullWidth
        maxWidth="sm"
      >
        {selected && (
          <>
            <DialogTitle component="div" className="detail-title">
              <Box>
                <Chip
                  size="small"
                  color={statusTone[selected.status]}
                  label={selected.status}
                />
                <Typography variant="h2" className="detail-name">
                  {selected.name}
                </Typography>
              </Box>
              <IconButton aria-label="Close" onClick={() => setDialog(null)}>
                <X />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Typography color="text.secondary" className="detail-description">
                {selected.description}
              </Typography>
              {selected.details && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  className="project-details"
                >
                  {selected.details}
                </Typography>
              )}
              <Stack direction="row" spacing={1} className="project-links">
                <Button
                  component={Link}
                  to="/tasks"
                  size="small"
                  variant="outlined"
                >
                  View tasks
                </Button>
                {selected.referenceUrl && (
                  <Button
                    component="a"
                    href={selected.referenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    size="small"
                    endIcon={<ExternalLink size={15} />}
                  >
                    Reference
                  </Button>
                )}
              </Stack>
              <Stack direction="row" className="detail-tags">
                {selected.tags.map((tag) => (
                  <Chip key={tag} label={tag} className="tag-chip" />
                ))}
              </Stack>
              <Box className="detail-progress">
                <Typography className="strong-copy">Task progress</Typography>
                <Typography>
                  {selected.completed} / {selected.total}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(selected.completed / selected.total) * 100}
              />
              <Box className="detail-note">
                <Sparkles size={18} />
                <Typography variant="body2">
                  Nice work — this project has a clear next step and a steady
                  pace.
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button
                color="inherit"
                startIcon={<Trash2 size={17} />}
                onClick={() => removeProject(selected)}
              >
                Delete
              </Button>
              <Button variant="contained" onClick={() => openEdit(selected)}>
                Edit project
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
      <Dialog
        open={dialog === "tags"}
        onClose={() => setDialog(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle component="div">
          <Typography variant="h2">Your tags</Typography>
          <Typography variant="body2" color="text.secondary">
            Keep labels simple and useful.
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack direction="row" spacing={1} className="dialog-stack">
            <TextField
              size="small"
              fullWidth
              label="New tag"
              value={newTag}
              onChange={(event) => setNewTag(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  createTag();
                }
              }}
            />
            <IconButton
              color="primary"
              aria-label="Add tag"
              onClick={createTag}
            >
              <Plus />
            </IconButton>
          </Stack>
          <Stack spacing={1} className="tag-list">
            {tags.map((tag) => (
              <Box key={tag} className="tag-row">
                <Chip label={tag} />
                <IconButton
                  size="small"
                  aria-label={`Remove ${tag}`}
                  onClick={() => removeTag(tag)}
                >
                  <X size={17} />
                </IconButton>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setDialog(null)}>
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </RayoShell>
  );
}
