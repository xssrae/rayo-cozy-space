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
      { title: "Projects — Rayo Plan" },
      {
        name: "description",
        content:
          "A calm workspace for planning development projects and keeping momentum.",
      },
      { property: "og:title", content: "Projects — Rayo Plan" },
      {
        property: "og:description",
        content:
          "A calm workspace for planning development projects and keeping momentum.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProjectsPage,
});
