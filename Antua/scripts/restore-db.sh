#!/usr/bin/env bash
# Restaura un respaldo hecho con scripts/backup-db.sh.
#
#   ./scripts/restore-db.sh /var/backups/antojarte/antua_db-20261120-033000.sql.gz
#   ./scripts/restore-db.sh <base.sql.gz> --uploads <uploads.tar.gz>
#
# Opciones:
#   --uploads <archivo>  también restaura las imágenes subidas (reemplaza las actuales).
#   --force              permite restaurar sobre una base que YA TIENE DATOS. Antes hace un
#                        respaldo de seguridad del estado actual (BACKUP_TAG=antes-de-restaurar).
#   --yes                no pregunta (para scripts). Sin esto, hay que escribir el nombre de la
#                        base para confirmar.
#
# ADVERTENCIA: restaurar BORRA la base actual y la reemplaza por la del respaldo. Todo lo que pasó
# después del respaldo (pedidos, usuarios, cambios del panel) se pierde.
#
# Usa las mismas variables que backup-db.sh (ENV_FILE, COMPOSE_FILE, COMPOSE_PROJECT_NAME).
set -euo pipefail

repo_dir=$(cd "$(dirname "$0")/.." && pwd)
env_file=${ENV_FILE:-$repo_dir/.env.prod}
compose_file=${COMPOSE_FILE:-$repo_dir/docker-compose.prod.yml}
project=${COMPOSE_PROJECT_NAME:-antojarte}

db_file=''
uploads_file=''
force=no
assume_yes=no
while [ $# -gt 0 ]; do
  case "$1" in
    --uploads) uploads_file=${2:?Falta el archivo después de --uploads}; shift 2 ;;
    --force) force=yes; shift ;;
    --yes) assume_yes=yes; shift ;;
    -*) echo "Opción desconocida: $1" >&2; exit 2 ;;
    *) db_file=$1; shift ;;
  esac
done
if [ -z "$db_file" ]; then
  echo "Uso: restore-db.sh <base.sql.gz> [--uploads <uploads.tar.gz>] [--force] [--yes]" >&2
  exit 2
fi

dc() {
  docker compose -p "$project" -f "$compose_file" --env-file "$env_file" "$@"
}

# Ejecuta SQL como root DENTRO del contenedor (la contraseña nunca sale de ahí).
# shellcheck disable=SC2016
root_sql() {
  dc exec -T db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -uroot -N -B "$@"' sh "$@"
}

# 1. El respaldo tiene que estar sano antes de tocar nada.
echo "Verificando $db_file"
gzip -t "$db_file"
if ! gzip -dc "$db_file" | tail -n 1 | grep -q '^-- Dump completed'; then
  echo "El respaldo está truncado (falta '-- Dump completed'): no se restaura." >&2
  exit 1
fi
if [ -n "$uploads_file" ]; then
  tar -tzf "$uploads_file" > /dev/null
fi

# 2. ¿La base actual tiene datos? (alguna tabla, salvo la de migraciones, con al menos una fila)
# shellcheck disable=SC2016
database=$(dc exec -T db sh -c 'printf %s "$MYSQL_DATABASE"')
tables=$(root_sql -e "SELECT table_name FROM information_schema.tables WHERE table_schema='$database' AND table_name <> 'migrations'")
has_data=0
if [ -n "$tables" ]; then
  probe=$(printf '%s\n' "$tables" | sed 's/.*/EXISTS(SELECT 1 FROM `&`)/' | paste -sd+ -)
  has_data=$(root_sql "$database" -e "SELECT $probe")
fi

if [ "$has_data" != 0 ]; then
  if [ "$force" != yes ]; then
    echo "La base '$database' ya tiene datos ($has_data tablas con filas). No se restaura encima." >&2
    echo "Si de verdad querés reemplazarla, repetí con --force (antes se hace un respaldo de seguridad)." >&2
    exit 1
  fi
  echo "ATENCIÓN: '$database' tiene datos y se va a REEMPLAZAR (--force)."
fi

# 3. Confirmación explícita.
if [ "$assume_yes" != yes ]; then
  echo "Se va a borrar la base '$database' y cargar $(basename "$db_file")."
  [ -n "$uploads_file" ] && echo "También se reemplazan las imágenes subidas por $(basename "$uploads_file")."
  printf "Para confirmar, escribí el nombre de la base (%s): " "$database"
  read -r answer < /dev/tty
  if [ "$answer" != "$database" ]; then
    echo "No coincide: no se hizo nada."
    exit 1
  fi
fi

# 4. Con --force, primero un respaldo del estado actual (por si la restauración era un error).
if [ "$has_data" != 0 ]; then
  echo "Respaldo de seguridad del estado actual"
  BACKUP_TAG=antes-de-restaurar "$repo_dir/scripts/backup-db.sh"
fi

# 5. La API se detiene para que nadie escriba durante la restauración.
echo "Deteniendo la API"
dc stop api > /dev/null 2>&1 || true

echo "Recreando la base '$database'"
# Los permisos de los usuarios (GRANT … ON antua_db.*) sobreviven a DROP/CREATE DATABASE.
root_sql -e "DROP DATABASE IF EXISTS \`$database\`; CREATE DATABASE \`$database\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci"

echo "Cargando el respaldo"
# shellcheck disable=SC2016
gzip -dc "$db_file" | dc exec -T db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -uroot "$MYSQL_DATABASE"'

if [ -n "$uploads_file" ]; then
  echo "Restaurando las imágenes subidas"
  dc run --rm --no-deps -T --entrypoint sh api -c 'find /data/uploads -mindepth 1 -delete && tar -xzf - -C /data' < "$uploads_file"
fi

# 6. Levanta todo de nuevo y muestra un resumen para comparar con lo esperado.
echo "Levantando los servicios"
dc up -d > /dev/null
echo "Tablas restauradas: $(root_sql -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$database'")"
echo "Filas: $(root_sql "$database" -e "SELECT CONCAT('productos=', (SELECT COUNT(*) FROM products), ' usuarios=', (SELECT COUNT(*) FROM users), ' pedidos=', (SELECT COUNT(*) FROM orders))")"
echo "Restauración terminada. Revisá el sitio y /api/health."
