# Se construye desde la raíz del monorepo (ver docker-compose.yml).
FROM node:24-alpine
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY antua-api/package.json antua-api/
COPY antua-web/package.json antua-web/
RUN pnpm install --frozen-lockfile --filter antua-api

COPY antua-api antua-api
RUN pnpm --filter antua-api run build

WORKDIR /app/antua-api
EXPOSE 3000
# Las migraciones se aplican solas al arrancar (migrationsRun).
CMD ["node", "dist/main"]
