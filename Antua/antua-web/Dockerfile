# syntax=docker/dockerfile:1
#
# Imagen de producción del front + proxy. Se construye desde la raíz del monorepo:
#   docker build -f antua-web/Dockerfile -t antojarte-proxy .
#
# Etapa 1 (Node): compila la tienda con Vite → archivos estáticos (HTML, JS, CSS, fuentes).
# Etapa 2 (Caddy): sirve esos archivos, reenvía /api a la API y gestiona HTTPS.
# La imagen final no tiene Node, ni node_modules, ni el código fuente: solo Caddy y el build.
#
# Para desarrollo (servidor de Vite con recarga) está Dockerfile.dev.
#
# Versiones fijadas; para actualizarlas, ver docs/despliegue.md ("Actualizar las imágenes base").
ARG PNPM_VERSION=10.34.9

# ---------- 1. Build del front ----------
FROM node:24.22.3-alpine3.23 AS build
ARG PNPM_VERSION
ENV CI=true
RUN npm install -g "pnpm@${PNPM_VERSION}" --no-fund --no-audit
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY antua-api/package.json antua-api/
COPY antua-web/package.json antua-web/
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter antua-web

COPY antua-web antua-web

# URL de la API vista desde el navegador. Queda fija en el JavaScript al compilar (Vite reemplaza
# import.meta.env.VITE_API_URL). Por defecto `/api`: el mismo dominio que el front, y Caddy la
# reenvía a la API. Así no hace falta CORS. Para otra URL: --build-arg VITE_API_URL=https://…
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm --filter antua-web run build

# ---------- 2. Caddy con el front ----------
FROM caddy:2.11.9-alpine AS runtime
COPY deploy/caddy/Caddyfile /etc/caddy/Caddyfile
COPY deploy/caddy/modes /etc/caddy/modes
COPY --from=build /app/antua-web/dist /srv

# Valida el Caddyfile al construir (con los valores por defecto): un error de sintaxis rompe el
# build en vez de romper el servidor.
RUN caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile

# Caddy guarda certificados y su CA en /data (volumen caddy_data) y su configuración en /config.
# El healthcheck de Docker consulta el chequeo interno de salud (no se publica).
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:2080/healthz"]

# La imagen oficial ya arranca con: caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
