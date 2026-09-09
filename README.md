# Rayo Plan

A calm workspace for planning development projects and keeping momentum.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Application structure

- `src/routes`: file-based route declarations and page metadata.
- `src/components`: shared visual building blocks, including the Rayo shell.
- `src/features/workspace`: domain types, initial data, derived selectors, and the
  persisted workspace provider.
- `src/features/projects`: project-specific page composition.

The workspace is persisted in the browser under `rayo-plan-workspace-v1`. The
provider is the single source of truth for projects, tasks, skills, and tags,
so changes made on one page are reflected throughout the workspace.
