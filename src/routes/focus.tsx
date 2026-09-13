import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, MenuItem, Paper, Select, Stack, TextField, Typography } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { Coffee, Pause, Play, RotateCcw, Square, Timer, Wind } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RayoShell } from "@/components/rayo";
import { remainingFocusSeconds } from "@/features/reports/metrics";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import type { BreakType, FocusPreset } from "@/features/workspace/types";
import { requireSignedIn } from "@/lib/route-auth";
import { cancelFocusFn, completeBreakFn, completeFocusFn, pauseFocusFn, resumeFocusFn, startBreakFn, startFocusFn } from "@/server/focus.functions";

export const Route = createFileRoute("/focus")({ beforeLoad: ({ location }) => requireSignedIn(location.href), component: FocusPage });
const presets: Record<Exclude<FocusPreset, "custom">, { label: string; focus: number; pause: number }> = {
  classic: { label: "Clássico · 25 / 5", focus: 25 * 60, pause: 5 * 60 }, deep_work: { label: "Foco profundo · 50 / 10", focus: 50 * 60, pause: 10 * 60 },
};

function FocusPage() {
  const workspace = useWorkspace(); const { projects, tasks, activeFocus, activeBreak, focusSessions, refresh } = workspace;
  const suggested = useMemo(() => {
    const doing = tasks
      .filter((task) => task.status === "Doing")
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    return doing ?? tasks
      .filter((task) => task.status !== "Done")
      .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"))[0];
  }, [tasks]);
  const [projectId, setProjectId] = useState(suggested?.projectId ?? projects[0]?.id ?? ""); const [taskId, setTaskId] = useState<string>(suggested?.id ?? "");
  const [preset, setPreset] = useState<Exclude<FocusPreset, "custom">>("classic"); const [now, setNow] = useState(Date.now()); const [busy, setBusy] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false); const [completedId, setCompletedId] = useState<string | null>(null); const [error, setError] = useState("");
  const [durationOpen, setDurationOpen] = useState(false); const [actualMinutes, setActualMinutes] = useState(25);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { if (!projectId && projects[0]) setProjectId(projects[0].id); }, [projects, projectId]);
  const remaining = activeFocus ? remainingFocusSeconds(activeFocus, now) : presets[preset].focus;
  const breakRemaining = activeBreak ? Math.max(0, activeBreak.plannedSeconds - Math.floor((now - new Date(activeBreak.startedAt).getTime()) / 1000)) : 0;
  const visibleTasks = tasks.filter((task) => task.projectId === projectId && task.status !== "Done");
  const act = async (operation: () => Promise<unknown>) => { setBusy(true); setError(""); try { await operation(); await refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Ocorreu um erro. Tente novamente."); } finally { setBusy(false); } };
  const complete = async (seconds?: number) => { if (!activeFocus) return; const id = activeFocus.id; await act(() => completeFocusFn({ data: { id, actualSeconds: seconds ?? activeFocus.plannedSeconds } })); setDurationOpen(false); setCompletedId(id); setCompleteOpen(true); };
  const startBreak = async (type: BreakType) => { if (!completedId) return; await act(() => startBreakFn({ data: { focusSessionId: completedId, type, plannedSeconds: type === "long" ? 15 * 60 : presets[preset].pause } })); setCompleteOpen(false); };
  const todayKey = new Date().toDateString(); const todaySessions = focusSessions.filter((session) => session.status === "completed" && session.endedAt && new Date(session.endedAt).toDateString() === todayKey).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return <RayoShell active="Focus" progress={Math.min(100, todaySessions.length * 25)}><Box className="content-wrap focus-layout">
    <Box className="page-heading"><Box><Typography variant="h1">Seu momento de foco</Typography><Typography color="text.secondary" className="heading-subtitle">Uma coisa de cada vez. Seu cronômetro continua mesmo se você sair da página.</Typography></Box></Box>
    {error && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}
    <Box className="focus-grid">
      <Paper className="timer-card">
        <Stack direction="row" spacing={1} sx={{ justifyContent: "center" }}>{Object.entries(presets).map(([key, item]) => <Chip key={key} label={item.label} clickable color={preset === key ? "primary" : "default"} onClick={() => !activeFocus && setPreset(key as typeof preset)} />)}</Stack>
        <Box className={`timer-orb ${activeFocus?.status === "paused" || activeBreak ? "is-paused" : ""}`}><Timer size={34} /><Typography className="timer-value">{String(Math.floor((activeBreak ? breakRemaining : remaining) / 60)).padStart(2, "0")}:{String((activeBreak ? breakRemaining : remaining) % 60).padStart(2, "0")}</Typography><Typography color="text.secondary">{activeBreak ? "Uma pausa tranquila" : activeFocus?.status === "paused" ? "Pausado — respire um pouco" : activeFocus ? "Concentre-se no presente" : "Comece quando estiver pronto"}</Typography></Box>
        {activeBreak ? <Stack spacing={2} sx={{ alignItems: "center" }}><Alert severity="info">{activeBreak.type === "active" ? "Alongue-se, respire e descanse os olhos." : "Sua pausa está em andamento."}</Alert><Button variant="contained" startIcon={<Play />} onClick={() => act(() => completeBreakFn({ data: { id: activeBreak.id } }))}>{breakRemaining === 0 ? "Encerrar pausa" : "Voltar ao foco"}</Button></Stack> : !activeFocus ? <Stack spacing={2}>
          <Select value={projectId} displayEmpty onChange={(event) => { setProjectId(event.target.value); setTaskId(""); }}><MenuItem value="" disabled>Escolha um projeto</MenuItem>{projects.map((project) => <MenuItem value={project.id} key={project.id}>{project.name}</MenuItem>)}</Select>
          <Select value={taskId} displayEmpty onChange={(event) => setTaskId(event.target.value)}><MenuItem value="">Foco no projeto (sem tarefa)</MenuItem>{visibleTasks.map((task) => <MenuItem value={task.id} key={task.id}>{task.title}</MenuItem>)}</Select>
          <Button variant="contained" size="large" startIcon={<Play />} disabled={!projectId || busy} onClick={() => act(() => startFocusFn({ data: { projectId, taskId: taskId || null, preset, plannedSeconds: presets[preset].focus } }))}>Iniciar foco</Button>
        </Stack> : <Stack direction="row" spacing={1.5} sx={{ justifyContent: "center", flexWrap: "wrap" }}>
          {activeFocus.status === "paused" ? <Button variant="contained" startIcon={<Play />} disabled={busy} onClick={() => act(() => resumeFocusFn({ data: { id: activeFocus.id } }))}>Retomar</Button> : <Button variant="outlined" startIcon={<Pause />} disabled={busy} onClick={() => act(() => pauseFocusFn({ data: { id: activeFocus.id } }))}>Pausar</Button>}
          <Button variant="contained" color="success" startIcon={<Square />} disabled={busy} onClick={() => { if (remaining === 0) { setActualMinutes(Math.round(activeFocus.plannedSeconds / 60)); setDurationOpen(true); } else void complete(); }}>Concluir</Button>
          <Button color="inherit" startIcon={<RotateCcw />} disabled={busy} onClick={() => act(() => cancelFocusFn({ data: { id: activeFocus.id } }))}>Cancelar</Button>
        </Stack>}
      </Paper>
      <Paper className="focus-timeline"><Typography variant="h2">Hoje</Typography><Typography color="text.secondary">Um registro pessoal do seu progresso.</Typography><Divider sx={{ my: 2 }} />
        {todaySessions.length ? <Stack spacing={1.5}>{todaySessions.map((session) => <Box className="timeline-row" key={session.id}><Box className="timeline-dot" /><Box><Typography className="strong-copy">{tasks.find((task) => task.id === session.taskId)?.title ?? projects.find((project) => project.id === session.projectId)?.name ?? "Sessão de foco"}</Typography><Typography variant="caption" color="text.secondary">{new Date(session.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {Math.round((session.actualSeconds ?? 0) / 60)} min</Typography></Box></Box>)}</Stack> : <Typography color="text.secondary">Suas sessões de foco concluídas aparecerão aqui.</Typography>}
      </Paper>
    </Box>
    <Dialog open={completeOpen} onClose={() => setCompleteOpen(false)} fullWidth maxWidth="xs"><DialogTitle>Muito bem!</DialogTitle><DialogContent><Typography color="text.secondary">Aproveite os próximos minutos para descansar. Escolha uma pausa ou continue quando quiser.</Typography></DialogContent><DialogActions className="break-actions"><Button startIcon={<Coffee />} onClick={() => startBreak("short")}>Pausa curta</Button><Button startIcon={<Wind />} onClick={() => startBreak("active")}>Pausa ativa</Button><Button onClick={() => startBreak("long")}>Pausa longa</Button></DialogActions></Dialog>
    <Dialog open={durationOpen} onClose={() => setDurationOpen(false)} fullWidth maxWidth="xs"><DialogTitle>Boas-vindas de volta</DialogTitle><DialogContent><Typography color="text.secondary" sx={{ mb: 2 }}>O tempo planejado terminou enquanto você estava fora. Confirme quantos minutos você dedicou ao foco.</Typography><TextField label="Minutos de foco" type="number" fullWidth value={actualMinutes} onChange={(event) => setActualMinutes(Math.max(1, Number(event.target.value)))} slotProps={{ htmlInput: { min: 1 } }} /></DialogContent><DialogActions><Button onClick={() => setDurationOpen(false)}>Continuar contando</Button><Button variant="contained" onClick={() => complete(actualMinutes * 60)}>Concluir sessão</Button></DialogActions></Dialog>
  </Box></RayoShell>;
}
