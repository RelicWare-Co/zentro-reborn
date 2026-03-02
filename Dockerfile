# syntax=docker/dockerfile:1

FROM oven/bun:1-slim AS build
WORKDIR /usr/src/app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile && bun add --no-save @libsql/client

COPY . .
RUN rm -rf .output .nitro .tanstack dist .vite

ENV NODE_ENV=production
RUN bun run build

FROM oven/bun:1-slim AS release
WORKDIR /usr/src/app

COPY --from=build /usr/src/app/.output ./.output
COPY --from=build /usr/src/app/package.json ./package.json
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/drizzle /usr/src/app/drizzle
COPY --from=build /usr/src/app/drizzle.config.ts ./drizzle.config.ts

ENV NODE_ENV=production
ENV DATABASE_URL=/tmp/app.db
ENV PORT=3000
ENV BETTER_AUTH_SECRET=supersecret
ENV BETTER_AUTH_URL=https://zentro-bun-health.orb.local

USER bun
EXPOSE 3000/tcp

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
	CMD bun -e "fetch('http://127.0.0.1:3000/robots.txt').then((res) => { if (!res.ok) process.exit(1) }).catch(() => process.exit(1))"

ENTRYPOINT ["sh", "-c", "bun run db:migrate && exec bun .output/server/index.mjs"]
