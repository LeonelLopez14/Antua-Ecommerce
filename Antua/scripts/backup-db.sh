#!/usr/bin/env bash
# Respaldo de Antojarte: base de datos (mysqldump) e imágenes subidas (tar), comprimidos y con
# fecha en el nombre, en una carpeta FUERA del repo.
#
#   ./scripts/backup-db.sh
#
# Configuración (variables de entorno; si no están, se leen de .env.prod):
#   BACKUP_DIR              carpeta de destino (por defecto /var/backups/antojarte)
#   BACKUP_RETENTION_DAYS   días que se conservan (por defecto 14)
#   ENV_FILE                archivo de entorno (por defecto <repo>/.env.prod)
#   COMPOSE_FILE            compose de producción (por defecto <repo>/docker-compose.prod.yml)
#   COMPOSE_PROJECT_NAME    proyecto de compose (por defecto antojarte)
#   BACKUP_TAG              texto opcional para el nombre (por ejemplo "antes-de-actualizar")
#
# Qué hace:
#   1. Vuelca la base con el usuario de respaldos (solo lectura). La contraseña va por MYSQL_PWD
#      DENTRO del contenedor: no aparece en la lista de procesos del servidor.
#   2. Comprime con gzip y verifica que el archivo no esté vacío ni cortado.
#   3. Empaqueta el volumen de subidas.
#   4. Borra los respaldos más viejos que BACKUP_RETENTION_DAYS.
# Sale con error (código distinto de 0) si algo falla: así systemd o cron lo marcan como fallido.
set -euo pipefail

repo_dir=$(cd "$(dirname "$0")/.." && pwd)
env_file=${ENV_FILE:-$repo_dir/.env.prod}
compose_file=${COMPOSE_FILE:-$repo_dir/docker-compose.prod.yml}
project=${COMPOSE_PROJECT_NAME:-antojarte}

if [ ! -f "$env_file" ]; then
  echo "No encuentro $env_file (definí ENV_FILE)." >&2
  exit 1
fi

# Lee una variable de .env.prod sin ejecutar el archivo (no se hace `source`).
env_value() {
  grep -E "^$1=" "$env_file" | tail -n 1 | cut -d= -f2- || true
}

backup_dir=${BACKUP_DIR:-$(env_value BACKUP_DIR)}
backup_dir=${backup_dir:-/var/backups/antojarte}
retention=${BACKUP_RETENTION_DAYS:-$(env_value BACKUP_RETENTION_DAYS)}
retention=${retention:-14}
case "$retention" in
  '' | *[!0-9]*) echo "BACKUP_RETENTION_DAYS tiene que ser un número de días." >&2; exit 1 ;;
esac

# El repo nunca guarda respaldos: si BACKUP_DIR cae adentro, se frena.
case "$(cd "$(dirname "$backup_dir")" 2>/dev/null && pwd)/$(basename "$backup_dir")/" in
  "$repo_dir"/*) echo "BACKUP_DIR ($backup_dir) está dentro del repo: elegí una carpeta afuera." >&2; exit 1 ;;
esac

dc() {
  docker compose -p "$project" -f "$compose_file" --env-file "$env_file" "$@"
}

# Archivos nuevos solo para el dueño (600) y la carpeta solo para el dueño (700).
umask 077
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"

stamp=$(date +%Y%m%d-%H%M%S)
tag=${BACKUP_TAG:+-$BACKUP_TAG}
db_file="$backup_dir/antua_db-$stamp$tag.sql.gz"
uploads_file="$backup_dir/uploads-$stamp$tag.tar.gz"

# Si algo falla a mitad de camino, no queda un archivo a medias con nombre de respaldo bueno.
cleanup() {
  rm -f "$db_file.partial" "$uploads_file.partial"
}
trap cleanup EXIT

echo "Respaldando la base en $db_file"
# --single-transaction: copia consistente sin bloquear la tienda (InnoDB).
# --routines, --triggers, --events: también procedimientos, triggers y eventos.
# --no-tablespaces: no requiere el privilegio PROCESS.
# Las comillas simples hacen que $MYSQL_BACKUP_PASSWORD se expanda adentro del contenedor.
# shellcheck disable=SC2016
dc exec -T db sh -c 'MYSQL_PWD="$MYSQL_BACKUP_PASSWORD" exec mysqldump \
    -u"$MYSQL_BACKUP_USER" --single-transaction --routines --triggers --events \
    --no-tablespaces --set-gtid-purged=OFF --default-character-set=utf8mb4 "$MYSQL_DATABASE"' \
  | gzip -9 > "$db_file.partial"

# Verificación: gzip sano, contenido mínimo y la última línea que escribe mysqldump al terminar.
gzip -t "$db_file.partial"
if [ "$(gzip -dc "$db_file.partial" | head -c 4096 | wc -c)" -lt 1000 ]; then
  echo "El respaldo de la base está vacío o es demasiado chico." >&2
  exit 1
fi
if ! gzip -dc "$db_file.partial" | tail -n 1 | grep -q '^-- Dump completed'; then
  echo "El respaldo de la base está truncado (falta '-- Dump completed')." >&2
  exit 1
fi
tables=$(gzip -dc "$db_file.partial" | grep -c '^CREATE TABLE' || true)
mv "$db_file.partial" "$db_file"
echo "  ok: $tables tablas, $(du -h "$db_file" | cut -f1)"

echo "Respaldando las imágenes subidas en $uploads_file"
# Un contenedor temporal de la API (sin levantar nada más) lee el volumen y manda el tar a stdout.
dc run --rm --no-deps -T --entrypoint tar api -czf - -C /data uploads > "$uploads_file.partial"
tar -tzf "$uploads_file.partial" > /dev/null
files=$(tar -tzf "$uploads_file.partial" | grep -vc '/$' || true)
mv "$uploads_file.partial" "$uploads_file"
echo "  ok: $files archivos, $(du -h "$uploads_file" | cut -f1)"

echo "Borrando respaldos de más de $retention días"
find "$backup_dir" -maxdepth 1 -type f \
  \( -name 'antua_db-*.sql.gz' -o -name 'uploads-*.tar.gz' \) \
  -mtime +"$retention" -print -delete

echo "Respaldo terminado."
