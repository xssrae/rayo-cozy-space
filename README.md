# Rayo Plan

A calm workspace for planning development projects and keeping momentum.

![image](/assets/image.png)

## Local development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm install
cp .env.example .env
docker compose up -d db
npm run db:migrate
npm run dev
```

On PowerShell, create the environment file with `Copy-Item .env.example .env`.
The example configuration points to the PostgreSQL container exposed on
`localhost:5432`, so `npm run db:migrate` works without a Neon account. To use
Neon instead, replace `DATABASE_URL` with its pooled connection string.

## Docker

Docker Compose provides PostgreSQL, a one-shot migration job, and the production
Node server. No host-side Node.js installation or manual migration is needed:

```sh
cp .env.example .env
docker compose up --build
```

Open <http://localhost:3000>. The application health endpoint is available at
<http://localhost:3000/api/health>. The database is persisted in the named
`postgres-data` volume.

Useful lifecycle commands:

```sh
# Run in the background
docker compose up --build -d

# Inspect services and logs
docker compose ps
docker compose logs -f app

# Stop containers while preserving database data
docker compose down
```

The values in `.env.example` are development-only. Use a unique
`BETTER_AUTH_SECRET` and managed secrets in production. If a password contains
URL-reserved characters, URL-encode it before using it in `DATABASE_URL`.

For a direct host-only workflow with an existing PostgreSQL or Neon database:

```sh
npm i
npm run db:migrate
npm run dev
```

`DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` are required in
production. Resend variables are required for delivery of verification and
password-reset emails; without them, development builds log the email preview
instead.

Database changes follow a code-first, reviewable migration flow:

```sh
npm run db:generate
npm run db:migrate
```

Deployments should apply committed migrations to the target PostgreSQL database
before promoting the application image or Vercel build.

## Quality checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Application structure

- `src/routes`: file-based route declarations and page metadata.
- `src/components`: shared visual building blocks, including the Rayo shell.
- `src/db`: Drizzle schema and the lazy PostgreSQL connection.
- `src/server`: authenticated server functions grouped by domain.
- `src/features/workspace`: domain types, query-backed workspace state, and the
  assisted legacy import.
- `src/features/projects`: project-specific page composition.

Private state is stored in PostgreSQL and scoped to the workspace resolved from
the authenticated session. The browser only reads the legacy
`rayo-plan-workspace-v2`/`v1` keys to offer a one-time, idempotent import; local
data is removed only after a successful import and explicit confirmation.
