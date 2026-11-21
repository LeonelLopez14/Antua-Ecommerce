#!/bin/sh
# Genera secretos aleatorios fuertes para .env.prod y los MUESTRA en pantalla.
#
#   ./scripts/generate-secrets.sh
#
# No escribe ningún archivo ni deja nada en logs: copiá vos cada línea en .env.prod (con un
# editor) y cerrá la terminal o limpiala después. Correr el script de nuevo da valores nuevos.
#
# Usa `openssl rand`, que toma los bytes del generador aleatorio del sistema operativo.
#   - JWT: 48 bytes en base64 (64 caracteres).
#   - Contraseñas de base: 24 bytes en hexadecimal (48 caracteres, solo 0-9 y a-f: sin
#     caracteres que haya que escapar en un .env, en SQL ni en la shell).
set -eu

if ! command -v openssl >/dev/null 2>&1; then
  echo "Falta openssl. En Debian/Ubuntu: sudo apt install openssl" >&2
  exit 1
fi

# base64 sin saltos de línea y sin "/", "+" ni "=" (también es seguro en URLs y en la shell).
jwt=$(openssl rand -base64 48 | tr -d '\n=' | tr '/+' '_-')

cat <<EOF
# --- Copiá estas líneas en .env.prod (reemplazan los valores EJEMPLO) ---
MYSQL_ROOT_PASSWORD=$(openssl rand -hex 24)
DB_APP_PASSWORD=$(openssl rand -hex 24)
DB_MIGRATION_PASSWORD=$(openssl rand -hex 24)
DB_BACKUP_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$jwt
# --- Fin. No las guardes en otro lado sin cifrar. ---
EOF
