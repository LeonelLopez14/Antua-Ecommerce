#!/bin/sh
# Crea los usuarios de MySQL de Antojarte, cada uno con el mínimo privilegio:
#
#   antua_app       la API. Solo lee y escribe DATOS (SELECT, INSERT, UPDATE, DELETE).
#                   No puede crear, cambiar ni borrar tablas.
#   antua_migrator  las migraciones (servicio `migrate`). Puede cambiar el ESQUEMA.
#                   Se usa solo cuando corrés las migraciones a mano.
#   antua_backup    los respaldos (scripts/backup-db.sh). Solo lectura.
#
# Cuándo corre:
#   - Solo, la PRIMERA vez que arranca el contenedor db con un volumen vacío: la imagen oficial de
#     MySQL ejecuta lo que haya en /docker-entrypoint-initdb.d/. Con una base ya creada, no corre.
#   - A mano, en una base existente (es idempotente: crea lo que falta y actualiza contraseñas y
#     permisos). Ver docs/despliegue.md, "Usuarios de base en una base existente":
#       docker compose -f docker-compose.prod.yml --env-file .env.prod exec db \
#         sh /docker-entrypoint-initdb.d/01-create-users.sh
#
# Las contraseñas vienen de variables de entorno del contenedor (definidas en .env.prod). La de
# root va por MYSQL_PWD, no como argumento: así no aparece en la lista de procesos (ps).
set -eu

: "${MYSQL_ROOT_PASSWORD:?falta MYSQL_ROOT_PASSWORD}"
: "${MYSQL_DATABASE:?falta MYSQL_DATABASE}"
: "${MYSQL_APP_USER:?falta MYSQL_APP_USER}"
: "${MYSQL_APP_PASSWORD:?falta MYSQL_APP_PASSWORD}"
: "${MYSQL_MIGRATION_USER:?falta MYSQL_MIGRATION_USER}"
: "${MYSQL_MIGRATION_PASSWORD:?falta MYSQL_MIGRATION_PASSWORD}"
: "${MYSQL_BACKUP_USER:?falta MYSQL_BACKUP_USER}"
: "${MYSQL_BACKUP_PASSWORD:?falta MYSQL_BACKUP_PASSWORD}"

# Escapa comillas simples para meter un valor dentro de '…' en SQL.
sql_quote() {
  printf "%s" "$1" | sed "s/'/''/g"
}

# Nombres: solo letras, números y guion bajo (van sin comillas en GRANT … ON `db`.*).
for name in "$MYSQL_DATABASE" "$MYSQL_APP_USER" "$MYSQL_MIGRATION_USER" "$MYSQL_BACKUP_USER"; do
  case "$name" in
    *[!A-Za-z0-9_]* | '') echo "Nombre inválido: '$name' (solo letras, números y _)" >&2; exit 1 ;;
  esac
done

app_pw=$(sql_quote "$MYSQL_APP_PASSWORD")
migration_pw=$(sql_quote "$MYSQL_MIGRATION_PASSWORD")
backup_pw=$(sql_quote "$MYSQL_BACKUP_PASSWORD")
db="$MYSQL_DATABASE"

# '%' = desde cualquier IP. Es seguro porque la base NO publica puertos: solo la ven los
# contenedores de la red interna `backend` (la API, migrate y los respaldos).
MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql --protocol=socket -uroot <<SQL
CREATE DATABASE IF NOT EXISTS \`$db\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE USER IF NOT EXISTS '$MYSQL_APP_USER'@'%' IDENTIFIED BY '$app_pw';
ALTER USER '$MYSQL_APP_USER'@'%' IDENTIFIED BY '$app_pw';
REVOKE ALL PRIVILEGES, GRANT OPTION FROM '$MYSQL_APP_USER'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON \`$db\`.* TO '$MYSQL_APP_USER'@'%';

CREATE USER IF NOT EXISTS '$MYSQL_MIGRATION_USER'@'%' IDENTIFIED BY '$migration_pw';
ALTER USER '$MYSQL_MIGRATION_USER'@'%' IDENTIFIED BY '$migration_pw';
REVOKE ALL PRIVILEGES, GRANT OPTION FROM '$MYSQL_MIGRATION_USER'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES,
      CREATE VIEW, SHOW VIEW, TRIGGER, LOCK TABLES ON \`$db\`.* TO '$MYSQL_MIGRATION_USER'@'%';

CREATE USER IF NOT EXISTS '$MYSQL_BACKUP_USER'@'%' IDENTIFIED BY '$backup_pw';
ALTER USER '$MYSQL_BACKUP_USER'@'%' IDENTIFIED BY '$backup_pw';
REVOKE ALL PRIVILEGES, GRANT OPTION FROM '$MYSQL_BACKUP_USER'@'%';
GRANT SELECT, SHOW VIEW, TRIGGER, LOCK TABLES, EVENT ON \`$db\`.* TO '$MYSQL_BACKUP_USER'@'%';
-- mysqldump --routines necesita ver las rutinas almacenadas (privilegio global de solo lectura).
GRANT SHOW_ROUTINE ON *.* TO '$MYSQL_BACKUP_USER'@'%';

FLUSH PRIVILEGES;
SQL

echo "Usuarios de base listos: $MYSQL_APP_USER (datos), $MYSQL_MIGRATION_USER (esquema), $MYSQL_BACKUP_USER (respaldos)."
