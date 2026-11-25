#!/bin/sh
# Consulta la salud de la API para un monitor externo o un cron.
#
#   ./scripts/check-health.sh                          # https://localhost/api, listo (base incluida)
#   ./scripts/check-health.sh https://tienda.tu-dominio.com
#   ./scripts/check-health.sh https://localhost:8443 --live
#
# Opciones:
#   --live       solo "vivo" (/health/live): el proceso responde, sin mirar la base.
#                Sin la opción, "listo" (/health/ready): la API y la base responden.
# Variables:
#   CURL_OPTS    opciones extra de curl. Con el certificado interno de Caddy:
#                CURL_OPTS="--cacert caddy-root.crt"   (Windows: agregá --ssl-no-revoke)
#   TIMEOUT      segundos máximos de la consulta (por defecto 5).
#
# Código de salida (para cron, systemd o un monitor):
#   0  sano
#   1  responde, pero no está sano (503: por ejemplo, la base no contesta)
#   2  no responde (caído, DNS, certificado, timeout) o respuesta inesperada
#
# Ejemplo de cron: cada 5 minutos, y un aviso en el log del sistema si falla.
#   */5 * * * * /opt/antojarte/Antua/scripts/check-health.sh https://tienda.tu-dominio.com || logger -t antojarte "health: código $?"
set -u

base=${1:-https://localhost}
base=${base%/}
path=/api/health/ready
[ "${2:-}" = "--live" ] && path=/api/health/live
url="$base$path"
timeout=${TIMEOUT:-5}
curl_opts=${CURL_OPTS:-}

# shellcheck disable=SC2086
status=$(curl -sS -o /dev/null -w '%{http_code}' --max-time "$timeout" $curl_opts \
  -H "X-Request-Id: check-health-$(date +%Y%m%d%H%M%S)" "$url" 2>/dev/null)
code=$?

if [ "$code" -ne 0 ] || [ -z "$status" ] || [ "$status" = "000" ]; then
  echo "CAÍDA  $url no responde (curl salió con $code)"
  exit 2
fi
case "$status" in
  200) echo "OK     $url"; exit 0 ;;
  503) echo "MAL    $url responde 503: la API está viva pero no lista (¿la base?)"; exit 1 ;;
  *)   echo "RARO   $url respondió $status"; exit 2 ;;
esac
