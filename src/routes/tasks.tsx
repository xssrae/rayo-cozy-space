import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Columns3,
  FileText,
  GripVertical,
  LayoutGrid,
  Plus,
  X,
} from "lucide-react";
import { useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { RayoShell } from "@/components/rayo";
import { getProjectName } from "@/features/workspace/selectors";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import {
  taskStatuses,
  type Task,
  type TaskStatus,
} from "@/features/workspace/types";
import { label } from "@/lib/labels";
import { requireSignedIn } from "@/lib/route-auth";

export const Route = createFileRoute("/tasks")({
  beforeLoad: ({ location }) => requireSignedIn(location.href),
  validateSearch: (search: Record<string, unknown>) => ({
    skill: typeof search["skill"] === "string" ? search["skill"] : undefined,
    tag: typeof search["tag"] === "string" ? search["tag"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Tarefas — Rayo Plan" },
      {
        name: "description",
        content:
          "Organize suas tarefas em um quadro Kanban e avance no seu ritmo.",
      },
    ],
  }),
  component: TasksPage,
});
const tones: Record<TaskStatus, "default" | "warning" | "success"> = {
  "To do": "default",
  Doing: "warning",
  Done: "success",
};

function TasksPage() {
  const workspace = useWorkspace();
  const search = Route.useSearch();
  const [view, setView] = useState<"kanban" | "grid">("kanban");
  const [filter, setFilter] = useState<TaskStatus | "All">("All");
  const [project, setProject] = useState("");
  const projectId = workspace.projects.some((item) => item.id === project)
    ? project
    : (workspace.projects[0]?.id ?? "");
  const [draft, setDraft] = useState<Task | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [optimistic, setOptimistic] = useState<Task | null>(null);
  const [drag, setDrag] = useState<{ task: Task; x: number; y: number } | null>(
    null,
  );
  const [over, setOver] = useState<TaskStatus | null>(null);
  const gesture = useRef<{
    task: Task;
    x: number;
    y: number;
    moving: boolean;
  } | null>(null);
  const board = useRef<HTMLDivElement>(null);
  const rectangles = useRef(new Map<string, DOMRect>());
  const tasks = workspace.tasks.map((task) =>
    optimistic?.id === task.id ? optimistic : task,
  );
  const filtered = tasks.filter(
    (task) =>
      (filter === "All" || task.status === filter) &&
      (!search.skill || task.skillIds.includes(search.skill)) &&
      (!search.tag || task.tagIds.includes(search.tag)),
  );
  const done = tasks.filter((task) => task.status === "Done").length;

  useLayoutEffect(() => {
    const next = new Map<string, DOMRect>();
    board.current
      ?.querySelectorAll<HTMLElement>("[data-task-id]")
      .forEach((node) => {
        const id = node.dataset["taskId"]!;
        const rect = node.getBoundingClientRect();
        const previous = rectangles.current.get(id);
        next.set(id, rect);
        if (
          previous &&
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
          const x = previous.left - rect.left;
          const y = previous.top - rect.top;
          if (x || y)
            node.animate(
              [
                { transform: "translate(" + x + "px," + y + "px)" },
                { transform: "translate(0, 0)" },
              ],
              { duration: 240, easing: "cubic-bezier(.2,.8,.2,1)" },
            );
        }
      });
    rectangles.current = next;
  }, [workspace.tasks, optimistic, view, filter]);

  const create = async (status: TaskStatus = "To do") => {
    if (!projectId || busy) return;
    setBusy(true);
    setError("");
    try {
      await workspace.addTask({
        title: "",
        description: "",
        projectId,
        status,
        progress: status === "Done" ? 100 : 0,
        due: "Sem prazo",
        dueDate: null,
        skillIds: [],
        tagIds: [],
        updatedAt: new Date().toISOString(),
        people: [],
      });
      setFilter("All");
      setAnnouncement(
        "Cartão sem título criado em " +
          label(status) +
          ". Abra o cartão para adicionar os detalhes.",
      );
    } catch {
      setError("Não foi possível criar a tarefa. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };
  const move = async (task: Task, status: TaskStatus) => {
    if (busy || task.status === status) return;
    const updated = {
      ...task,
      status,
      progress:
        status === "Done" ? 100 : task.status === "Done" ? 0 : task.progress,
    };
    setOptimistic(updated);
    setBusy(true);
    setError("");
    try {
      await workspace.updateTask(updated);
      setAnnouncement(
        (task.title || "Sem título") + ": " + label(status) + ".",
      );
    } catch {
      setError(
        "Não foi possível mover a tarefa. Ela voltou ao status anterior.",
      );
    } finally {
      setOptimistic(null);
      setBusy(false);
    }
  };
  const save = async () => {
    if (!draft || busy) return;
    setBusy(true);
    setError("");
    try {
      await workspace.updateTask(draft);
      setDraft(null);
      setAnnouncement("Detalhes salvos.");
    } catch {
      setError(
        "Não foi possível salvar. Seus detalhes foram mantidos para tentar novamente.",
      );
    } finally {
      setBusy(false);
    }
  };
  const cancelDrag = () => {
    gesture.current = null;
    setDrag(null);
    setOver(null);
  };
  const pointerMove = (event: PointerEvent<HTMLElement>) => {
    const current = gesture.current;
    if (!current) return;
    if (
      !current.moving &&
      Math.hypot(event.clientX - current.x, event.clientY - current.y) < 6
    )
      return;
    current.moving = true;
    setDrag({ task: current.task, x: event.clientX, y: event.clientY });
    const container = board.current;
    if (container) {
      const bounds = container.getBoundingClientRect();
      if (event.clientX > bounds.right - 55) container.scrollLeft += 22;
      if (event.clientX < bounds.left + 55) container.scrollLeft -= 22;
    }
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-status]")?.dataset["status"];
    setOver(
      taskStatuses.includes(target as TaskStatus)
        ? (target as TaskStatus)
        : null,
    );
  };
  const pointerUp = (event: PointerEvent<HTMLElement>) => {
    const current = gesture.current;
    const status = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-status]")?.dataset["status"] as
      TaskStatus | undefined;
    cancelDrag();
    if (current?.moving && status && taskStatuses.includes(status))
      void move(current.task, status);
  };
  const card = (task: Task) => (
    <Box
      component="article"
      key={task.id}
      data-task-id={task.id}
      className={
        "kanban-task notion-task " +
        (drag?.task.id === task.id ? "is-dragging" : "")
      }
    >
      <Box className="task-card-heading">
        {view === "kanban" && (
          <IconButton
            className="drag-handle"
            size="small"
            disabled={busy}
            aria-label={"Arrastar " + (task.title || "tarefa sem título")}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              gesture.current = {
                task,
                x: event.clientX,
                y: event.clientY,
                moving: false,
              };
            }}
            onPointerMove={pointerMove}
            onPointerUp={pointerUp}
            onPointerCancel={cancelDrag}
            onLostPointerCapture={cancelDrag}
            onKeyDown={(event) => {
              if (event.key === "Escape") cancelDrag();
            }}
          >
            <GripVertical size={17} />
          </IconButton>
        )}
        <Button
          className={"task-open " + (task.title ? "" : "is-untitled")}
          color="inherit"
          onClick={() => {
            setError("");
            setDraft({ ...task, description: task.description ?? "" });
          }}
          aria-label={"Abrir " + (task.title || "tarefa sem título")}
        >
          <FileText size={17} />
          <span>{task.title || "Sem título"}</span>
        </Button>
      </Box>
      {task.description && (
        <Typography
          className="task-excerpt"
          variant="body2"
          color="text.secondary"
        >
          {task.description}
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary">
        {getProjectName(workspace, task.projectId)}
      </Typography>
      <Box className="task-card-meta">
        {task.dueDate && (
          <Typography variant="caption">
            Prazo:{" "}
            {new Date(task.dueDate + "T12:00:00").toLocaleDateString("pt-BR")}
          </Typography>
        )}
        {workspace.activeFocus?.taskId === task.id && (
          <Chip size="small" color="primary" label="Em foco" />
        )}
      </Box>
      <TextField
        select
        variant="standard"
        size="small"
        value={task.status}
        disabled={busy}
        onChange={(event) => void move(task, event.target.value as TaskStatus)}
        slotProps={{
          select: {
            inputProps: {
              "aria-label": "Status de " + (task.title || "tarefa sem título"),
            },
          },
        }}
      >
        {taskStatuses.map((status) => (
          <MenuItem key={status} value={status}>
            {label(status)}
          </MenuItem>
        ))}
      </TextField>
    </Box>
  );

  return (
    <RayoShell
      active="Tasks"
      progress={tasks.length ? Math.round((done / tasks.length) * 100) : 0}
    >
      <Box className="content-wrap">
        <Box className="page-heading">
          <Box>
            <Typography variant="h1">Suas tarefas</Typography>
            <Typography color="text.secondary" className="heading-subtitle">
              Comece com uma ideia. Abra um cartão para dar forma aos detalhes.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            disabled={
              !projectId ||
              busy ||
              workspace.loading ||
              Boolean(search.skill || search.tag)
            }
            onClick={() => void create()}
          >
            Nova tarefa
          </Button>
        </Box>
        <Box className="task-toolbar">
          <TextField
            select
            label="Projeto para novas tarefas"
            size="small"
            value={projectId}
            onChange={(event) => setProject(event.target.value)}
            disabled={!workspace.projects.length}
            sx={{ minWidth: 240 }}
          >
            <MenuItem value="" disabled>
              Escolha um projeto
            </MenuItem>
            {workspace.projects.map((item) => (
              <MenuItem key={item.id} value={item.id}>
                {item.name}
              </MenuItem>
            ))}
          </TextField>
          <Stack direction="row" spacing={1}>
            <Button
              aria-pressed={view === "kanban"}
              variant={view === "kanban" ? "contained" : "outlined"}
              startIcon={<Columns3 size={16} />}
              onClick={() => setView("kanban")}
            >
              Kanban
            </Button>
            <Button
              aria-pressed={view === "grid"}
              variant={view === "grid" ? "contained" : "outlined"}
              startIcon={<LayoutGrid size={16} />}
              onClick={() => setView("grid")}
            >
              Lista
            </Button>
          </Stack>
        </Box>
        <Stack
          direction="row"
          spacing={1}
          className="filter-scroll"
          sx={{ mb: 3 }}
        >
          {(["All", ...taskStatuses] as const).map((status) => (
            <Chip
              key={status}
              label={status === "All" ? "Todas" : label(status)}
              clickable
              color={filter === status ? "primary" : "default"}
              onClick={() => setFilter(status)}
            />
          ))}
        </Stack>
        {(search.skill || search.tag) && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Exibindo tarefas por habilidade ou etiqueta.{" "}
            <Link to="/tasks" search={{ skill: undefined, tag: undefined }}>
              Limpar filtros para criar tarefas
            </Link>
          </Alert>
        )}
        {workspace.loading && (
          <LinearProgress aria-label="Carregando tarefas" />
        )}
        {(error || workspace.error) && !draft && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error || "Não foi possível carregar as tarefas."}
          </Alert>
        )}
        {!workspace.loading && !workspace.projects.length && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Crie um projeto para começar a organizar suas tarefas.{" "}
            <Link to="/" search={{ skill: undefined, tag: undefined }}>
              Ir para projetos
            </Link>
          </Alert>
        )}
        <Box className="results-line">
          <Typography variant="body2">
            {filtered.length} {filtered.length === 1 ? "tarefa" : "tarefas"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {done} de {tasks.length} concluídas
          </Typography>
        </Box>
        <div className="sr-only" role="status" aria-live="polite">
          {announcement}
        </div>
        <Box
          ref={board}
          className={view === "kanban" ? "kanban-board" : "project-grid"}
          aria-label="Quadro de tarefas"
        >
          {view === "kanban"
            ? taskStatuses.map((status) => (
                <Box
                  component="section"
                  key={status}
                  data-status={status}
                  aria-label={label(status)}
                  className={
                    "kanban-column " + (over === status ? "is-drop-target" : "")
                  }
                >
                  <Box className="kanban-column-heading">
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: "center" }}
                    >
                      <Chip
                        size="small"
                        color={tones[status]}
                        label={label(status)}
                      />
                      <Typography variant="caption">
                        {
                          filtered.filter((task) => task.status === status)
                            .length
                        }
                      </Typography>
                    </Stack>
                    <IconButton
                      size="small"
                      aria-label={"Nova tarefa em " + label(status)}
                      disabled={
                        !projectId ||
                        busy ||
                        Boolean(search.skill || search.tag)
                      }
                      onClick={() => void create(status)}
                    >
                      <Plus size={17} />
                    </IconButton>
                  </Box>
                  <Stack spacing={1.5}>
                    {filtered
                      .filter((task) => task.status === status)
                      .map(card)}
                  </Stack>
                  <Button
                    className="add-card"
                    fullWidth
                    color="inherit"
                    startIcon={<Plus size={16} />}
                    disabled={
                      !projectId || busy || Boolean(search.skill || search.tag)
                    }
                    onClick={() => void create(status)}
                  >
                    Nova tarefa
                  </Button>
                  {over === status && (
                    <Box className="drop-hint">
                      Solte para mover para {label(status).toLowerCase()}
                    </Box>
                  )}
                </Box>
              ))
            : filtered.map(card)}
        </Box>
        {view === "grid" && !filtered.length && (
          <Typography sx={{ py: 5 }} color="text.secondary">
            Nenhuma tarefa neste filtro. Crie um cartão ou escolha outro status.
          </Typography>
        )}
        {view === "kanban" && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 2 }}
          >
            Arraste pela alça do cartão ou use o seletor de status para movê-lo.
          </Typography>
        )}
        {drag && (
          <Box
            className="drag-preview"
            style={{ left: drag.x + 14, top: drag.y + 12 }}
            aria-hidden="true"
          >
            <FileText size={18} />
            {drag.task.title || "Sem título"}
          </Box>
        )}
        <Dialog
          open={Boolean(draft)}
          onClose={() => {
            if (!busy) setDraft(null);
          }}
          fullWidth
          maxWidth="sm"
          aria-labelledby="task-editor-title"
        >
          <DialogTitle id="task-editor-title" className="detail-title">
            Detalhes da tarefa
            <IconButton
              aria-label="Fechar detalhes"
              disabled={busy}
              onClick={() => setDraft(null)}
            >
              <X />
            </IconButton>
          </DialogTitle>
          {draft && (
            <>
              <DialogContent>
                <Stack spacing={3} sx={{ pt: 1 }}>
                  {error && <Alert severity="error">{error}</Alert>}
                  <TextField
                    autoFocus
                    label="Título"
                    placeholder="Sem título"
                    value={draft.title}
                    disabled={busy}
                    slotProps={{ htmlInput: { maxLength: 240 } }}
                    onChange={(event) =>
                      setDraft({ ...draft, title: event.target.value })
                    }
                  />
                  <TextField
                    select
                    label="Projeto"
                    value={draft.projectId}
                    disabled
                    helperText="Esta tarefa pertence ao projeto em que foi criada."
                  >
                    {workspace.projects.map((item) => (
                      <MenuItem key={item.id} value={item.id}>
                        {item.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Status"
                    value={draft.status}
                    disabled={busy}
                    onChange={(event) => {
                      const status = event.target.value as TaskStatus;
                      setDraft({
                        ...draft,
                        status,
                        progress:
                          status === "Done"
                            ? 100
                            : draft.status === "Done"
                              ? 0
                              : draft.progress,
                      });
                    }}
                  >
                    {taskStatuses.map((status) => (
                      <MenuItem key={status} value={status}>
                        {label(status)}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Prazo"
                    type="date"
                    value={draft.dueDate ?? ""}
                    disabled={busy}
                    slotProps={{ inputLabel: { shrink: true } }}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        dueDate: event.target.value || null,
                      })
                    }
                  />
                  <TextField
                    label="Descrição"
                    placeholder="Adicione contexto, anotações ou os próximos passos…"
                    multiline
                    minRows={5}
                    value={draft.description}
                    disabled={busy}
                    slotProps={{ htmlInput: { maxLength: 10000 } }}
                    onChange={(event) =>
                      setDraft({ ...draft, description: event.target.value })
                    }
                  />
                  <Typography variant="caption" color="text.secondary">
                    O título e a descrição são opcionais. Você pode completar
                    este cartão depois.
                  </Typography>
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button disabled={busy} onClick={() => setDraft(null)}>
                  Cancelar
                </Button>
                <Button
                  variant="contained"
                  disabled={busy}
                  onClick={() => void save()}
                >
                  {busy ? "Salvando…" : "Salvar alterações"}
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Box>
    </RayoShell>
  );
}
