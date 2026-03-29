# Agent Instructions

This is a TanStack Start application with React, using Bun as the package manager.

## Stack
- **Framework**: TanStack Start (full-stack React framework)
- **Router**: TanStack Router (file-based routing)
- **Database**: Drizzle ORM with LibSQL (Turso)
- **Data Sync**: TanStack DB for client-side state and sync
- **UI**: React 19, Tailwind CSS v4, Radix UI, Base UI
- **Auth**: Better Auth
- **Forms**: TanStack Form
- **Tables**: TanStack Table
- **Charts**: Recharts

## Conventions
- Use TypeScript with strict types
- File-based routing in `src/routes/`
- Feature-based organization in `src/features/`
- Use path aliases: `#/*` maps to `./src/*`
- Database schema files in `src/db/`
- Server functions use `.server.ts` suffix

## Scripts
- `bun dev` - Start development server
- `bun build` - Production build
- `bun run db:generate` - Generate Drizzle migrations
- `bun run db:migrate` - Run migrations
- `bun run db:studio` - Open Drizzle Studio

<!-- intent-skills:start -->
# Skill mappings - when working in these areas, load the linked skill file into context.
skills:
  - task: "Working with TanStack React DB hooks (useLiveQuery, useLiveSuspenseQuery, useLiveInfiniteQuery)"
    load: "node_modules/@tanstack/react-db/skills/react-db/SKILL.md"
  - task: "Setting up TanStack DB collections, queries, mutations, and sync"
    load: "node_modules/@tanstack/db/skills/db-core/SKILL.md"
  - task: "Creating typed collections with adapters (REST, Electric, PowerSync)"
    load: "node_modules/@tanstack/db/skills/db-core/collection-setup/SKILL.md"
  - task: "Building custom TanStack DB adapters and sync backends"
    load: "node_modules/@tanstack/db/skills/db-core/custom-adapter/SKILL.md"
  - task: "Building live queries with the query builder API"
    load: "node_modules/@tanstack/db/skills/db-core/live-queries/SKILL.md"
  - task: "Implementing optimistic mutations and transactions"
    load: "node_modules/@tanstack/db/skills/db-core/mutations-optimistic/SKILL.md"
  - task: "Persisting TanStack DB collections locally for offline or cached sync"
    load: "node_modules/@tanstack/db/skills/db-core/persistence/SKILL.md"
  - task: "Using TanStack DB in TanStack Start loaders with SSR disabled"
    load: "node_modules/@tanstack/db/skills/meta-framework/SKILL.md"
  - task: "TanStack Router configuration, routing, and navigation"
    load: "node_modules/@tanstack/router-core/skills/router-core/SKILL.md"
  - task: "Route data loading, loaders, and caching"
    load: "node_modules/@tanstack/router-core/skills/router-core/data-loading/SKILL.md"
  - task: "TanStack Start server functions (createServerFn) and request helpers"
    load: "node_modules/@tanstack/start-client-core/skills/start-core/server-functions/SKILL.md"
  - task: "TanStack Start route-level API handlers"
    load: "node_modules/@tanstack/start-client-core/skills/start-core/server-routes/SKILL.md"
  - task: "TanStack Start middleware"
    load: "node_modules/@tanstack/start-client-core/skills/start-core/middleware/SKILL.md"
  - task: "TanStack Start client and server execution boundaries"
    load: "node_modules/@tanstack/start-client-core/skills/start-core/execution-model/SKILL.md"
  - task: "Route protection, auth guards, and redirects"
    load: "node_modules/@tanstack/router-core/skills/router-core/auth-and-guards/SKILL.md"
<!-- intent-skills:end -->
