# Agents

## Cursor Cloud specific instructions

### Overview

Zentro Reborn is a POS (Point-of-Sale) and business management SPA built with TanStack Start (React 19 + Vite + Nitro). It uses Bun as runtime and package manager, Turso/LibSQL as database (via Drizzle ORM), Better Auth for authentication, and Biome for linting/formatting.

### Running services

- **Local LibSQL database**: Start with `turso dev --port 8080` (background). The Turso CLI is installed at `~/.turso/turso`.
- **Dev server**: `bun run dev` starts Vite on port 3000. Requires `.env.local` with `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, and `BETTER_AUTH_SECRET`.
- **Database migrations**: Run `DATABASE_URL=http://127.0.0.1:8080 DATABASE_AUTH_TOKEN=local-dev-token bun run db:migrate` after starting the local DB server.

### Environment variables

Create `.env.local` in the project root with:
```
DATABASE_URL=http://127.0.0.1:8080
DATABASE_AUTH_TOKEN=local-dev-token
BETTER_AUTH_SECRET=dev-secret-key-for-local-development-only-change-in-prod
```

### Key commands

See `package.json` scripts. Summary:
- **Dev**: `bun run dev`
- **Lint**: `bun run check` (Biome lint + format check)
- **Test**: `bun test` (uses local SQLite via `bun:sqlite`, no external DB needed)
- **Build**: `bun run build`

### Non-obvious notes

- Tests use `bun:sqlite` (in-memory/file-based), not the Turso server. They create temporary `.db` files in the project root and clean up after themselves. No `DATABASE_URL` env var is needed for tests.
- The Turso local dev server (`turso dev`) uses an ephemeral database by default. Data is lost on restart. Use `--db-file path/to/file.db` to persist across restarts.
- Bun must be on `$PATH` — it installs to `~/.bun/bin/bun`. The Turso CLI installs to `~/.turso/turso`.
- The app UI is in Spanish.
- The first user created becomes admin. After signup, you must create an organization before accessing the dashboard/POS.
