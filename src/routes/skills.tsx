import {
  Avatar,
  Box,
  Button,
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
import { Blocks, Flame, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { RayoShell } from "@/components/rayo";
import { skillLevels, type SkillLevel } from "@/features/workspace/types";
import { useWorkspace } from "@/features/workspace/workspace-provider";

export const Route = createFileRoute("/skills")({
  head: () => ({
    meta: [
      { title: "Skills — Rayo Plan" },
      {
        name: "description",
        content:
          "A cozy shelf of developer skills, with levels, gentle progress, and a quick way to add what's next.",
      },
    ],
  }),
  component: SkillsPage,
});

const skillTone: Record<SkillLevel, "default" | "warning" | "success"> = {
  Learning: "default",
  Comfortable: "warning",
  Fluent: "success",
};

function SkillsPage() {
  const { skills, addSkill } = useWorkspace();
  const [filter, setFilter] = useState<SkillLevel | "All">("All");
  const [name, setName] = useState("");
  const areas = [...new Set(skills.map((skill) => skill.area))];
  const [area, setArea] = useState(areas[0] ?? "Languages");
  const [level, setLevel] = useState<SkillLevel>("Learning");
  const filtered = useMemo(
    () => skills.filter((skill) => filter === "All" || skill.level === filter),
    [skills, filter],
  );
  const fluentCount = skills.filter((skill) => skill.level === "Fluent").length;
  const weekProgress = skills.length
    ? Math.round((fluentCount / skills.length) * 100)
    : 0;
  const addNewSkill = () => {
    if (!name.trim()) return;
    addSkill({
      name: name.trim(),
      area,
      level,
      progress: level === "Learning" ? 10 : level === "Comfortable" ? 50 : 90,
      people: ["RA"],
    });
    setName("");
  };
  return (
    <RayoShell active="Skills" progress={weekProgress}>
      <Box className="content-wrap">
        <Box className="page-heading">
          <Box>
            <Typography variant="h1">Your skills</Typography>
            <Typography color="text.secondary" className="heading-subtitle">
              A gentle shelf of everything you're growing. Add the next thing
              you'd like to learn.
            </Typography>
          </Box>
        </Box>
        <Box
          component="form"
          className="quick-create"
          onSubmit={(event) => {
            event.preventDefault();
            addNewSkill();
          }}
        >
          <TextField
            size="small"
            fullWidth
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Quick add a skill — what are you learning?"
            className="quick-create-title"
          />
          <Select
            size="small"
            value={area}
            onChange={(event) => setArea(event.target.value)}
            className="quick-create-project"
          >
            {areas.map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </Select>
          <Select
            size="small"
            value={level}
            onChange={(event) => setLevel(event.target.value as SkillLevel)}
            className="quick-create-date"
            aria-label="Skill level"
          >
            {skillLevels.map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </Select>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            type="submit"
            disabled={!name.trim()}
          >
            Add skill
          </Button>
        </Box>
        <Box className="filters-row">
          <Stack direction="row" spacing={1} className="filter-scroll">
            {(["All", ...skillLevels] as const).map((item) => (
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
        </Box>
        <Box className="results-line">
          <Typography className="strong-copy">
            {filtered.length} {filtered.length === 1 ? "skill" : "skills"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {fluentCount} of {skills.length} feeling fluent
          </Typography>
        </Box>
        {filtered.length ? (
          <Box className="project-grid">
            {filtered.map((skill) => (
              <Box component="article" className="task-card" key={skill.id}>
                <Box className="card-top">
                  <Chip
                    size="small"
                    color={skillTone[skill.level]}
                    label={skill.level}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {skill.area}
                  </Typography>
                </Box>
                <Stack
                  direction="row"
                  spacing={1}
                  className="inline-center task-title-row"
                >
                  <Box className="skill-icon">
                    <Flame size={20} />
                  </Box>
                  <Typography variant="h3" className="skill-title">
                    {skill.name}
                  </Typography>
                </Stack>
                <Box className="progress-copy">
                  <Typography variant="caption" className="strong-copy">
                    Confidence
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {skill.progress}%
                  </Typography>
                </Box>
                <LinearProgress variant="determinate" value={skill.progress} />
                <Divider />
                <Box className="card-footer">
                  <Typography variant="caption" color="text.secondary">
                    Practiced by
                  </Typography>
                  <Stack direction="row">
                    {skill.people.map((person) => (
                      <Avatar key={person}>{person}</Avatar>
                    ))}
                  </Stack>
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Box className="empty-state">
            <Box className="empty-illustration">
              <Blocks size={36} />
            </Box>
            <Typography variant="h2">Nothing here — yet</Typography>
            <Typography color="text.secondary">
              No skills match this filter. Switch filters, or add the next thing
              you're curious about. 🌱
            </Typography>
          </Box>
        )}
      </Box>
    </RayoShell>
  );
}
