import { createFileRoute } from "@tanstack/react-router";
import { ProjectsPage } from "@/features/projects/projects-page";
import { requireSignedIn } from "@/lib/route-auth";

export const Route = createFileRoute("/")({
  beforeLoad: ({ location }) => requireSignedIn(location.href),
  validateSearch: (search: Record<string, unknown>) => ({
    skill: typeof search["skill"] === "string" ? search["skill"] : undefined,
    tag: typeof search["tag"] === "string" ? search["tag"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Projetos — Rayo Plan" },
      {
        name: "description",
        content:
          "Um espaço tranquilo para planejar projetos e acompanhar seu progresso.",
      },
      { property: "og:title", content: "Projetos — Rayo Plan" },
      {
        property: "og:description",
        content:
          "Um espaço tranquilo para planejar projetos e acompanhar seu progresso.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProjectsPage,
});
