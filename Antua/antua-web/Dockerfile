# Se construye desde la raíz del monorepo. Corre el servidor de desarrollo de Vite,
# que hace de proxy hacia la API (la API no necesita CORS en este modo).
FROM node:24-alpine
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY antua-api/package.json antua-api/
COPY antua-web/package.json antua-web/
RUN pnpm install --frozen-lockfile --filter antua-web

COPY antua-web antua-web

WORKDIR /app/antua-web
EXPOSE 5173
CMD ["pnpm", "dev", "--host", "0.0.0.0"]
