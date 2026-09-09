import { createFileRoute } from "@tanstack/react-router";
import { ProjectsPage } from "@/features/projects/projects-page";

export const Route = createFileRoute("/")({
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
