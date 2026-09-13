import { label } from "@/lib/labels";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Paper,
  Select,
  Stack as MuiStack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import {
  Archive,
  Blocks,
  GitMerge,
  Link2,
  Pencil,
  Plus,
  RotateCcw,
  Tag as TagIcon,
} from "lucide-react";
import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import { RayoShell } from "@/components/rayo";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import type { Skill, SkillLevel } from "@/features/workspace/types";
import { requireSignedIn } from "@/lib/route-auth";
import {
  mergeTaxonomyFn,
  setEntityTaxonomyFn,
  setTaxonomyArchivedFn,
  updateTaxonomyFn,
} from "@/server/taxonomy.functions";

export const Route = createFileRoute("/skills")({
  beforeLoad: ({ location }) => requireSignedIn(location.href),
  validateSearch: (search: Record<string, unknown>) => ({
    tab: search["tab"] === "tags" ? ("tags" as const) : ("skills" as const),
  }),
  component: SkillsPage,
});
type Kind = "skill" | "tag";
const Stack = MuiStack as unknown as ComponentType<
  Record<string, unknown> & { children?: ReactNode }
>;
function SkillsPage() {
  const search = Route.useSearch();
  const workspace = useWorkspace();
  const { skills, tagRecords, projects, tasks, addSkill, addTag, refresh } =
    workspace;
  const [tab, setTab] = useState<Kind>(search.tab === "tags" ? "tag" : "skill");
  const [showArquivado, setShowArquivado] = useState(false);
  const [name, setName] = useState("");
  const [area, setArea] = useState("Linguagens");
  const [level, setLevel] = useState<SkillLevel>("Learning");
  const [editing, setEditing] = useState<{
    kind: Kind;
    id: string;
    name: string;
  } | null>(null);
  const [mergeSource, setMergeSource] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState("");
  const [associationOpen, setAssociationOpen] = useState(false);
  const [entityKey, setEntityKey] = useState("");
  const [chosenSkills, setChosenSkills] = useState<string[]>([]);
  const [chosenTags, setChosenTags] = useState<string[]>([]);
  const records = tab === "skill" ? skills : tagRecords;
  const visible = records.filter((item) => showArquivado || !item.archived);
  const activeTargets = records.filter(
    (item) => !item.archived && item.id !== mergeSource,
  );
  const coverage = useMemo(
    () => records.reduce((total, item) => total + item.coverage, 0),
    [records],
  );
  const run = async (operation: () => Promise<unknown>) => {
    await operation();
    await refresh();
  };
  const create = async () => {
    if (!name.trim()) return;
    if (tab === "skill")
      await addSkill({
        name: name.trim(),
        area,
        level,
        progress: level === "Learning" ? 10 : level === "Comfortable" ? 50 : 90,
        archived: false,
        coverage: 0,
        focusedMinutes: 0,
        people: [],
      });
    else await addTag(name.trim());
    setName("");
  };
  const openAssociation = () => {
    const first = projects[0];
    if (first) {
      setEntityKey(`project:${first.id}`);
      setChosenSkills(first.skillIds);
      setChosenTags(
        tagRecords
          .filter((tag) => first.tags.includes(tag.name))
          .map((tag) => tag.id),
      );
    }
    setAssociationOpen(true);
  };
  const changeEntity = (value: string) => {
    setEntityKey(value);
    const [kind, id] = value.split(":");
    const entity =
      kind === "project"
        ? projects.find((item) => item.id === id)
        : tasks.find((item) => item.id === id);
    setChosenSkills(entity?.skillIds ?? []);
    setChosenTags(
      kind === "project"
        ? tagRecords
            .filter((tag) =>
              projects.find((item) => item.id === id)?.tags.includes(tag.name),
            )
            .map((tag) => tag.id)
        : entity && "tagIds" in entity
          ? entity.tagIds
          : [],
    );
  };
  const saveAssociation = async () => {
    const [entity, entityId] = entityKey.split(":") as [
      "project" | "task",
      string,
    ];
    await run(() =>
      setEntityTaxonomyFn({
        data: { entity, entityId, skillIds: chosenSkills, tagIds: chosenTags },
      }),
    );
    setAssociationOpen(false);
  };
  return (
    <RayoShell active="Skills" progress={Math.min(100, coverage * 10)}>
      <Box className="content-wrap">
        <Box className="page-heading">
          <Box>
            <Typography variant="h1">Habilidades e etiquetas</Typography>
            <Typography color="text.secondary" className="heading-subtitle">
              Acompanhe o que você aprende e organize seu trabalho com
              etiquetas.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<Link2 />}
            onClick={openAssociation}
            disabled={!projects.length}
          >
            Gerenciar associações
          </Button>
        </Box>
        <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mt: 3 }}>
          <Tab
            value="skill"
            icon={<Blocks size={18} />}
            iconPosition="start"
            label="Habilidades"
          />
          <Tab
            value="tag"
            icon={<TagIcon size={18} />}
            iconPosition="start"
            label="Etiquetas"
          />
        </Tabs>
        <Box
          component="form"
          className="quick-create"
          onSubmit={(event) => {
            event.preventDefault();
            void create();
          }}
        >
          <TextField
            size="small"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={
              tab === "skill" ? "Adicionar habilidade" : "Adicionar etiqueta"
            }
            className="quick-create-title"
          />
          {tab === "skill" && (
            <>
              <TextField
                size="small"
                value={area}
                onChange={(event) => setArea(event.target.value)}
                label="Área"
              />
              <Select
                size="small"
                value={level}
                onChange={(event) => setLevel(event.target.value as SkillLevel)}
              >
                {(["Learning", "Comfortable", "Fluent"] as const).map(
                  (item) => (
                    <MenuItem key={item} value={item}>
                      {label(item)}
                    </MenuItem>
                  ),
                )}
              </Select>
            </>
          )}
          <Button type="submit" variant="contained" startIcon={<Plus />}>
            Adicionar {tab === "skill" ? "habilidade" : "etiqueta"}
          </Button>
        </Box>
        <FormControlLabel
          sx={{ my: 2 }}
          control={
            <Checkbox
              checked={showArquivado}
              onChange={(event) => setShowArquivado(event.target.checked)}
            />
          }
          label="Mostrar arquivados"
        />
        <Box className="taxonomy-grid">
          {visible.map((item) => (
            <Paper className="taxonomy-card" key={item.id}>
              <Box className="card-top">
                <Chip
                  label={
                    item.archived
                      ? "Arquivado"
                      : tab === "skill"
                        ? label((item as Skill).level)
                        : "Etiqueta"
                  }
                  size="small"
                />
                <Stack direction="row">
                  <Button
                    size="small"
                    aria-label={`Editar ${item.name}`}
                    onClick={() =>
                      setEditing({ kind: tab, id: item.id, name: item.name })
                    }
                  >
                    <Pencil size={16} />
                  </Button>
                  <Button
                    size="small"
                    aria-label={`Mesclar ${item.name}`}
                    disabled={item.archived}
                    onClick={() => {
                      setMergeSource(item.id);
                      setMergeTarget("");
                    }}
                  >
                    <GitMerge size={16} />
                  </Button>
                  <Button
                    size="small"
                    aria-label={`${item.archived ? "Restaurar" : "Arquivar"} ${item.name}`}
                    onClick={() =>
                      run(() =>
                        setTaxonomyArchivedFn({
                          data: {
                            kind: tab,
                            id: item.id,
                            archived: !item.archived,
                          },
                        }),
                      )
                    }
                  >
                    {item.archived ? (
                      <RotateCcw size={16} />
                    ) : (
                      <Archive size={16} />
                    )}
                  </Button>
                </Stack>
              </Box>
              <Typography variant="h3">{item.name}</Typography>
              {tab === "skill" && (
                <Typography color="text.secondary">
                  {label((item as Skill).area)} · {(item as Skill).progress}% de
                  confiança
                </Typography>
              )}
              <Box className="taxonomy-stats">
                <span>{item.coverage} itens associados</span>
                <span>{item.focusedMinutes} min de foco</span>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button component="a" href={`/?${tab}=${item.id}`} size="small">
                  Projetos
                </Button>
                <Button
                  component="a"
                  href={`/tasks?${tab}=${item.id}`}
                  size="small"
                >
                  Tarefas
                </Button>
              </Stack>
            </Paper>
          ))}
          {!visible.length && (
            <Box className="empty-state">
              <Typography variant="h2">Tudo pronto para começar</Typography>
              <Typography color="text.secondary">
                Adicione sua primeira{" "}
                {tab === "skill" ? "habilidade" : "etiqueta"} ou mostre os itens
                arquivados.
              </Typography>
            </Box>
          )}
        </Box>
        <Dialog
          open={Boolean(editing)}
          onClose={() => setEditing(null)}
          fullWidth
          maxWidth="xs"
        >
          <DialogTitle>
            Renomear {editing?.kind === "skill" ? "habilidade" : "etiqueta"}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              sx={{ mt: 1 }}
              value={editing?.name ?? ""}
              onChange={(event) =>
                editing && setEditing({ ...editing, name: event.target.value })
              }
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditing(null)}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={async () => {
                if (!editing) return;
                await run(() => updateTaxonomyFn({ data: { ...editing } }));
                setEditing(null);
              }}
            >
              Salvar
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={Boolean(mergeSource)}
          onClose={() => setMergeSource(null)}
          fullWidth
          maxWidth="xs"
        >
          <DialogTitle>Mesclar com…</DialogTitle>
          <DialogContent>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              As associações e o histórico de foco serão transferidos para o
              destino. O item de origem será arquivado.
            </Typography>
            <Select
              fullWidth
              value={mergeTarget}
              onChange={(event) => setMergeTarget(event.target.value)}
            >
              <MenuItem value="" disabled>
                Escolha o destino
              </MenuItem>
              {activeTargets.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.name}
                </MenuItem>
              ))}
            </Select>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMergeSource(null)}>Cancelar</Button>
            <Button
              variant="contained"
              disabled={!mergeTarget}
              onClick={async () => {
                if (!mergeSource) return;
                await run(() =>
                  mergeTaxonomyFn({
                    data: {
                      kind: tab,
                      sourceId: mergeSource,
                      targetId: mergeTarget,
                    },
                  }),
                );
                setMergeSource(null);
              }}
            >
              Mesclar
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={associationOpen}
          onClose={() => setAssociationOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            Habilidades e etiquetas dos projetos e tarefas
          </DialogTitle>
          <DialogContent>
            <Select
              fullWidth
              value={entityKey}
              onChange={(event) => changeEntity(event.target.value)}
              sx={{ mt: 1 }}
            >
              <MenuItem disabled value="">
                Escolha um projeto ou tarefa
              </MenuItem>
              {projects.map((project) => (
                <MenuItem key={project.id} value={`project:${project.id}`}>
                  Projeto · {project.name}
                </MenuItem>
              ))}
              {tasks.map((task) => (
                <MenuItem key={task.id} value={`task:${task.id}`}>
                  Tarefa · {task.title || "Sem título"}
                </MenuItem>
              ))}
            </Select>
            <Typography className="strong-copy" sx={{ mt: 3 }}>
              Habilidades
            </Typography>
            <Stack direction="row" flexWrap="wrap">
              {skills
                .filter((skill) => !skill.archived)
                .map((skill) => (
                  <FormControlLabel
                    key={skill.id}
                    control={
                      <Checkbox
                        checked={chosenSkills.includes(skill.id)}
                        onChange={() =>
                          setChosenSkills((current) =>
                            current.includes(skill.id)
                              ? current.filter((id) => id !== skill.id)
                              : [...current, skill.id],
                          )
                        }
                      />
                    }
                    label={skill.name}
                  />
                ))}
            </Stack>
            <Typography className="strong-copy" sx={{ mt: 2 }}>
              Etiquetas
            </Typography>
            <Stack direction="row" flexWrap="wrap">
              {tagRecords
                .filter((tag) => !tag.archived)
                .map((tag) => (
                  <FormControlLabel
                    key={tag.id}
                    control={
                      <Checkbox
                        checked={chosenTags.includes(tag.id)}
                        onChange={() =>
                          setChosenTags((current) =>
                            current.includes(tag.id)
                              ? current.filter((id) => id !== tag.id)
                              : [...current, tag.id],
                          )
                        }
                      />
                    }
                    label={tag.name}
                  />
                ))}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAssociationOpen(false)}>Cancelar</Button>
            <Button
              variant="contained"
              disabled={!entityKey}
              onClick={saveAssociation}
            >
              Salvar associações
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </RayoShell>
  );
}
