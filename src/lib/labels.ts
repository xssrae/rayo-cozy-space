/** Display labels only; stored values remain compatible with existing workspaces. */
const labels: Record<string, string> = {
  Overview: "Visão geral", Projects: "Projetos", Tasks: "Tarefas", Focus: "Foco", Skills: "Habilidades", Reports: "Relatórios",
  All: "Todos", "All tags": "Todas as etiquetas", "To do": "A fazer", Doing: "Em andamento", Done: "Concluído",
  "In progress": "Em andamento", Completed: "Concluído", Paused: "Pausado", Planning: "Planejamento",
  Learning: "Aprendendo", Comfortable: "Intermediário", Fluent: "Avançado", Languages: "Linguagens",
};
export function label(value: string) { return labels[value] ?? value; }
