# syntax=docker/dockerfile:1

FROM oven/bun:1-slim AS build
WORKDIR /usr/src/app

ARG APP_RELEASE_ID
ARG APP_BUILD_TIMESTAMP

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile && bun add --no-save @libsql/client

COPY . .
RUN rm -rf .output .nitro .tanstack dist .vite

ENV NODE_ENV=production
ENV APP_RELEASE_ID=${APP_RELEASE_ID}
ENV APP_BUILD_TIMESTAMP=${APP_BUILD_TIMESTAMP}
RUN bun run build

FROM oven/bun:1-slim AS release
WORKDIR /usr/src/app

ARG APP_RELEASE_ID
ARG APP_BUILD_TIMESTAMP

LABEL org.opencontainers.image.revision="${APP_RELEASE_ID}"
LABEL io.zentro.release-id="${APP_RELEASE_ID}"
LABEL io.zentro.build-timestamp="${APP_BUILD_TIMESTAMP}"

COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/package.json ./package.json
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/drizzle /usr/src/app/drizzle
COPY --from=build /usr/src/app/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /usr/src/app/server.ts ./server.ts

ENV NODE_ENV=production
ENV PORT=3000

USER bun
EXPOSE 3000/tcp

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
	CMD bun -e "fetch('http://127.0.0.1:3000/robots.txt').then((res) => { if (!res.ok) process.exit(1) }).catch(() => process.exit(1))"

ENTRYPOINT ["sh", "-c", "bun run db:migrate && bun ./server.ts"]
