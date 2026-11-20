# syntax=docker/dockerfile:1
#
# Imagen de producción de la API (NestJS). Se construye desde la raíz del monorepo:
#   docker build -f antua-api/Dockerfile -t antojarte-api .
# (docker-compose.yml y docker-compose.prod.yml ya lo hacen así).
#
# Multi-etapa: cada FROM es una etapa. Las primeras tienen todo lo necesario para compilar
# (pnpm, devDependencies, código fuente); la última copia SOLO lo que hace falta para correr.
# Así la imagen final es chica y no lleva el compilador, los tests ni el código TypeScript.
#
# Versiones fijadas (nada de `latest`): una imagen base que cambia sola puede romper el build
# o meter cambios sin que nadie los revise. Para actualizarlas, ver docs/despliegue.md
# ("Actualizar las imágenes base"); Dependabot propone los cambios cada semana.
ARG PNPM_VERSION=10.34.9

# ---------- 1. Base: Node + pnpm ----------
FROM node:24.22.3-alpine3.23 AS base
ARG PNPM_VERSION
ENV CI=true
RUN npm install -g "pnpm@${PNPM_VERSION}" --no-fund --no-audit
WORKDIR /app

# ---------- 2. Dependencias completas (para compilar) ----------
# Primero solo los manifiestos: si el código cambia pero las dependencias no, Docker reutiliza
# esta capa y no vuelve a instalar todo.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY antua-api/package.json antua-api/
COPY antua-web/package.json antua-web/
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter antua-api

# ---------- 3. Compilación ----------
FROM deps AS build
COPY antua-api antua-api
# dist/: la API. dist-tools/: los scripts de operación (admin:create, seed, nutrición) en JS,
# porque la imagen final no tiene ts-node.
RUN pnpm --filter antua-api run build \
 && pnpm --filter antua-api run build:tools

# ---------- 4. Solo dependencias de producción ----------
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY antua-api/package.json antua-api/
COPY antua-web/package.json antua-web/
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter antua-api

# ---------- 5. Imagen final ----------
# Parte de Node limpio: sin pnpm, sin devDependencies y sin el código fuente.
FROM node:24.22.3-alpine3.23 AS runtime
ENV NODE_ENV=production \
    UPLOADS_DIR=/data/uploads
WORKDIR /app

# El código queda de root y solo lectura para el usuario que corre la API: si alguien lograra
# ejecutar algo adentro, no podría modificar la aplicación.
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/antua-api/node_modules ./antua-api/node_modules
COPY --from=build /app/antua-api/dist ./antua-api/dist
COPY --from=build /app/antua-api/dist-tools ./antua-api/dist-tools
COPY antua-api/scripts/seed-data.json ./antua-api/dist-tools/scripts/seed-data.json
COPY antua-api/package.json ./antua-api/package.json

# Carpeta de las imágenes subidas: la única en la que la API escribe (es un volumen en compose).
# npm y corepack no hacen falta para correr la API: se borran para achicar la superficie de ataque.
RUN mkdir -p /data/uploads && chown node:node /data/uploads \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

# Usuario sin privilegios que ya trae la imagen oficial de Node (uid 1000). Nunca root.
USER node
WORKDIR /app/antua-api
EXPOSE 3000

# Docker marca el contenedor como "healthy" solo si /health responde 200 (API y base arriba).
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

# Las migraciones NO se aplican al arrancar: se corren a mano (servicio `migrate` de
# docker-compose.prod.yml), después de leerlas.
CMD ["node", "dist/main"]
