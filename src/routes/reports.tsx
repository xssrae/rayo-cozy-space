import { Box, Button, Chip, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Printer, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { RayoShell } from "@/components/rayo";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { requireSignedIn } from "@/lib/route-auth";
import { getReportFn } from "@/server/report.functions";

export const Route = createFileRoute("/reports")({ beforeLoad: ({ location }) => requireSignedIn(location.href), component: ReportsPage });
function dateKey(date: Date) { return date.toISOString().slice(0, 10); }
function ReportsPage() {
  const { skills } = useWorkspace(); const [granularity, setGranularity] = useState<"week" | "month">("week");
  const range = useMemo(() => { const to = new Date(); const from = new Date(); from.setDate(to.getDate() - (granularity === "week" ? 6 : 29)); return { from: dateKey(from), to: dateKey(to), granularity }; }, [granularity]);
  const report = useQuery({ queryKey: ["report", range], queryFn: () => getReportFn({ data: range }) });
  const data = report.data; const maxDaily = Math.max(1, ...(data?.daily.map((item) => item.minutes) ?? [1]));
  const csvUrl = `/api/reports/export?from=${range.from}&to=${range.to}&granularity=${range.granularity}`;
  return <RayoShell active="Reports" progress={data?.momentum ?? 0}><Box className="content-wrap reports-page">
    <Box className="page-heading"><Box><Typography variant="h1">Seu ritmo</Typography><Typography color="text.secondary" className="heading-subtitle">Entenda seu progresso e encontre um ritmo que funciona para você.</Typography></Box><Stack direction="row" spacing={1} className="report-actions"><Button variant="outlined" startIcon={<Printer />} onClick={() => window.print()}>Imprimir / PDF</Button><Button component="a" href={csvUrl} variant="contained" startIcon={<Download />}>Exportar CSV</Button></Stack></Box>
    <Stack direction="row" spacing={1} sx={{ mt: 4 }}>{(["week", "month"] as const).map((item) => <Chip key={item} label={item === "week" ? "Últimos 7 dias" : "Últimos 30 dias"} clickable color={granularity === item ? "primary" : "default"} onClick={() => setGranularity(item)} />)}</Stack>
    {report.isLoading ? <LinearProgress sx={{ mt: 4 }} /> : report.error ? <Paper className="report-empty">Não foi possível carregar os relatórios.</Paper> : data && <>
      <Box className="stat-grid"><Paper className="stat-card"><Typography variant="overline">TEMPO DE FOCO</Typography><Typography variant="h2">{Math.floor(data.totalMinutes / 60)}h {data.totalMinutes % 60}m</Typography><Typography color="text.secondary">Somente sessões concluídas</Typography></Paper><Paper className="stat-card"><Typography variant="overline">CONSTÂNCIA</Typography><Typography variant="h2">{data.momentum}</Typography><LinearProgress variant="determinate" value={data.momentum} /><Typography color="text.secondary">{data.activeDays} dias de foco nos últimos 28</Typography></Paper><Paper className="stat-card"><Typography variant="overline">DIAS ATIVOS</Typography><Typography variant="h2">{data.daily.length}</Typography><Typography color="text.secondary">Dias ativos neste período</Typography></Paper></Box>
      <Box className="report-grid"><Paper className="report-panel"><Typography variant="h2">Foco ao longo do tempo</Typography><Box className="bar-chart" aria-label="Minutos de foco por dia">{data.daily.length ? data.daily.map((item) => <Box className="bar-column" key={item.date}><Typography variant="caption">{item.minutes}m</Typography><Box className="bar" style={{ height: `${Math.max(8, (item.minutes / maxDaily) * 150)}px` }} /><Typography variant="caption">{item.date.slice(5)}</Typography></Box>) : <Typography color="text.secondary">Conclua uma sessão de foco para começar este gráfico.</Typography>}</Box></Paper>
        <Paper className="report-panel"><Typography variant="h2">Tempo por projeto</Typography><Stack spacing={2} sx={{ mt: 2 }}>{data.byProject.length ? data.byProject.map((item) => <Box key={item.id}><Box className="progress-copy"><Typography>{item.name}</Typography><Typography>{item.minutes}m</Typography></Box><LinearProgress variant="determinate" value={data.totalMinutes ? item.minutes / data.totalMinutes * 100 : 0} /></Box>) : <Typography color="text.secondary">Ainda não há tempo registrado por projeto.</Typography>}</Stack></Paper>
        <Paper className="report-panel"><Typography variant="h2">Habilidades praticadas</Typography><Stack spacing={1.2} sx={{ mt: 2 }}>{data.bySkill.map((item) => <Box className="report-list-row" key={item.id}><TrendingUp size={17} /><Typography>{item.name}</Typography><Typography sx={{ ml: "auto" }}>{item.minutes}m</Typography></Box>)}{!data.bySkill.length && <Typography color="text.secondary">Associe habilidades ao seu trabalho para visualizar esta seção.</Typography>}</Stack></Paper>
        <Paper className="report-panel"><Typography variant="h2">Habilidades para retomar</Typography><Stack direction="row" sx={{ mt: 2, gap: 1, flexWrap: "wrap" }}>{skills.filter((skill) => !skill.archived && !data.bySkill.some((item) => item.id === skill.id)).map((skill) => <Chip key={skill.id} label={skill.name} variant="outlined" />)}{!skills.length && <Typography color="text.secondary">Sua biblioteca de habilidades ainda está vazia.</Typography>}</Stack></Paper>
      </Box>
    </>}
  </Box></RayoShell>;
}
